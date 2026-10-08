import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { httpError } from '../utils/httpError.js';
import { parse } from '../utils/validate.js';
import { generateJson } from '../services/aiService.js';
import { buildCorrectionPrompt, MISTAKE_TYPES } from '../prompts/correctionPrompt.js';

// What the client is allowed to send
const bodySchema = z.object({
  text: z
    .string({ error: 'Send the text to correct' })
    .trim()
    .min(1, 'Say or write something first')
    .max(1000, 'Keep it under 1000 characters'),
});

// What we expect back from the AI. .catch() and .default() keep small
// AI slips (an unknown "type", a missing field) from breaking the response.
const aiResultSchema = z.object({
  corrected: z.string(),
  mistakes: z
    .array(
      z.object({
        wrong: z.string(),
        right: z.string(),
        rule: z.string(),
        type: z.enum(MISTAKE_TYPES).catch('other'),
      })
    )
    .default([]),
  natural: z.string().default(''),
});

// "Pune." and "pune" are the same words: lowercase, letters/numbers/spaces only
const bareWords = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();

// Safety net: drop "mistakes" that only change capitals or punctuation,
// in case the AI reports them anyway (speech-to-text has neither)
const isRealMistake = (m) => bareWords(m.wrong) !== bareWords(m.right);

// POST /api/ai/correct
export const correctText = asyncHandler(async (req, res) => {
  const { text } = parse(bodySchema, req.body);

  const raw = await generateJson({
    system: buildCorrectionPrompt(req.user.level),
    // The tags tell the AI where the learner's text starts and ends
    prompt: `<learner_text>\n${text}\n</learner_text>`,
    temperature: 0.2, // low = consistent corrections
  });

  const checked = aiResultSchema.safeParse(raw);
  if (!checked.success) {
    console.error('Unexpected AI shape:', raw);
    throw httpError(502, 'The AI sent an unexpected answer. Please try again.');
  }

  const { corrected, natural } = checked.data;
  const mistakes = checked.data.mistakes.filter(isRealMistake);
  res.json({
    original: text,
    corrected,
    mistakes,
    natural,
    isCorrect: mistakes.length === 0,
  });
});