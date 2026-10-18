import { z } from 'zod';
import Conversation from '../models/Conversation.js';
import WritingCheck from '../models/WritingCheck.js';
import GrammarAttempt from '../models/GrammarAttempt.js';
import asyncHandler from '../utils/asyncHandler.js';
import { httpError } from '../utils/httpError.js';
import { parse } from '../utils/validate.js';
import { MISTAKE_TYPES } from '../prompts/correctionPrompt.js';
import { LESSONS, getLesson } from '../data/grammarLessons.js';

const DAY = 86_400_000;
const QUIZ_SIZE = 8;
const QUIZ_NEEDED = 4;
const MAX_LEN = 80;
const MASTERY_FROM = 3; // the last 3 lesson attempts of a type

const known = new Set(MISTAKE_TYPES);
const asType = (t) => (known.has(t) ? t : 'other');

const typeSchema = z.enum(MISTAKE_TYPES, { error: 'Pick a valid mistake type' });

const attemptSchema = z
  .object({
    kind: z.enum(['lesson', 'mine'], { error: 'Kind must be lesson or mine' }),
    type: typeSchema.optional(),
    correct: z.number({ error: 'Correct must be a whole number' }).int('Correct must be a whole number').min(0, 'Correct cannot be negative'),
    total: z
      .number({ error: 'Total must be a whole number' })
      .int('Total must be a whole number')
      .min(1, 'Total must be between 1 and 20')
      .max(20, 'Total must be between 1 and 20'),
  })
  .refine((a) => a.kind !== 'lesson' || a.type, { error: 'Pick a lesson type', path: ['type'] })
  .refine((a) => a.correct <= a.total, { error: 'Correct cannot be more than total', path: ['correct'] });

// This user's mistakes of each type since a date, from conversations and writing checks
async function countMistakes(userId, since) {
  const [spoken, written] = await Promise.all([
    Conversation.aggregate([
      { $match: { user: userId, 'messages.createdAt': { $gte: since } } },
      { $unwind: '$messages' },
      { $match: { 'messages.role': 'user', 'messages.createdAt': { $gte: since } } },
      { $unwind: '$messages.mistakes' },
      { $group: { _id: '$messages.mistakes.type', n: { $sum: 1 } } },
    ]),
    WritingCheck.aggregate([
      { $match: { user: userId, createdAt: { $gte: since } } },
      { $unwind: '$mistakes' },
      { $group: { _id: '$mistakes.type', n: { $sum: 1 } } },
    ]),
  ]);
  const counts = Object.fromEntries(MISTAKE_TYPES.map((t) => [t, 0]));
  for (const r of [...spoken, ...written]) counts[asType(r._id)] += r.n;
  return counts;
}

// GET /api/grammar/overview
export const getOverview = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const [counts, attempts] = await Promise.all([
    countMistakes(userId, new Date(Date.now() - 60 * DAY)),
    GrammarAttempt.find({ user: userId, kind: 'lesson' }).sort({ createdAt: -1 }).limit(500).select('type correct total').lean(),
  ]);

  // Mastery: sum(correct) / sum(total) over the last 3 lesson attempts of each type
  const recent = {};
  for (const a of attempts) {
    const list = (recent[a.type] ??= []);
    if (list.length < MASTERY_FROM) list.push(a);
  }
  const mastery = (type) => {
    const list = recent[type];
    if (!list?.length) return null;
    const correct = list.reduce((n, a) => n + a.correct, 0);
    const total = list.reduce((n, a) => n + a.total, 0);
    return Math.round((correct / total) * 100);
  };

  // Most mistakes wins; a tie goes to the type listed first
  let focusType = null;
  for (const l of LESSONS) if (counts[l.type] > (focusType ? counts[focusType] : 0)) focusType = l.type;

  res.json({
    lessons: LESSONS.map((l) => ({
      type: l.type,
      title: l.title,
      summary: l.summary,
      mistakeCount: counts[l.type],
      mastery: mastery(l.type),
    })),
    focusType,
  });
});

// GET /api/grammar/lessons/:type
// Answers included: in a family app, instant feedback matters more than hiding them
export const getLessonByType = asyncHandler(async (req, res) => {
  const lesson = getLesson(req.params.type);
  if (!lesson) throw httpError(404, 'Lesson not found');
  res.json({ lesson });
});

// GET /api/grammar/quiz?type=article
// Up to 8 of this user's own mistakes, newest first, for "Practise your mistakes"
export const getQuiz = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const type = req.query.type ? parse(typeSchema, req.query.type) : undefined;
  const byType = (path) => (type ? [{ $match: { [path]: type } }] : []);
  const SCAN = 300; // plenty to find 8 usable ones after de-duplicating

  const [spoken, written] = await Promise.all([
    Conversation.aggregate([
      { $match: { user: userId, 'messages.mistakes.0': { $exists: true } } },
      { $unwind: { path: '$messages', includeArrayIndex: 'mi' } },
      { $match: { 'messages.role': 'user' } },
      { $unwind: { path: '$messages.mistakes', includeArrayIndex: 'xi' } },
      ...byType('messages.mistakes.type'),
      { $project: { at: '$messages.createdAt', m: '$messages.mistakes', mi: 1, xi: 1 } },
      { $sort: { at: -1, xi: 1 } },
      { $limit: SCAN },
    ]),
    WritingCheck.aggregate([
      { $match: { user: userId } },
      { $unwind: { path: '$mistakes', includeArrayIndex: 'xi' } },
      ...byType('mistakes.type'),
      { $project: { at: '$createdAt', m: '$mistakes', xi: 1 } },
      { $sort: { at: -1, xi: 1 } },
      { $limit: SCAN },
    ]),
  ]);

  // Mistakes have no id of their own, so the id says where each one lives
  const all = [
    ...spoken.map((r) => ({ ...r, id: `c-${r._id}-${r.mi}-${r.xi}` })),
    ...written.map((r) => ({ ...r, id: `w-${r._id}-${r.xi}` })),
  ].sort((a, b) => b.at - a.at || a.xi - b.xi);

  const seen = new Set();
  const usable = [];
  for (const r of all) {
    const wrong = (r.m.wrong || '').trim();
    const right = (r.m.right || '').trim();
    if (!wrong || !right || wrong === right || wrong.length > MAX_LEN || right.length > MAX_LEN) continue;
    const key = `${wrong.toLowerCase()}\u0000${right.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    usable.push({ id: r.id, type: asType(r.m.type), wrong, right, rule: r.m.rule || '' });
  }

  const items = usable.slice(0, QUIZ_SIZE);
  res.json({
    items: items.length >= QUIZ_NEEDED ? items : [],
    needed: QUIZ_NEEDED,
    have: items.length,
  });
});

// POST /api/grammar/attempts
export const createAttempt = asyncHandler(async (req, res) => {
  const body = parse(attemptSchema, req.body ?? {});
  const attempt = await GrammarAttempt.create({ user: req.user._id, ...body });
  res.status(201).json({ attempt });
});
