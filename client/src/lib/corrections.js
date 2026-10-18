export const MISTAKE_LABELS = {
  tense: 'Tense',
  article: 'Articles',
  preposition: 'Prepositions',
  'subject-verb': 'Subject–verb',
  plural: 'Plurals',
  'word-choice': 'Word choice',
  'word-order': 'Word order',
  spelling: 'Spelling',
  punctuation: 'Punctuation',
  capitalization: 'Capitalization',
  other: 'Other',
};

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Split the learner's text into plain parts and fix parts, in sentence order.
// A mistake that can't be found still gets its margin note; it just isn't marked inline.
export function buildSegments(text, mistakes = []) {
  const segments = [];
  let cursor = 0;

  mistakes.forEach((m, i) => {
    const wrong = (m.wrong || '').trim();
    if (!wrong) return;
    const re = new RegExp(`(?<![\\w'])${escape(wrong)}(?![\\w'])`, 'i');
    const hit = re.exec(text.slice(cursor));
    if (!hit) return;

    const start = cursor + hit.index;
    if (start > cursor) segments.push({ type: 'text', text: text.slice(cursor, start) });
    segments.push({ type: 'fix', wrong: hit[0], right: (m.right || '').trim(), n: i + 1 });
    cursor = start + hit[0].length;
  });

  if (cursor < text.length) segments.push({ type: 'text', text: text.slice(cursor) });
  return segments;
}