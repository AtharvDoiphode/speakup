// Shared bits for the Vocabulary pages. Boxes and intervals match server/src/utils/srs.js.

export const INTERVALS = [0, 1, 3, 7, 14, 30]; // days, by box

// The 6 boxes shown as 4 stages
export const STAGES = [
  { key: 'new', label: 'New', boxes: [0], dot: 'bg-ink-faint', badge: 'bg-canvas text-ink-soft' },
  { key: 'learning', label: 'Learning', boxes: [1, 2], dot: 'bg-marker', badge: 'bg-marker/45 text-ink' },
  { key: 'known', label: 'Known', boxes: [3, 4], dot: 'bg-brand', badge: 'bg-brand/10 text-brand' },
  { key: 'mastered', label: 'Mastered', boxes: [5], dot: 'bg-correct', badge: 'bg-correct/12 text-correct-ink' },
];
export const stageOf = (box) => STAGES.find((s) => s.boxes.includes(box)) ?? STAGES[0];

export const CATEGORIES = [
  { value: 'everyday', label: 'Everyday' },
  { value: 'work', label: 'Work' },
  { value: 'phrasal', label: 'Phrasal verbs' },
  { value: 'idioms', label: 'Idioms' },
];

const DAY = 86_400_000;
const istDay = (t) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(t));
const dayNumber = (t) => Date.parse(`${istDay(t)}T00:00:00Z`) / DAY;

// "Due now", "in 8 min", "later today", "tomorrow", "in 3 days"
export function dueLabel(dueAt, now) {
  const t = new Date(dueAt).getTime();
  if (t <= now) return 'Due now';
  if (t - now < 60 * 60_000 && istDay(t) === istDay(now)) return `in ${Math.max(1, Math.ceil((t - now) / 60_000))} min`;
  const days = dayNumber(t) - dayNumber(now);
  if (days <= 0) return 'later today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

// "1 day", "3 days": what Good or Easy will do to a card in this box
export const gapLabel = (box, step) => {
  const d = INTERVALS[Math.min(box + step, INTERVALS.length - 1)];
  return d === 1 ? '1 day' : `${d} days`;
};

// Splits an example into parts, marking the word or phrase so it can sit on the yellow marker.
// Each word of the phrase may take an ending ("looks after", "negotiated").
export function markWord(example, word) {
  if (!example) return [];
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = word.toLowerCase().split(/\s+/).map((p) => {
    if (p === "someone's") return "\\w+(?:'s)?";
    const stem = p.length > 4 ? p.replace(/e$/, '') : p;
    return `${esc(stem)}[\\w'-]*`;
  });
  const m = new RegExp(`\\b${parts.join('\\s+')}`, 'i').exec(example);
  if (!m) return [{ text: example }];
  return [
    { text: example.slice(0, m.index) },
    { text: m[0], mark: true },
    { text: example.slice(m.index + m[0].length) },
  ].filter((p) => p.text);
}

// Friendly words for the "Fill it in for me" helper's errors
export function lookupError(err, fallback) {
  const status = err?.response?.status;
  if (status === 429) return "You've used the helper a lot this minute. Wait a moment, or type the meaning yourself.";
  if (status === 503) return 'The AI is busy right now. Type the meaning yourself, or try again in a minute.';
  if (status === 422) return "I couldn't find that word. Check the spelling, or type the meaning yourself.";
  return fallback;
}
