import { MISTAKE_LABELS } from './corrections';

// The lesson types, in the server's order (the same as MISTAKE_LABELS)
export const GRAMMAR_TYPES = Object.keys(MISTAKE_LABELS);
export const isGrammarType = (t) => GRAMMAR_TYPES.includes(t);
export const nextType = (t) => GRAMMAR_TYPES[(GRAMMAR_TYPES.indexOf(t) + 1) % GRAMMAR_TYPES.length];

// "7 article mistakes", for sentences
const NOUN = {
  tense: 'tense',
  article: 'article',
  preposition: 'preposition',
  'subject-verb': 'subject–verb',
  plural: 'plural',
  'word-choice': 'word-choice',
  'word-order': 'word-order',
  spelling: 'spelling',
  punctuation: 'punctuation',
  capitalization: 'capital letter',
};
export const mistakePhrase = (type, n) =>
  type in NOUN ? `${n} ${NOUN[type]} mistake${n === 1 ? '' : 's'}` : `${n} small slip${n === 1 ? '' : 's'}`;

// "Practise your own article mistakes", for the link from a lesson
export const ownMistakesLabel = (type) =>
  type in NOUN ? `Practise your own ${NOUN[type]} mistakes` : 'Practise your own common slips';

export function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
