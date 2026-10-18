import { z } from 'zod';
import ReadingSession from '../models/ReadingSession.js';
import asyncHandler from '../utils/asyncHandler.js';
import { httpError } from '../utils/httpError.js';
import { parse } from '../utils/validate.js';
import { PASSAGES, getPassage } from '../data/passages.js';

// Lower case, no punctuation, no apostrophes ("O'clock," → "oclock"),
// the same way the client's word matcher compares words
const norm = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

// Each passage's words, normalised once at start-up
const WORDS = new Map(PASSAGES.map((p) => [p.id, new Set(p.text.split(/\s+/).map(norm).filter(Boolean))]));

const int = (msg) => z.number({ error: msg }).int(msg);

const sessionSchema = z.object({
  passageId: z.string({ error: 'Pick a passage' }).min(1, 'Pick a passage'),
  durationSec: int('Duration must be a whole number of seconds')
    .min(5, 'That was too short to count')
    .max(1800, 'Sessions can be at most 30 minutes'),
  wordsReached: int('Words reached must be a whole number').min(5, 'Read a little more before finishing'),
  wordsRead: int('Words read must be a whole number').min(0, 'Words read cannot be negative'),
  missed: z
    .array(z.string({ error: 'Missed words must be text' }).max(40, 'Missed words must be under 40 characters'), {
      error: 'Missed words must be a list',
    })
    .max(30, 'At most 30 missed words')
    .default([]),
});

// GET /api/reading/passages
// Every passage, plus this person's best attempt at each (best accuracy, then speed)
export const listPassages = asyncHandler(async (req, res) => {
  const bests = await ReadingSession.aggregate([
    { $match: { user: req.user._id } },
    { $sort: { accuracy: -1, wpm: -1 } },
    { $group: { _id: '$passageId', accuracy: { $first: '$accuracy' }, wpm: { $first: '$wpm' } } },
  ]);
  const best = Object.fromEntries(bests.map((b) => [b._id, { accuracy: b.accuracy, wpm: b.wpm }]));

  res.json({
    passages: PASSAGES.map((p) => ({ ...p, best: best[p.id] ?? null })),
  });
});

// POST /api/reading/sessions
export const createSession = asyncHandler(async (req, res) => {
  const body = parse(sessionSchema, req.body ?? {});
  const passage = getPassage(body.passageId);
  if (!passage) throw httpError(400, 'Pick a passage');

  const { durationSec, wordsReached, wordsRead } = body;
  const wordsTotal = passage.words;
  if (wordsReached > wordsTotal) throw httpError(400, 'Words reached cannot be more than the passage has');
  if (wordsRead > wordsReached) throw httpError(400, 'Words read cannot be more than words reached');

  // Only words that really are in this passage, normalised and without repeats
  const known = WORDS.get(passage.id);
  const missed = [...new Set(body.missed.map(norm).filter(Boolean))];
  if (missed.some((w) => !known.has(w))) throw httpError(400, 'Missed words must come from the passage');

  const session = await ReadingSession.create({
    user: req.user._id,
    passageId: passage.id,
    title: passage.title,
    durationSec,
    wordsTotal,
    wordsReached,
    wordsRead,
    accuracy: Math.round((wordsRead / wordsReached) * 100),
    wpm: Math.round(wordsReached / (durationSec / 60)),
    missed,
  });

  res.status(201).json({ session });
});

// GET /api/reading/sessions?limit=10
export const listSessions = asyncHandler(async (req, res) => {
  const limit = z.coerce.number().int().min(1).max(50).catch(10).parse(req.query.limit ?? 10);
  const sessions = await ReadingSession.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(limit);
  res.json({ sessions });
});
