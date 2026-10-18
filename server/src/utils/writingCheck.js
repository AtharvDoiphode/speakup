import { z } from 'zod';
import { MISTAKE_TYPES } from '../prompts/correctionPrompt.js';

// Server-side checks on the AI's essay review: don't trust it blindly.
// Note: this deliberately does NOT use utils/mistakes.js. That filter drops
// capital-only and punctuation-only fixes, which is right for speech but wrong
// for writing, where capitals and punctuation are real mistakes.

const str = z.string().catch('').transform((s) => s.trim());
const list = z.array(z.unknown()).catch([])
  .transform((items) => items.filter((x) => typeof x === 'string').map((x) => x.trim()).filter(Boolean).slice(0, 3));

// The shape we accept from the AI. .catch() turns small slips into safe defaults;
// only a missing rewrite or score counts as an unusable answer.
const reviewSchema = z.object({
  mistakes: z.array(z.object({
    wrong: z.string().transform((s) => s.trim()),
    right: z.string().catch('').transform((s) => s.trim()),
    rule: str,
    type: z.enum(MISTAKE_TYPES).catch('other'), // an unknown type becomes 'other'
  })).catch([]),
  score: z.coerce.number(),
  summary: str,
  feedback: z.object({ structure: str, tone: str, vocabulary: str }).catch({ structure: '', tone: '', vocabulary: '' }),
  strengths: list,
  improvements: list,
  rewritten: z.string().transform((s) => s.trim()).pipe(z.string().min(1)),
});

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Every place a phrase appears as whole words (so "came" never matches inside "became")
const occurrences = (text, phrase, flags) => {
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(phrase)}(?![\\p{L}\\p{N}])`, `gu${flags}`);
  return [...text.matchAll(re)].map((m) => m.index);
};

// Keep only mistakes whose "wrong" really is in the text, and put them in text order.
// Exact spelling and capitals first, then ignoring capitals. When the same words are
// wrong twice ("i ... i"), each mistake gets its own occurrence.
export function placeMistakes(text, mistakes) {
  const used = new Set();
  const placed = [];
  for (const m of mistakes) {
    if (!m.wrong || m.wrong === m.right) continue; // not a change at all
    const free = (positions) => positions.find((p) => !used.has(p));
    const at = free(occurrences(text, m.wrong, '')) ?? free(occurrences(text, m.wrong, 'i'));
    if (at === undefined) continue; // the AI quoted words that aren't there
    used.add(at);
    placed.push({ at, mistake: m });
  }
  return placed.sort((a, b) => a.at - b.at).map((p) => p.mistake);
}

export const countWords = (text) => text.trim().split(/\s+/).filter(Boolean).length;

/**
 * Turns the AI's raw JSON into what we save. Returns null if the answer is unusable.
 */
export function normaliseReview(raw, text) {
  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success || !Number.isFinite(parsed.data.score)) return null;
  const r = parsed.data;

  const mistakes = placeMistakes(text, r.mistakes);
  const wordCount = countWords(text);
  return {
    mistakes,
    score: Math.round(Math.min(100, Math.max(0, r.score))),
    summary: r.summary,
    feedback: r.feedback,
    strengths: r.strengths,
    improvements: r.improvements,
    rewritten: r.rewritten,
    wordCount,
    mistakeCount: mistakes.length,
    errorsPer100: wordCount ? Math.round((mistakes.length / wordCount) * 1000) / 10 : 0,
  };
}
