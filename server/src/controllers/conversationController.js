import { z } from 'zod';
import Conversation from '../models/Conversation.js';
import asyncHandler from '../utils/asyncHandler.js';
import { httpError } from '../utils/httpError.js';
import { parse } from '../utils/validate.js';
import { generateJson } from '../services/aiService.js';
import { buildRoleplayPrompt } from '../prompts/roleplayPrompt.js';
import { SCENARIOS, findScenario } from '../data/scenarios.js';

// GET /api/scenarios
export const listScenarios = (req, res) => {
  res.json({ scenarios: SCENARIOS });
};

const createSchema = z.object({
  scenarioId: z.string({ error: 'Pick a scenario' }).trim().min(1, 'Pick a scenario'),
  difficulty: z
    .enum(['friendly', 'neutral', 'tough'], { error: 'Difficulty must be friendly, neutral or tough' })
    .default('neutral'),
});

// What we expect back from the AI when it opens the scene
const openingSchema = z.object({ reply: z.string().trim().min(1) });

// POST /api/conversations
export const createConversation = asyncHandler(async (req, res) => {
  const { scenarioId, difficulty } = parse(createSchema, req.body);

  const scenario = findScenario(scenarioId);
  if (!scenario) throw httpError(404, 'Scenario not found');

  // Ask the AI for the opening line FIRST. If it fails, nothing is saved,
  // so you never end up with an empty conversation in the database.
  const raw = await generateJson({
    system: buildRoleplayPrompt({
      persona: scenario.persona,
      difficulty,
      level: req.user.level,
      mode: 'opening',
    }),
    prompt: 'Begin the scene now.',
    temperature: 0.8, // a bit higher, so each session feels fresh
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