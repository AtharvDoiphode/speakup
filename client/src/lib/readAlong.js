const NUMBERS = {
  0: 'zero', 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight',
  9: 'nine', 10: 'ten', 11: 'eleven', 12: 'twelve', 15: 'fifteen', 20: 'twenty',
};

export const tokenize = (text) => text.match(/\S+/g) ?? [];

// Lowercase, no punctuation or apostrophes, digits spelled out ("8" == "eight")
export function norm(word) {
  const t = word.toLowerCase().replace(/[^a-z0-9]/g, '');
  return NUMBERS[t] ?? t;
}

// Same word, or one letter off for longer words (speech engines slip: "colleage")
function close(a, b) {
  if (a === b) return true;
  if (!a || !b || Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

// Words people say while thinking. They count if they're the very next word
// of the passage, but never make the marker jump ahead ("so" two words on).
const FILLERS = new Set(['um', 'umm', 'uh', 'uhh', 'er', 'erm', 'ah', 'hmm', 'mm', 'so', 'like', 'well', 'okay', 'ok', 'actually']);

// Walk the passage as the reader speaks. A spoken word may match up to `lookahead`
// words ahead; anything jumped over is "missed". Extra spoken words are ignored.
export function align(passageTokens, spokenText, lookahead = 4) {
  const target = passageTokens.map(norm);
  const said = spokenText.split(/\s+/).map(norm).filter(Boolean);
  const status = target.map((t) => (t ? 'pending' : 'read')); // pure punctuation counts as read
  let pos = 0;
  while (pos < target.length && !target[pos]) pos++;

  for (const w of said) {
    if (pos >= target.length) break;
    let hit = -1;
    const reach = FILLERS.has(w) ? 1 : lookahead + 1;
    for (let j = pos; j < Math.min(target.length, pos + reach); j++) {
      if (target[j] && close(target[j], w)) { hit = j; break; }
    }
    if (hit === -1) continue;
    for (let k = pos; k < hit; k++) if (target[k]) status[k] = 'missed';
    status[hit] = 'read';
    pos = hit + 1;
    while (pos < target.length && !target[pos]) pos++;
  }
  return { status, position: pos };
}

export function summarise(passageTokens, status, position, durationSec) {
  const reached = status.slice(0, position).filter((s, i) => norm(passageTokens[i])).length;
  const read = status.slice(0, position).filter((s, i) => s === 'read' && norm(passageTokens[i])).length;
  const missed = [...new Set(passageTokens.filter((_, i) => status[i] === 'missed').map((t) => t.replace(/[^\p{L}\p{N}']/gu, '')))].slice(0, 30);
  return {
    wordsReached: reached,
    wordsRead: read,
    missed,
    accuracy: reached ? Math.round((read / reached) * 100) : 0,
    wpm: durationSec > 0 ? Math.round(reached / (durationSec / 60)) : 0,
  };
}