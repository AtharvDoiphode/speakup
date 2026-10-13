// "Pune." and "pune" are the same words: lowercase, letters/numbers/spaces only
const bareWords = (s) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();

// Safety net: a "mistake" that only changes capitals or punctuation is not real,
// because speech-to-text has neither. Used wherever AI corrections come back.
export const isRealMistake = (m) => bareWords(m.wrong) !== bareWords(m.right);

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Safety net: sometimes the AI lists the mistakes but returns "corrected" unchanged.
// In that case we build the corrected sentence ourselves, by swapping each
// wrong phrase for its fix (whole words only, any capitalisation).
export const ensureCorrected = (text, corrected, mistakes) => {
  if (mistakes.length === 0) return text;
  if (corrected && bareWords(corrected) !== bareWords(text)) return corrected;

  let sentence = text;
  let cursor = 0; // the AI lists mistakes in sentence order, so look after the previous fix first
  for (const m of mistakes) {
    const wholePhrase = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(m.wrong)}(?![\\p{L}\\p{N}])`, 'giu');
    wholePhrase.lastIndex = cursor;
    let match = wholePhrase.exec(sentence);
    if (!match) {
      wholePhrase.lastIndex = 0; // not found further on: fall back to the first match anywhere
      match = wholePhrase.exec(sentence);
    }
    if (!match) continue;
    sentence = sentence.slice(0, match.index) + m.right + sentence.slice(match.index + match[0].length);
    cursor = match.index + m.right.length;
  }
  return sentence;
};
