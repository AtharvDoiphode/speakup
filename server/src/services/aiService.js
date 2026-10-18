import { GoogleGenAI } from '@google/genai';
import { HttpError } from '../utils/httpError.js';

const ATTEMPT_TIMEOUT_MS = 20_000; // longest we wait for one answer
const TOTAL_BUDGET_MS = 45_000; // longest one request may take, whatever is left in the chain
const RETRY_PAUSE_MS = 2_000; // pause before the single 503 retry on the last model
const COOLDOWN_MS = 5 * 60_000; // how long a failing model is skipped
const BUSY_MESSAGE = 'The AI is busy right now. Try again in a minute.';

let client; // created on first use, so a missing key doesn't crash the server at startup

const getClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new HttpError(500, 'GEMINI_API_KEY is missing in server/.env');
  }
  if (!process.env.GEMINI_MODEL) {
    throw new HttpError(500, 'GEMINI_MODEL is missing in server/.env');
  }
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
};

// The models to try, in order: GEMINI_MODEL first, then the optional
// GEMINI_FALLBACK_MODELS (comma-separated). Read on every call, so a change
// in .env takes effect as soon as the server restarts.
const getModelChain = () => {
  const fallbacks = (process.env.GEMINI_FALLBACK_MODELS ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
  return [...new Set([process.env.GEMINI_MODEL.trim(), ...fallbacks])];
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class AiTimeout extends Error {}

// A short label for the log: "503", "429", "timeout"...
const reasonOf = (err) => (err instanceof AiTimeout ? 'timeout' : String(err?.status ?? 'error'));

// Is it worth trying another model?
//  - timeout / 503: this model is overloaded right now
//  - 429: this model's free quota is used up (quotas are per model)
//  - 404: this model name no longer exists (Google retires models)
//  - 500, 502, 504: a failure on Google's side
// Anything else (a bad API key, a bad request) would fail on every model.
const shouldTryNextModel = (err) =>
  err instanceof AiTimeout || [404, 429, 500, 502, 503, 504].includes(err?.status);

// ---------- cooldown ----------
// A model that just timed out, was overloaded (503), ran out of quota (429) or
// doesn't exist (404) is skipped for 5 minutes. So a dead model costs one slow
// request, not 20 seconds on every request. Kept in memory: a restart clears it.
const cooldownUntil = new Map(); // model name -> time (ms) when it may be tried again

const shouldCoolDown = (err) => err instanceof AiTimeout || [404, 429, 503].includes(err?.status);
const isCoolingDown = (model) => (cooldownUntil.get(model) ?? 0) > Date.now();
const startCooldown = (model) => {
  cooldownUntil.set(model, Date.now() + COOLDOWN_MS);
  console.warn(`AI cooldown: ${model} for ${COOLDOWN_MS / 60_000}m`);
};

// One attempt on one model, cut off after timeoutMs
const callModel = async (ai, model, request, timeoutMs) => {
  const controller = new AbortController();
  let timer;
  // The race guarantees we stop waiting on time, even if the abort is slow to take effect
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new AiTimeout(`no answer from ${model} in ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);
  });

  try {
    const call = ai.models.generateContent({
      ...request,
      model,
      config: { ...request.config, abortSignal: controller.signal },
    });
    call.catch(() => {}); // if the timeout wins, the late rejection must not crash the server
    const response = await Promise.race([call, timeout]);
    return response.text;
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Sends a prompt to the AI and returns its text answer.
 *  - system: the AI's role and rules
 *  - prompt: what the user said
 *  - json: true makes the AI answer in valid JSON only
 *
 *  - attemptTimeoutMs / totalBudgetMs: how long to wait for one model, and in total.
 *    Chat turns use the defaults (20s / 45s); long answers such as an essay review pass more.
 *  - maxOutputTokens: allow a longer answer (for example a full rewrite of an essay)
 *
 * Tries each model in the chain until one answers. If none does within the total
 * budget, throws a friendly 503. Callers save to the database only after this
 * returns, so a failure never leaves anything half-saved behind.
 */
export const generateText = async ({
  system,
  prompt,
  json = false,
  temperature = 0.4,
  attemptTimeoutMs = ATTEMPT_TIMEOUT_MS,
  totalBudgetMs = TOTAL_BUDGET_MS,
  maxOutputTokens,
}) => {
  const ai = getClient();
  const chain = getModelChain();
  // Skip models that failed in the last 5 minutes. If that leaves nothing
  // (for example Google was briefly overloaded on every model at once), don't
  // fail instantly: try the whole chain again, primary first.
  const ready = chain.filter((model) => !isCoolingDown(model));
  const models = ready.length > 0 ? ready : chain;
  if (ready.length === 0) console.warn(`AI cooldown: every model is cooling down, trying ${chain[0]} anyway`);

  const request = {
    contents: prompt,
    config: {
      systemInstruction: system,
      temperature, // lower = more consistent, higher = more creative
      ...(json && { responseMimeType: 'application/json' }),
      ...(maxOutputTokens && { maxOutputTokens }),
    },
  };

  const deadline = Date.now() + totalBudgetMs;
  const timeLeft = () => deadline - Date.now();
  const attempt = async (model) => {
    const text = await callModel(ai, model, request, Math.min(attemptTimeoutMs, timeLeft()));
    cooldownUntil.delete(model); // it answered, so it's healthy again
    return text;
  };

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const isLast = i === models.length - 1;
    if (timeLeft() <= 0) {
      console.error(`AI failed: ${Math.round(totalBudgetMs / 1000)}s time limit reached before trying ${model}`);
      break;
    }

    try {
      return await attempt(model);
    } catch (err) {
      let failure = err;

      // "High demand" is often over in a second or two. With no other model left
      // to move to, try this one once more. (Never a 429: that only burns quota.)
      if (isLast && failure.status === 503 && timeLeft() > RETRY_PAUSE_MS) {
        console.warn(`AI retry: ${model} (503)`);
        await wait(RETRY_PAUSE_MS);
        try {
          return await attempt(model);
        } catch (retryErr) {
          failure = retryErr;
        }
      }

      if (!shouldTryNextModel(failure)) {
        // Only the status and Google's own message: never the prompt or the learner's text
        console.error(`AI error: ${model} (${reasonOf(failure)})`, String(failure?.message ?? '').slice(0, 200));
        throw new HttpError(502, 'The AI service failed. Please try again.');
      }

      if (shouldCoolDown(failure)) startCooldown(model);

      if (isLast) {
        console.error(`AI failed: ${model} (${reasonOf(failure)}), no models left`);
      } else {
        console.warn(`AI fallback: ${model} → ${models[i + 1]} (${reasonOf(failure)})`);
      }
    }
  }

  throw new HttpError(503, BUSY_MESSAGE);
};

// Same as above, but returns a JavaScript object parsed from the AI's JSON
export const generateJson = async (options) => {
  const text = await generateText({ ...options, json: true });
  try {
    return JSON.parse(text);
  } catch {
    // The answer can quote the learner, so log only its size, not its content
    console.error(`AI returned invalid JSON (${text?.length ?? 0} characters)`);
    throw new HttpError(502, 'The AI sent an unreadable answer. Please try again.');
  }
};
