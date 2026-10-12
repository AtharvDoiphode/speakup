import { z } from 'zod';
import { isValidObjectId } from 'mongoose';
import Conversation from '../models/Conversation.js';
import asyncHandler from '../utils/asyncHandler.js';
import { httpError } from '../utils/httpError.js';
import { parse } from '../utils/validate.js';
import { isRealMistake } from '../utils/mistakes.js';
import { generateJson } from '../services/aiService.js';
import { buildRoleplayPrompt } from '../prompts/roleplayPrompt.js';
import { MISTAKE_TYPES } from '../prompts/correctionPrompt.js';
import { SCENARIOS, findScenario } from '../data/scenarios.js';

const MAX_MESSAGES = 100; // hard cap per conversation, protects the free AI quota
const HISTORY_FOR_AI = 20; // how many recent messages the AI sees

// GET /api/scenarios
export const listScenarios = (req, res) => {
  res.json({ scenarios: SCENARIOS });
};

// ---------- helpers ----------

// Loads a conversation only if it belongs to the logged-in user.
// A bad id and someone else's id both give the same 404.
const findOwned = async (req) => {
  const { id } = req.params;
  const conversation = isValidObjectId(id)
    ? await Conversation.findOne({ _id: id, user: req.user._id })
    : null;
  if (!conversation) throw httpError(404, 'Conversation not found');
  return conversation;
};

// Removes our own prompt tags from user text, so nobody can "close" a tag
// and sneak instructions in. (The prompt also tells the AI to ignore them.)
const clean = (text) => text.replace(/<\/?(learner_text|conversation)>/gi, '');

// Turns recent messages into plain text the AI can read
const buildTranscript = (conversation) =>
  conversation.messages
    .slice(-HISTORY_FOR_AI)
    .map((m) => `${m.role === 'ai' ? conversation.persona.name : 'Learner'}: ${clean(m.text)}`)
    .join('\n');

// ---------- start a conversation ----------

const createSchema = z.object({
  scenarioId: z.string({ error: 'Pick a scenario' }).trim().min(1, 'Pick a scenario'),
  difficulty: z
    .enum(['friendly', 'neutral', 'tough'], { error: 'Difficulty must be friendly, neutral or tough' })
    .default('neutral'),
});

const openingSchema = z.object({ reply: z.string().trim().min(1) });

// POST /api/conversations
export const createConversation = asyncHandler(async (req, res) => {
  const { scenarioId, difficulty } = parse(createSchema, req.body);

  const scenario = findScenario(scenarioId);
  if (!scenario) throw httpError(404, 'Scenario not found');

  // Ask the AI for the opening line FIRST. If it fails, nothing is saved.
  const raw = await generateJson({
    system: buildRoleplayPrompt({
      persona: scenario.persona,
      difficulty,
      level: req.user.level,
      mode: 'opening',
    }),
    prompt: 'Begin the scene now.',
    temperature: 0.8,
  });

  const opening = openingSchema.safeParse(raw);
  if (!opening.success) {
    console.error('Unexpected AI shape:', raw);
    throw httpError(502, 'The AI sent an unexpected answer. Please try again.');
  }

  const conversation = await Conversation.create({
    user: req.user._id,
    scenarioId: scenario.id,
    title: scenario.title,
    persona: scenario.persona, // a copy, so later edits to scenarios don't change history
    difficulty,
    level: req.user.level,
    messages: [{ role: 'ai', text: opening.data.reply }],
  });

  res.status(201).json({ conversation });
});

// ---------- read one conversation ----------

// GET /api/conversations/:id
export const getConversation = asyncHandler(async (req, res) => {
  const conversation = await findOwned(req);
  res.json({ conversation });
});

// ---------- reply to the character ----------

const messageSchema = z.object({
  text: z
    .string({ error: 'Say or write something first' })
    .trim()
    .min(1, 'Say or write something first')
    .max(1000, 'Keep it under 1000 characters'),
});

// What we expect back from the AI. .catch() and .default() absorb small slips.
// (The same mistake shape exists in aiController.js. We can share it later.)
const turnSchema = z.object({
  reply: z.string().trim().min(1),
  corrected: z.string().default(''),
  mistakes: z
    .array(
      z.object({
        wrong: z.string(),
        right: z.string(),
        rule: z.string(),
        type: z.enum(MISTAKE_TYPES).catch('other'),
      })
    )
    .default([]),
  natural: z.string().default(''),
});

// POST /api/conversations/:id/messages
export const sendMessage = asyncHandler(async (req, res) => {
  const { text } = parse(messageSchema, req.body);
  const conversation = await findOwned(req);

  if (conversation.status !== 'active') {
    throw httpError(409, 'This conversation has ended. Start a new one.');
  }
  if (conversation.messages.length >= MAX_MESSAGES) {
    throw httpError(409, 'This conversation is long enough. End it and start a new one.');
  }

  // One AI call gives both the character's reply and the corrections
  const raw = await generateJson({
    system: buildRoleplayPrompt({
      persona: conversation.persona,
      difficulty: conversation.difficulty,
      level: conversation.level,
      mode: 'turn',
    }),
    prompt:
      `<conversation>\n${buildTranscript(conversation)}\n</conversation>\n\n` +
      `<learner_text>\n${clean(text)}\n</learner_text>`,
    temperature: 0.5, // a balance: natural replies, but steady corrections
  });

  const turn = turnSchema.safeParse(raw);
  if (!turn.success) {
    console.error('Unexpected AI shape:', raw);
    throw httpError(502, 'The AI sent an unexpected answer. Please try again.');
  }

  const { reply, natural, corrected } = turn.data;
  // Drop "mistakes" that only change capitals or punctuation (speech has neither)
  const mistakes = turn.data.mistakes.filter(isRealMistake);
  const isCorrect = mistakes.length === 0; // decided by us, not trusted from the AI

  const now = new Date();
  const userMessage = {
    role: 'user',
    text,
    corrected: isCorrect ? text : corrected || text,
    mistakes,
    natural,
    createdAt: now,
  };
  const aiMessage = {
    role: 'ai',
    text: reply,
    createdAt: new Date(now.getTime() + 1), // keeps the order stable
  };

  // Save both messages in one atomic update. If two requests overlap,
  // neither one overwrites the other, and an ended conversation is never touched.
  const result = await Conversation.updateOne(
    { _id: conversation._id, user: req.user._id, status: 'active' },
    { $push: { messages: { $each: [userMessage, aiMessage] } } }
  );
  if (result.modifiedCount === 0) {
    throw httpError(409, 'This conversation has ended.');
  }

  res.status(201).json({ userMessage, aiMessage, isCorrect });
});