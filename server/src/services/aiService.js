import { GoogleGenAI } from '@google/genai';
import { HttpError } from '../utils/httpError.js';

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

// Turns an AI-provider error into a friendly error for our own API
const toHttpError = (err) => {
  console.error('AI error:', err.status, err.message); // full details stay in the server log
  // 429 = our free quota is used up, 503 = Google's servers are overloaded
  if (err.status === 429 || err.status === 503) {
    return new HttpError(err.status, 'The AI is busy right now. Wait a minute and try again.');
  }
  return new HttpError(502, 'The AI service failed. Please try again.');
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sends a prompt to the AI and returns its text answer.
 *  - system: the AI's role and rules
 *  - prompt: what the user said
 *  - json: true makes the AI answer in valid JSON only
 */
export const generateText = async ({ system, prompt, json = false, temperature = 0.4 }) => {
  const ai = getClient();
  const request = {
    model: process.env.GEMINI_MODEL,
    contents: prompt,
    config: {
      systemInstruction: system,
      temperature, // lower = more consistent, higher = more creative
      ...(json && { responseMimeType: 'application/json' }),
    },
  };

  try {
    try {
      return (await ai.models.generateContent(request)).text;
    } catch (err) {
      // "High demand" (503) is usually over in a second or two, so try once more.
      // Never retry a 429: that would only burn more of the free quota.
      if (err.status !== 503) throw err;
      console.warn('AI overloaded (503), retrying once...');
      await wait(2000);
      return (await ai.models.generateContent(request)).text;
    }
  } catch (err) {
    throw toHttpError(err);
  }
};

// Same as above, but returns a JavaScript object parsed from the AI's JSON
export const generateJson = async (options) => {
  const text = await generateText({ ...options, json: true });
  try {
    return JSON.parse(text);
  } catch {
    console.error('AI returned invalid JSON:', text);
    throw new HttpError(502, 'The AI sent an unreadable answer. Please try again.');
  }
};