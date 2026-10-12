// "Pune." and "pune" are the same words: lowercase, letters/numbers/spaces only
const bareWords = (s) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();

// Safety net: a "mistake" that only changes capitals or punctuation is not real,
// because speech-to-text has neither. Used wherever AI corrections come back.
export const isRealMistake = (m) => bareWords(m.wrong) !== bareWords(m.right);
