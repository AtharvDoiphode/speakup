import { z } from 'zod';
import { SCORECARD_SKILLS } from '../data/modes.js';
import { stripTags } from '../prompts/roleplayPrompt.js';

const MSG_CHARS = 700; // one very long answer can't crowd out the rest
const TOTAL_CHARS = 14_000; // about 3,500 tokens of transcript at most
const DEFAULT_SCORE = 3;
const MIN_RATED = 3; // fewer real ratings than this and the scorecard isn't worth showing

const words = (s, n) => s.split(/\s+/).filter(Boolean).slice(0, n).join(' ');
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

// The whole conversation as plain lines. Very long ones are trimmed sensibly: each message is
// capped, and if it's still too long, the first exchange and the most recent ones are kept.
export function scorecardTranscript(conversation) {
  const lines = conversation.messages.map((m) =>
    `${m.role === 'ai' ? conversation.persona?.name || 'Partner' : 'Learner'}: ${clip(stripTags(m.text).replace(/\s+/g, ' ').trim(), MSG_CHARS)}`
  );
  if (lines.join('\n').length <= TOTAL_CHARS) return lines.join('\n');
  const head = lines.slice(0, 2);
  const tail = [];
  let size = head.join('\n').length + 40;
  for (let i = lines.length - 1; i >= 2 && size + lines[i].length + 1 <= TOTAL_CHARS; i--) {
    tail.unshift(lines[i]);
    size += lines[i].length + 1;
  }
  return [...head, '[… earlier part shortened …]', ...tail].join('\n');
}

const listSchema = z.array(z.unknown()).catch([]).transform((list) =>
  list.filter((x) => typeof x === 'string').map((x) => clip(x.trim(), 200)).filter(Boolean).slice(0, 3)
);
const shapeSchema = z.object({
  categories: z.array(z.unknown()).catch([]),
  strengths: listSchema,
  improvements: listSchema,
  highlight: z
    .object({ title: z.string().catch(''), why: z.string().catch('') })
    .catch({ title: '', why: '' })
    .transform((h) => ({ title: clip(h.title.trim(), 140), why: clip(h.why.trim(), 280) })),
});

// A score the AI sent, as a whole number from 1 to 5 (or null if it isn't a number at all)
const toScore = (v) => {
  const n = typeof v === 'string' ? Number.parseFloat(v) : v;
  return Number.isFinite(n) ? Math.min(5, Math.max(1, Math.round(n))) : null;
};

/**
 * Checks the AI's scorecard against the mode's five skills. Scores are clamped to 1–5, notes cut
 * to 20 words, odd fields get safe defaults. The overall score is worked out here, never taken
 * from the AI: round(mean of the five) × 20. Returns null if the answer is unusable.
 */
export function normaliseScorecard(raw, mode) {
  const skills = SCORECARD_SKILLS[mode];
  if (!skills || !raw || typeof raw !== 'object') return null;
  const parsed = shapeSchema.parse(raw);

  const byKey = new Map();
  for (const c of parsed.categories) {
    if (!c || typeof c !== 'object') continue;
    const id = String(c.key ?? c.label ?? '').toLowerCase().trim();
    const skill = skills.find((s) => s.key === id || s.label.toLowerCase() === id || id.startsWith(s.key));
    if (skill && !byKey.has(skill.key)) byKey.set(skill.key, c);
  }

  let rated = 0;
  const categories = skills.map(({ key, label }) => {
    const c = byKey.get(key);
    const score = c ? toScore(c.score) : null;
    if (score != null) rated += 1;
    return {
      key,
      label,
      score: score ?? DEFAULT_SCORE,
      note: c && typeof c.note === 'string' && c.note.trim() ? words(c.note.trim(), 20) : 'Not enough to judge this time.',
    };
  });
  if (rated < MIN_RATED) return null;

  const mean = categories.reduce((n, c) => n + c.score, 0) / categories.length;
  return {
    overall: Math.round(mean * 20),
    categories,
    strengths: parsed.strengths,
    improvements: parsed.improvements,
    highlight: parsed.highlight,
    generatedAt: new Date(),
  };
}
