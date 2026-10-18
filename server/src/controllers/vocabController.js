import { z } from 'zod';
import { isValidObjectId } from 'mongoose';
import VocabCard from '../models/VocabCard.js';
import Conversation from '../models/Conversation.js';
import WritingCheck from '../models/WritingCheck.js';
import asyncHandler from '../utils/asyncHandler.js';
import { httpError } from '../utils/httpError.js';
import { parse } from '../utils/validate.js';
import { schedule, nextLabel, startOfDay, GRADES } from '../utils/srs.js';
import { generateJson } from '../services/aiService.js';
import { buildLookupPrompt } from '../prompts/vocabPrompt.js';
import { STARTER_WORDS, STARTER_CATEGORIES, getStarter } from '../data/starterWords.js';

const LEARNED_BOX = 3;
const LEVEL_RANK = { easy: 0, medium: 1, hard: 2 };
// ?limit=: a bad value gives the default, a big one is capped
const toLimit = (v, def, max) => Math.min(Math.max(parseInt(v, 10) || def, 1), max);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---- input rules ----

// 1–3 words of letters, apostrophes and hyphens: "reluctant", "look after", "o'clock"
const WORD_RULE = /^[A-Za-z][A-Za-z'-]*( [A-Za-z][A-Za-z'-]*){0,2}$/;
const WORD_MESSAGE = 'Use 1 to 3 words, with letters, apostrophes and hyphens only';
const tidyWord = (s) => s.normalize('NFKC').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();

const wordSchema = z
  .string({ error: 'Type a word or phrase' })
  .transform(tidyWord)
  .pipe(z.string().min(1, 'Type a word or phrase').max(40, 'Keep it under 40 characters').regex(WORD_RULE, WORD_MESSAGE));
const meaningSchema = z.string({ error: 'Add a meaning' }).trim().min(3, 'Add a meaning (at least 3 characters)').max(140, 'Keep the meaning under 140 characters');
const exampleSchema = z.string({ error: 'The example must be text' }).trim().max(200, 'Keep the example under 200 characters');

const cardSchema = z.object({
  word: wordSchema,
  meaning: meaningSchema,
  example: exampleSchema.optional().default(''),
  pos: z.string().trim().max(20).optional().catch(undefined), // from "Fill it in for me"
  source: z.enum(['custom', 'mistake']).optional().catch(undefined), // "mistake" when added from a suggestion
});
const editSchema = z
  .object({ meaning: meaningSchema.optional(), example: exampleSchema.optional() })
  .refine((b) => b.meaning !== undefined || b.example !== undefined, { error: 'Send a meaning or an example to change' });
const reviewSchema = z.object({
  cardId: z.string({ error: 'Which card?' }).refine(isValidObjectId, 'Which card?'),
  grade: z.enum(GRADES, { error: 'Grade must be again, good or easy' }),
});
const categorySchema = z.enum(STARTER_CATEGORIES, { error: 'Category must be everyday, work, phrasal or idioms' });
const deckSchema = z.union(
  [
    z.object({ starterId: z.string() }).strict(),
    z
      .object({
        count: z.number({ error: 'Count must be a number from 1 to 10' }).int('Count must be a number from 1 to 10').min(1, 'Count must be a number from 1 to 10').max(10, 'Count must be a number from 1 to 10'),
        category: categorySchema.optional(),
      })
      .strict(),
  ],
  { error: 'Send a starterId, or a count from 1 to 10' }
);
const statusSchema = z.enum(['all', 'due', 'learned'], { error: 'Status must be all, due or learned' });
const qSchema = z.string().trim().max(40, 'Keep the search under 40 characters');

// Loads a card only if it belongs to the logged-in user; anything else is the same 404
const findOwned = async (req, id = req.params.id) => {
  const card = isValidObjectId(id) ? await VocabCard.findOne({ _id: id, user: req.user._id }) : null;
  if (!card) throw httpError(404, 'Card not found');
  return card;
};

// Everything in my deck, for "is it already there?" checks
const myDeck = async (userId) => {
  const cards = await VocabCard.find({ user: userId }).select('word starterId').lean();
  return { words: new Set(cards.map((c) => c.word)), starterIds: new Set(cards.map((c) => c.starterId).filter(Boolean)) };
};
const inDeck = (deck, s) => deck.starterIds.has(s.id) || deck.words.has(s.word.toLowerCase());

const fromStarter = (userId, s) => ({
  user: userId, word: s.word, display: s.word, meaning: s.meaning, example: s.example,
  pos: s.pos, category: s.category, source: 'starter', starterId: s.id,
});

// ---- endpoints ----

// GET /api/vocab/overview
export const getOverview = asyncHandler(async (req, res) => {
  const user = req.user._id;
  const now = new Date();
  const [deckSize, dueCount, learned, reviewedToday, boxRows, deck] = await Promise.all([
    VocabCard.countDocuments({ user }),
    VocabCard.countDocuments({ user, dueAt: { $lte: now } }),
    VocabCard.countDocuments({ user, box: { $gte: LEARNED_BOX } }),
    VocabCard.countDocuments({ user, lastReviewedAt: { $gte: startOfDay(now) } }),
    VocabCard.aggregate([{ $match: { user } }, { $group: { _id: '$box', n: { $sum: 1 } } }]),
    myDeck(user),
  ]);
  const boxes = [0, 0, 0, 0, 0, 0];
  for (const r of boxRows) if (r._id >= 0 && r._id <= 5) boxes[r._id] = r.n;
  res.json({
    deckSize,
    dueCount,
    newAvailable: STARTER_WORDS.filter((s) => !inDeck(deck, s)).length,
    learned,
    reviewedToday,
    boxes,
  });
});

// GET /api/vocab/review?limit=20 → due cards, the longest-waiting first
export const getReview = asyncHandler(async (req, res) => {
  const limit = toLimit(req.query.limit, 20, 50);
  const filter = { user: req.user._id, dueAt: { $lte: new Date() } };
  const [cards, dueTotal] = await Promise.all([
    VocabCard.find(filter).sort({ dueAt: 1, _id: 1 }).limit(limit),
    VocabCard.countDocuments(filter),
  ]);
  res.json({ cards, dueTotal });
});

// POST /api/vocab/review { cardId, grade }
export const postReview = asyncHandler(async (req, res) => {
  const { cardId, grade } = parse(reviewSchema, req.body ?? {});
  const card = await findOwned(req, cardId);
  const now = new Date();
  card.set(schedule(card, grade, now));
  await card.save();
  res.json({ card, nextLabel: nextLabel(card.dueAt, now) });
});

// GET /api/vocab/library?category=work&q=dead
export const getLibrary = asyncHandler(async (req, res) => {
  const category = req.query.category ? parse(categorySchema, req.query.category) : undefined;
  const q = req.query.q ? parse(qSchema, String(req.query.q)).toLowerCase() : '';
  const deck = await myDeck(req.user._id);
  const words = STARTER_WORDS
    .filter((s) => !category || s.category === category)
    .filter((s) => !q || s.word.toLowerCase().includes(q) || s.meaning.toLowerCase().includes(q))
    .map((s) => ({ ...s, inDeck: inDeck(deck, s) }));
  res.json({ words });
});

// POST /api/vocab/deck { starterId } or { count, category? }
export const addToDeck = asyncHandler(async (req, res) => {
  const body = parse(deckSchema, req.body ?? {});
  const user = req.user._id;
  const deck = await myDeck(user);

  if (body.starterId !== undefined) {
    const s = getStarter(body.starterId);
    if (!s) throw httpError(404, 'That word is not in the library');
    if (inDeck(deck, s)) throw httpError(409, 'That word is already in your deck');
    const card = await VocabCard.create(fromStarter(user, s));
    return res.status(201).json({ cards: [card] });
  }

  // The next words not in my deck: easy first, then in library order
  const picks = STARTER_WORDS
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => (!body.category || s.category === body.category) && !inDeck(deck, s))
    .sort((a, b) => LEVEL_RANK[a.s.level] - LEVEL_RANK[b.s.level] || a.i - b.i)
    .slice(0, body.count)
    .map(({ s }) => fromStarter(user, s));
  if (!picks.length) return res.json({ cards: [] }); // nothing left to add

  // ordered: false keeps going past a word added a moment ago in another tab
  let cards;
  try {
    cards = await VocabCard.insertMany(picks, { ordered: false });
  } catch (err) {
    if (err.code !== 11000 && !err.writeErrors) throw err;
    cards = err.insertedDocs ?? [];
  }
  res.status(201).json({ cards });
});

// POST /api/vocab/cards { word, meaning, example? }
export const createCard = asyncHandler(async (req, res) => {
  const body = parse(cardSchema, req.body ?? {});
  const word = body.word.toLowerCase();
  if (await VocabCard.exists({ user: req.user._id, word })) throw httpError(409, 'That word is already in your deck');
  try {
    const card = await VocabCard.create({
      user: req.user._id, word, display: body.word, meaning: body.meaning, example: body.example,
      pos: body.pos ?? '', category: '', source: body.source ?? 'custom',
    });
    res.status(201).json({ card });
  } catch (err) {
    if (err.code === 11000) throw httpError(409, 'That word is already in your deck'); // added a moment ago
    throw err;
  }
});

// GET /api/vocab/cards?q=&status=all|due|learned
export const listCards = asyncHandler(async (req, res) => {
  const status = req.query.status ? parse(statusSchema, req.query.status) : 'all';
  const q = req.query.q ? parse(qSchema, String(req.query.q)) : '';
  const filter = { user: req.user._id };
  if (status === 'due') filter.dueAt = { $lte: new Date() };
  if (status === 'learned') filter.box = { $gte: LEARNED_BOX };
  if (q) {
    const re = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ word: re }, { display: re }, { meaning: re }];
  }
  const cards = await VocabCard.find(filter).sort(status === 'due' ? { dueAt: 1 } : { createdAt: -1 }).limit(500);
  res.json({ cards });
});

// PATCH /api/vocab/cards/:id { meaning?, example? }
export const editCard = asyncHandler(async (req, res) => {
  const body = parse(editSchema, req.body ?? {});
  const card = await findOwned(req);
  if (body.meaning !== undefined) card.meaning = body.meaning;
  if (body.example !== undefined) card.example = body.example;
  await card.save();
  res.json({ card });
});

// DELETE /api/vocab/cards/:id
export const deleteCard = asyncHandler(async (req, res) => {
  const card = await findOwned(req);
  await card.deleteOne();
  res.json({ deleted: true, id: card.id });
});

// GET /api/vocab/suggestions → words I used wrongly (word-choice mistakes), as cards to add
export const getSuggestions = asyncHandler(async (req, res) => {
  const user = req.user._id;
  const [spoken, written, deck] = await Promise.all([
    Conversation.aggregate([
      { $match: { user, 'messages.mistakes.type': 'word-choice' } },
      { $unwind: '$messages' },
      { $match: { 'messages.role': 'user' } },
      { $unwind: '$messages.mistakes' },
      { $match: { 'messages.mistakes.type': 'word-choice' } },
      { $project: { _id: 0, at: '$messages.createdAt', m: '$messages.mistakes' } },
      { $sort: { at: -1 } },
      { $limit: 200 },
    ]),
    WritingCheck.aggregate([
      { $match: { user, 'mistakes.type': 'word-choice' } },
      { $unwind: '$mistakes' },
      { $match: { 'mistakes.type': 'word-choice' } },
      { $project: { _id: 0, at: '$createdAt', m: '$mistakes' } },
      { $sort: { at: -1 } },
      { $limit: 200 },
    ]),
    myDeck(user),
  ]);

  const seen = new Set();
  const suggestions = [];
  for (const { m } of [...spoken, ...written].sort((a, b) => b.at - a.at)) {
    // "lend me." → "lend me": trim punctuation at the ends, then the same rule as typed words
    // and "Lend me" (a capital only because it started a sentence) → "lend me"
    const word = tidyWord(m.right || '')
      .replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, '')
      .replace(/^[A-Z](?=[a-z' -]+$)/, (c) => c.toLowerCase());
    const key = word.toLowerCase();
    if (!WORD_RULE.test(word) || word.length > 40 || seen.has(key) || deck.words.has(key)) continue;
    if (key === tidyWord(m.wrong || '').toLowerCase()) continue;
    seen.add(key);
    suggestions.push({ word, wrong: (m.wrong || '').trim(), rule: m.rule || '' });
    if (suggestions.length === 8) break;
  }
  res.json({ suggestions });
});

// The AI's answer, checked: wrong types become empty, long text is cut to fit
const lookupSchema = z.object({
  meaning: z.string().trim().catch('').transform((s) => s.slice(0, 140)),
  example: z.string().trim().catch('').transform((s) => s.slice(0, 200)),
  pos: z.string().trim().toLowerCase().catch('').transform((s) => s.slice(0, 20)),
});

// POST /api/vocab/lookup { word } → { meaning, example, pos }. Saves nothing.
export const lookupWord = asyncHandler(async (req, res) => {
  const { word } = parse(z.object({ word: wordSchema }), req.body ?? {});
  const raw = await generateJson({
    system: buildLookupPrompt(word),
    prompt: 'Explain the word now and reply with the JSON object only.',
    temperature: 0.3,
    maxOutputTokens: 400,
  });
  const out = lookupSchema.parse(raw && typeof raw === 'object' ? raw : {});
  if (out.meaning.length < 3) {
    throw httpError(422, "I couldn't find that word. Check the spelling, or type the meaning yourself.");
  }
  res.json(out);
});
