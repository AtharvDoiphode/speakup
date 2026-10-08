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
  if (err.status === 429) {
    return new HttpError(429, 'The AI is busy right now. Wait a minute and try again.');
  }
  return new HttpError(502, 'The AI service failed. Please try again.');
};

/**
 * Sends a prompt to the AI and returns its text answer.
 *  - system: the AI's role and rules
 *  - prompt: what the user said
 *  - json: true makes the AI answer in valid JSON only
 */
export const generateText = async ({ system, prompt, json = false, temperature = 0.4 }) => {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: system,
        temperature, // lower = more consistent, higher = more creative
        ...(json && { responseMimeType: 'application/json' }),
      },
    });
    return response.text;
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