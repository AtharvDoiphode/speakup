// "Pune." and "pune" are the same words: lowercase, letters/numbers/spaces only
const bareWords = (s) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();

// Safety net: a "mistake" that only changes capitals or punctuation is not real,
// because speech-to-text has neither. Used wherever AI corrections come back.
export const isRealMistake = (m) => bareWords(m.wrong) !== bareWords(m.right);

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Finds a phrase as whole words (so "want" never matches inside "wanted"), in any
// capitalisation, starting at position `from`. Returns { index, end } or null.
const findPhrase = (sentence, phrase, from = 0) => {
  if (!phrase?.trim()) return null;
  const wholePhrase = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(phrase)}(?![\\p{L}\\p{N}])`, 'giu');
  wholePhrase.lastIndex = from;
  const match = wholePhrase.exec(sentence);
  return match ? { index: match.index, end: match.index + match[0].length } : null;
};

const isInside = (inner, outer) => inner.index >= outer.index && inner.end <= outer.end;

// Looking only at one stretch of the sentence: is this mistake still there?
// Returns the position of the wrong words if they need swapping, otherwise null.
const stillWrongAt = (wrongAt, rightAt) => {
  if (!wrongAt) return null; // the wrong words aren't here
  if (!rightAt) return wrongAt; // wrong words, and no fix in sight
  if (isInside(rightAt, wrongAt)) return wrongAt; // "a tea" -> "tea": the fix is only part of the wrong words
  if (isInside(wrongAt, rightAt)) return null; // "go" -> "go to": the wrong word is part of the applied fix
  return wrongAt.index < rightAt.index ? wrongAt : null; // whichever comes first decides
};

// Safety net: the AI lists the mistakes, but its "corrected" sentence doesn't
// always include every fix. Sometimes it returns the sentence unchanged, and
// sometimes it applies only some of its own fixes ("he have two cat" ->
// "he has two cat", with cat -> cats listed but not applied).
//
// So for each listed mistake we check the corrected sentence:
//  - the fix is already there            -> leave it alone
//  - the wrong words are still there     -> swap them for the fix
//  - neither is there                    -> skip it, rather than guess
// The AI lists mistakes in sentence order, so each one is looked for after the
// previous one first. That is what makes "i want coffee and she want tea" fix
// the second "want", not the first.
//
// Only "corrected" is repaired here. "natural" is the AI's own free rewording
// and is never passed in.
export const ensureCorrected = (text, corrected, mistakes) => {
  if (mistakes.length === 0) return text;

  let sentence = corrected?.trim() ? corrected : text;
  let cursor = 0; // just after the previous mistake

  for (const { wrong, right } of mistakes) {
    // First look after the previous mistake
    const wrongAhead = findPhrase(sentence, wrong, cursor);
    const rightAhead = findPhrase(sentence, right, cursor);
    let target = stillWrongAt(wrongAhead, rightAhead);

    if (!target && rightAhead) {
      cursor = rightAhead.end; // already applied: carry on from there
      continue;
    }
    // Nothing ahead at all (the AI listed this one out of order): look at the whole sentence
    if (!target && !wrongAhead) {
      target = stillWrongAt(findPhrase(sentence, wrong), findPhrase(sentence, right));
    }
    if (!target) continue; // already applied, or not found: leave it

    let end = target.end;
    // A fix that deletes a word (right is empty): take the following space
    // with it, so no double space is left behind
    if (!right?.trim() && sentence[end] === ' ') end += 1;

    sentence = sentence.slice(0, target.index) + (right ?? '') + sentence.slice(end);
    cursor = target.index + (right ?? '').length;
  }
  return sentence;
};
