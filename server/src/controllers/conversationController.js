import { z } from 'zod';
import { isValidObjectId } from 'mongoose';
import Conversation from '../models/Conversation.js';
import asyncHandler from '../utils/asyncHandler.js';
import { httpError } from '../utils/httpError.js';
import { parse } from '../utils/validate.js';
import { isRealMistake, ensureCorrected } from '../utils/mistakes.js';
import { generateJson } from '../services/aiService.js';
import { buildRoleplayPrompt, stripTags } from '../prompts/roleplayPrompt.js';
import { buildInterviewPrompt } from '../prompts/interviewPrompt.js';
import { buildDebatePrompt } from '../prompts/debatePrompt.js';
import { buildScorecardPrompt } from '../prompts/scorecardPrompt.js';
import { normaliseScorecard, scorecardTranscript } from '../utils/scorecard.js';
import { findOwnedPerson } from './peopleController.js';
import { getFocus, INTERVIEW_FOCUSES, INTERVIEW_TURNS, DEBATE_TURNS, DEBATE_PARTNER } from '../data/modes.js';
import { MISTAKE_TYPES } from '../prompts/correctionPrompt.js';
import { CATEGORIES, EXTRA_TRAITS, MOODS, SCENARIOS, getScenario } from '../data/scenarios.js';

const MAX_MESSAGES = 100; // hard cap per conversation, protects the free AI quota
const HISTORY_FOR_AI = 20; // how many recent messages the AI sees
const MAX_EXTRA_TRAITS = 3;

// GET /api/scenarios   (everything the scenario picker needs, in one call)
export const listScenarios = (req, res) => {
  res.json({
    categories: CATEGORIES,
    scenarios: SCENARIOS,
    extraTraits: EXTRA_TRAITS,
    moods: MOODS,
  });
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
const clean = stripTags;

// Interviews and debates count turns and end with a scorecard; scenes (and every
// conversation from before Day 10, which has no mode) don't
const hasTurns = (c) => c.mode === 'interview' || c.mode === 'debate';
const learnerTurns = (c) => c.messages.filter((m) => m.role === 'user').length;

// The right system prompt for this conversation's mode
const promptFor = (c, { mode, turn, level }) => {
  const args = { persona: c.persona, config: c.modeConfig, difficulty: c.difficulty, level: level ?? c.level, mode, turn };
  if (c.mode === 'interview') return buildInterviewPrompt(args);
  if (c.mode === 'debate') return buildDebatePrompt(args);
  return buildRoleplayPrompt(args);
};

// Turns recent messages into plain text the AI can read
const buildTranscript = (conversation) =>
  conversation.messages
    .slice(-HISTORY_FOR_AI)
    .map((m) => `${m.role === 'ai' ? conversation.persona.name : 'Learner'}: ${clean(m.text)}`)
    .join('\n');

// ---------- start a conversation ----------

const difficultyField = z
  .enum(['friendly', 'neutral', 'tough'], { error: 'Difficulty must be friendly, neutral or tough' })
  .default('neutral');
const modeField = z.object({
  mode: z.enum(['scene', 'interview', 'debate'], { error: 'Mode must be scene, interview or debate' }).default('scene'),
});

// Interview: a role the learner types and one of the focuses
const interviewSchema = z.object({
  difficulty: difficultyField,
  role: z.string({ error: 'Type the job you are interviewing for' }).trim()
    .min(2, 'Type the job you are interviewing for').max(60, 'Keep the job title under 60 characters'),
  focus: z.enum(INTERVIEW_FOCUSES.map((f) => f.value), { error: 'Focus must be hr, situational or campus' }),
});

// Debate: a motion from the list or typed by the learner, and which side they take
const debateSchema = z.object({
  difficulty: difficultyField,
  topic: z.string({ error: 'Pick or type a topic' }).trim()
    .min(5, 'Type a topic of at least 5 characters').max(120, 'Keep the topic under 120 characters'),
  stance: z.enum(['for', 'against'], { error: 'Stance must be for or against' }),
});

// A scene with one of your own saved people
const personSchema = z.object({
  difficulty: difficultyField,
  personId: z.string({ error: 'Pick a person' }),
});

const createSchema = z.object({
  scenarioId: z.string({ error: 'Pick a scenario' }).trim().min(1, 'Pick a scenario'),
  difficulty: difficultyField,
  // "Make it your own": up to 3 extra personality traits from the picker.
  // Repeats are dropped first, so ["Funny", "Funny"] counts as one.
  traits: z
    .array(z.enum(EXTRA_TRAITS, { error: 'Unknown trait' }), { error: 'Pick up to 3 extra traits' })
    .max(20, 'Pick up to 3 extra traits')
    .transform((list) => [...new Set(list)])
    .refine((list) => list.length <= MAX_EXTRA_TRAITS, 'Pick up to 3 extra traits')
    .default([]),
  mood: z.enum(MOODS, { error: 'Unknown mood' }).default('Neutral'),
});

const openingSchema = z.object({ reply: z.string().trim().min(1) });

// Everything about a new conversation except its opening line, for each kind
async function planConversation(req) {
  const { mode } = parse(modeField, req.body ?? {});

  if (mode === 'interview') {
    const { difficulty, role, focus } = parse(interviewSchema, req.body);
    const f = getFocus(focus);
    return {
      mode, difficulty, scenarioId: 'interview', title: `Interview: ${role}`,
      modeConfig: { role, focus, totalTurns: INTERVIEW_TURNS },
      persona: {
        name: f.interviewer.name, role: f.interviewer.title, roleLong: `${f.interviewer.title}, ${f.label.toLowerCase()} interview`,
        traits: ['Professional'], mood: 'Neutral',
        brief: `A practice ${f.label.toLowerCase()} interview for the role "${role}". ${f.interviewer.name} asks ${INTERVIEW_TURNS} questions, one at a time.`,
      },
    };
  }

  if (mode === 'debate') {
    const { difficulty, topic, stance } = parse(debateSchema, req.body);
    const other = stance === 'for' ? 'against' : 'for';
    return {
      mode, difficulty, scenarioId: 'debate', title: `Debate: ${topic}`,
      modeConfig: { topic, stance, totalTurns: DEBATE_TURNS },
      persona: {
        name: DEBATE_PARTNER.name, role: DEBATE_PARTNER.title, roleLong: `${DEBATE_PARTNER.title}, arguing ${other} the motion`,
        traits: ['Polite', 'Firm'], mood: 'Neutral',
        brief: `Motion: "${topic}". You argue ${stance}; ${DEBATE_PARTNER.name} argues ${other}. ${DEBATE_TURNS} rounds.`,
      },
    };
  }

  // A scene with one of your saved people
  if (req.body?.personId !== undefined) {
    const { difficulty, personId } = parse(personSchema, req.body);
    const p = await findOwnedPerson(req.user._id, personId);
    return {
      mode, difficulty, scenarioId: 'custom', title: `Talk with ${p.name}`, personId: p._id,
      persona: { name: p.name, role: p.role, roleLong: p.role, traits: p.traits, mood: p.mood, brief: p.brief, custom: true },
    };
  }

  // A scene from the list, exactly as before
  const { scenarioId, difficulty, traits, mood } = parse(createSchema, req.body);
  const scenario = getScenario(scenarioId);
  if (!scenario) throw httpError(400, 'Pick a scenario');
  // The character for this conversation: the scene's own traits plus the learner's extras.
  // Saved as a copy, so later edits to scenarios.js don't change history.
  return {
    mode, difficulty, scenarioId: scenario.id, title: scenario.title,
    persona: {
      name: scenario.who,
      role: scenario.role,
      roleLong: scenario.roleLong,
      traits: [...new Set([...scenario.traits, ...traits])],
      mood,
      brief: scenario.brief,
    },
  };
}

const BEGIN = {
  scene: 'Begin the scene now.',
  interview: 'Begin the interview now.',
  debate: 'Open the debate now.',
};

// POST /api/conversations
export const createConversation = asyncHandler(async (req, res) => {
  const plan = await planConversation(req);

  // Ask the AI for the opening line FIRST. If it fails, nothing is saved.
  const raw = await generateJson({
    system: promptFor(plan, { mode: 'opening', level: req.user.level }),
    prompt: BEGIN[plan.mode],
    temperature: 0.8,
  });

  const opening = openingSchema.safeParse(raw);
  if (!opening.success) {
    // The answer can quote the learner, so log only which fields came back
    console.error('Unexpected AI shape, fields:', Object.keys(raw ?? {}).join(', ') || '(none)');
    throw httpError(502, 'The AI sent an unexpected answer. Please try again.');
  }

  const conversation = await Conversation.create({
    user: req.user._id,
    ...plan,
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

  // Interviews and debates: the server counts the turns, so the AI can't lose track
  let progress = null; // { current, total, final }
  if (hasTurns(conversation)) {
    const total = conversation.modeConfig?.totalTurns ?? (conversation.mode === 'interview' ? INTERVIEW_TURNS : DEBATE_TURNS);
    const done = learnerTurns(conversation);
    if (done >= total) throw httpError(409, `This ${conversation.mode} is finished. See your scorecard.`);
    progress = { current: done + 1, total, final: done + 1 === total };
  }

  // One AI call gives both the character's reply and the corrections
  const raw = await generateJson({
    system: promptFor(conversation, { mode: 'turn', turn: progress }),
    prompt:
      `<conversation>\n${buildTranscript(conversation)}\n</conversation>\n\n` +
      `<learner_text>\n${clean(text)}\n</learner_text>`,
    temperature: 0.5, // a balance: natural replies, but steady corrections
  });

  const turn = turnSchema.safeParse(raw);
  if (!turn.success) {
    // The answer can quote the learner, so log only which fields came back
    console.error('Unexpected AI shape, fields:', Object.keys(raw ?? {}).join(', ') || '(none)');
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
    corrected: ensureCorrected(text, corrected, mistakes),
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
  // Interviews and debates also require that nothing was added since we counted,
  // so two quick messages can't both become "question 4"
  const unchanged = progress ? { [`messages.${conversation.messages.length}`]: { $exists: false } } : {};
  const result = await Conversation.updateOne(
    { _id: conversation._id, user: req.user._id, status: 'active', ...unchanged },
    { $push: { messages: { $each: [userMessage, aiMessage] } } }
  );
  if (result.modifiedCount === 0) {
    throw httpError(409, progress ? 'Another answer arrived first. Reload to see it.' : 'This conversation has ended.');
  }

  res.status(201).json({ userMessage, aiMessage, isCorrect, ...(progress && { turn: progress }) });
});

// ---------- end a conversation ----------

const MAX_SESSION_SEC = 60 * 60; // a tab left open overnight must not count as 8 hours

// The short version of a conversation that "end" returns
const summarise = (c) => ({
  id: c._id,
  status: c.status,
  endedAt: c.endedAt,
  durationSec: c.durationSec,
  score: c.score,
  mistakeCount: c.mistakeCount,
  messageCount: c.messages.length,
  mode: c.mode ?? 'scene',
  ...(hasTurns(c) && { scorecard: c.scorecard ?? null }),
});

const SCORECARD_AI = { temperature: 0.2, attemptTimeoutMs: 40_000, totalBudgetMs: 60_000, maxOutputTokens: 2048 };
const SCORECARD_LATER = "Your scorecard couldn't be made right now. Try again in a minute.";
const NOTHING_TO_SCORE = { interview: 'Answer at least one question to get a scorecard.', debate: 'Make at least one argument to get a scorecard.' };

// One AI call rates the five skills. Returns the checked scorecard, or null if the answer was unusable.
// AI errors (busy, timeout) are thrown as they are.
async function makeScorecard(c) {
  const raw = await generateJson({
    system: buildScorecardPrompt({ mode: c.mode, config: c.modeConfig ?? {}, transcript: scorecardTranscript(c), level: c.level }),
    prompt: 'Rate the learner now and reply with the JSON object only.',
    ...SCORECARD_AI,
  });
  const card = normaliseScorecard(raw, c.mode);
  // The answer can quote the learner, so log only which fields came back
  if (!card) console.error('Unexpected scorecard shape, fields:', Object.keys(raw ?? {}).join(', ') || '(none)');
  return card;
}

// POST /api/conversations/:id/end
export const endConversation = asyncHandler(async (req, res) => {
  const convo = await findOwned(req);

  // Ending twice is harmless: return what was already saved
  if (convo.status === 'ended') {
    return res.json({ conversation: summarise(convo) });
  }

  const userMsgs = convo.messages.filter((m) => m.role === 'user');
  const correct = userMsgs.filter((m) => m.mistakes.length === 0).length;
  const mistakeCount = userMsgs.reduce((n, m) => n + m.mistakes.length, 0);
  const score = userMsgs.length ? Math.round((correct / userMsgs.length) * 100) : null;

  // Time from the opening line to the last message, not to the click on "End"
  const first = convo.messages[0]?.createdAt;
  const last = convo.messages[convo.messages.length - 1]?.createdAt;
  const rawSec = first && last ? Math.round((new Date(last) - new Date(first)) / 1000) : 0;
  const durationSec = Math.min(Math.max(rawSec, 0), MAX_SESSION_SEC);

  const endedAt = new Date();
  const result = await Conversation.updateOne(
    { _id: convo._id, user: req.user._id, status: 'active' },
    { $set: { status: 'ended', endedAt, durationSec, score, mistakeCount } }
  );
  if (result.modifiedCount === 0) {
    throw httpError(409, 'This conversation was already ended');
  }

  const ended = {
    id: convo._id,
    status: 'ended',
    endedAt,
    durationSec,
    score,
    mistakeCount,
    messageCount: convo.messages.length,
    mode: convo.mode ?? 'scene',
  };
  if (!hasTurns(convo)) return res.json({ conversation: ended });

  // Interviews and debates also get a scorecard. The conversation is already ended and saved;
  // if the AI can't make the scorecard now, it can be retried with POST /:id/scorecard.
  let scorecard = null;
  let scorecardNote;
  if (!userMsgs.length) {
    scorecardNote = NOTHING_TO_SCORE[convo.mode];
  } else {
    try {
      scorecard = await makeScorecard(convo);
    } catch (err) {
      console.error(`Scorecard not made for an ended ${convo.mode} (${err.status ?? 'error'})`);
    }
    if (scorecard) await Conversation.updateOne({ _id: convo._id, user: req.user._id }, { $set: { scorecard } });
    else scorecardNote = SCORECARD_LATER;
  }
  res.json({ conversation: { ...ended, scorecard }, ...(scorecardNote && { scorecardNote }) });
});

// POST /api/conversations/:id/scorecard (try again when it couldn't be made at the end)
export const retryScorecard = asyncHandler(async (req, res) => {
  const convo = await findOwned(req);
  if (!hasTurns(convo)) throw httpError(409, 'Scorecards are only for interviews and debates');
  if (convo.status !== 'ended') throw httpError(409, `Finish the ${convo.mode} first`);
  if (convo.scorecard) return res.json({ scorecard: convo.scorecard }); // already made: no second AI call
  if (!learnerTurns(convo)) throw httpError(409, NOTHING_TO_SCORE[convo.mode]);

  const scorecard = await makeScorecard(convo);
  if (!scorecard) throw httpError(502, 'The AI sent an unexpected answer. Please try again.');
  await Conversation.updateOne({ _id: convo._id, user: req.user._id }, { $set: { scorecard } });
  res.json({ scorecard });
});

// ---------- change difficulty mid-conversation ----------

const difficultySchema = z.object({
  difficulty: z.enum(['friendly', 'neutral', 'tough'], {
    error: 'Difficulty must be friendly, neutral or tough',
  }),
});

// PATCH /api/conversations/:id/difficulty   (the "Make it easier / tougher" buttons)
export const changeDifficulty = asyncHandler(async (req, res) => {
  const { difficulty } = parse(difficultySchema, req.body);
  const convo = await findOwned(req);
  if (convo.status !== 'active') throw httpError(409, 'This conversation has ended');

  await Conversation.updateOne(
    { _id: convo._id, user: req.user._id, status: 'active' },
    { $set: { difficulty } }
  );
  res.json({ difficulty });
});

// ---------- history ----------

// GET /api/conversations?limit=20
export const listConversations = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
  const items = await Conversation.find({ user: req.user._id })
    .select('scenarioId title persona difficulty level status createdAt endedAt durationSec score mistakeCount mode modeConfig')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  res.json({ conversations: items });
});

// DELETE /api/conversations/:id (ended or still active). Stats, history and progress are
// worked out from the saved conversations, so it disappears from all of them too.
export const deleteConversation = asyncHandler(async (req, res) => {
  const convo = await findOwned(req);
  await convo.deleteOne();
  res.json({ deleted: true, id: String(convo._id) });
});
