import { z } from 'zod';
import { isValidObjectId } from 'mongoose';
import WritingCheck from '../models/WritingCheck.js';
import asyncHandler from '../utils/asyncHandler.js';
import { httpError } from '../utils/httpError.js';
import { parse } from '../utils/validate.js';
import { generateJson } from '../services/aiService.js';
import { buildWritingPrompt } from '../prompts/writingPrompt.js';
import { normaliseReview } from '../utils/writingCheck.js';

// A 1000-word essay plus a full rewrite takes longer than a chat turn
const LONG_AI = { attemptTimeoutMs: 40_000, totalBudgetMs: 60_000, maxOutputTokens: 16_384 };

const checkSchema = z.object({
  text: z
    .string({ error: 'Write at least a sentence or two' })
    .trim()
    .min(20, 'Write at least a sentence or two')
    .max(6000, 'Keep it under 6000 characters, about 1000 words'),
  kind: z
    .enum(['essay', 'email', 'message', 'other'], { error: 'Kind must be essay, email, message or other' })
    .default('essay'),
  title: z.string({ error: 'Title must be text' }).trim().max(100, 'Keep the title under 100 characters').optional(),
});

// Our own prompt tags can't appear in the learner's text, so nobody can
// "close" the tag and slip instructions in (the prompt also says to ignore them)
const clean = (text) => text.replace(/<\/?learner_text>/gi, '');

// Loads a check only if it belongs to the logged-in user.
// A bad id and someone else's id both give the same 404.
const findOwned = async (req) => {
  const { id } = req.params;
  const check = isValidObjectId(id) ? await WritingCheck.findOne({ _id: id, user: req.user._id }) : null;
  if (!check) throw httpError(404, 'Writing check not found');
  return check;
};

// POST /api/writing/check
export const createCheck = asyncHandler(async (req, res) => {
  const { text, kind, title = '' } = parse(checkSchema, req.body);

  // Ask the AI FIRST. If it fails, nothing is saved (generateJson throws a friendly 503).
  const raw = await generateJson({
    system: buildWritingPrompt({ text: clean(text), kind }),
    prompt: "Review the learner's text now and reply with the JSON object only.",
    temperature: 0.2,
    ...LONG_AI,
  });

  const review = normaliseReview(raw, text);
  if (!review) {
    // The answer can quote the learner, so log only which fields came back
    console.error('Unexpected writing review shape, fields:', Object.keys(raw ?? {}).join(', ') || '(none)');
    throw httpError(502, 'The AI sent an unexpected answer. Please try again.');
  }

  const check = await WritingCheck.create({ user: req.user._id, title, kind, text, ...review });
  res.status(201).json({ check });
});

// GET /api/writing?limit=20   (a light list: no text, rewrite or mistakes)
export const listChecks = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
  const rows = await WritingCheck.find({ user: req.user._id })
    .select('title kind score wordCount mistakeCount createdAt')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  res.json({
    checks: rows.map(({ _id, title, kind, score, wordCount, mistakeCount, createdAt }) => ({
      id: _id, title, kind, score, wordCount, mistakeCount, createdAt,
    })),
  });
});

// GET /api/writing/:id
export const getCheck = asyncHandler(async (req, res) => {
  res.json({ check: await findOwned(req) });
});

// DELETE /api/writing/:id
export const deleteCheck = asyncHandler(async (req, res) => {
  const check = await findOwned(req);
  await check.deleteOne();
  res.json({ deleted: true, id: check.id });
});
