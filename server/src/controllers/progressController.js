import { z } from 'zod';
import Conversation from '../models/Conversation.js';
import WritingCheck from '../models/WritingCheck.js';
import ReadingSession from '../models/ReadingSession.js';
import GrammarAttempt from '../models/GrammarAttempt.js';
import VocabCard from '../models/VocabCard.js';
import asyncHandler from '../utils/asyncHandler.js';
import { parse } from '../utils/validate.js';
import { TZ, dayKey, keysBack, toMin, streaks } from '../utils/days.js';
import { startOfDay } from '../utils/srs.js';
import { activeDayKeys } from '../services/activity.js';

const daysSchema = z.enum(['7', '30', '90'], { error: 'Days must be 7, 30 or 90' });
const LEARNED_BOX = 3;
const TOP_TYPES = 6;

const avg = (list) => (list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : null);
const perSession = (convs) =>
  convs.length ? Math.round((convs.reduce((n, c) => n + (c.mistakeCount || 0), 0) / convs.length) * 10) / 10 : null;

// GET /api/progress?days=30
// "This period" is the last N India-time days, today included; "previous" is the N days before.
export const getProgress = asyncHandler(async (req, res) => {
  const days = Number(req.query.days === undefined ? '30' : parse(daysSchema, String(req.query.days)));
  const user = req.user._id;
  const now = new Date();
  const keys = keysBack(days, now.getTime());
  const start = startOfDay(now, -(days - 1), TZ); // 00:00 IST on the first day shown
  const prevStart = startOfDay(now, -(2 * days - 1), TZ); // and the period before it
  const inRange = (d) => d >= start;

  const [convs, spoken, checks, readings, grammarRounds, wordsLearned, active] = await Promise.all([
    Conversation.find({ user, status: 'ended', endedAt: { $gte: prevStart } })
      .select('endedAt durationSec score mistakeCount').lean(),
    // Mistakes are counted on the day they were made, as on the Dashboard
    Conversation.aggregate([
      { $match: { user, 'messages.createdAt': { $gte: prevStart } } },
      { $unwind: '$messages' },
      { $match: { 'messages.role': 'user', 'messages.createdAt': { $gte: prevStart } } },
      { $unwind: '$messages.mistakes' },
      { $project: { _id: 0, at: '$messages.createdAt', type: '$messages.mistakes.type' } },
    ]),
    WritingCheck.find({ user, createdAt: { $gte: prevStart } })
      .select('createdAt score errorsPer100 mistakes.type').sort({ createdAt: 1 }).lean(),
    ReadingSession.find({ user, createdAt: { $gte: prevStart } })
      .select('createdAt durationSec wpm accuracy').sort({ createdAt: 1 }).lean(),
    GrammarAttempt.countDocuments({ user, createdAt: { $gte: start } }),
    VocabCard.countDocuments({ user, box: { $gte: LEARNED_BOX } }),
    activeDayKeys(user),
  ]);

  const mistakes = [
    ...spoken,
    ...checks.flatMap((c) => (c.mistakes ?? []).map((m) => ({ at: c.createdAt, type: m.type }))),
  ];

  // ---- the daily series (every day present, quiet days as zeros) ----
  const byDay = Object.fromEntries(keys.map((k) => [k, { sec: 0, sessions: 0, scores: [], mistakes: 0 }]));
  const bucket = (at) => byDay[dayKey(at)];
  for (const c of convs) {
    const b = inRange(c.endedAt) && bucket(c.endedAt);
    if (!b) continue;
    b.sec += c.durationSec || 0;
    b.sessions += 1;
    if (c.score != null) b.scores.push(c.score);
  }
  for (const r of readings) {
    const b = inRange(r.createdAt) && bucket(r.createdAt);
    if (!b) continue;
    b.sec += r.durationSec || 0;
    b.sessions += 1;
  }
  for (const w of checks) {
    const b = inRange(w.createdAt) && bucket(w.createdAt);
    if (!b) continue;
    b.sessions += 1;
    if (w.score != null) b.scores.push(w.score);
  }
  for (const m of mistakes) {
    const b = inRange(m.at) && bucket(m.at);
    if (b) b.mistakes += 1;
  }
  const series = keys.map((date) => {
    const b = byDay[date];
    return { date, minutes: toMin(b.sec), sessions: b.sessions, avgScore: avg(b.scores), mistakes: b.mistakes };
  });

  // ---- totals ----
  const curConvs = convs.filter((c) => inRange(c.endedAt));
  const prevConvs = convs.filter((c) => !inRange(c.endedAt));
  const curReadings = readings.filter((r) => inRange(r.createdAt));
  const curChecks = checks.filter((w) => inRange(w.createdAt));
  const { streak, bestStreak } = streaks(active, dayKey(now));
  const totals = {
    minutes: series.reduce((n, d) => n + d.minutes, 0),
    conversations: curConvs.length,
    writingChecks: curChecks.length,
    readingSessions: curReadings.length,
    grammarRounds,
    wordsLearned, // right now, not just this period
    streak,
    bestStreak, // across all time
  };

  // ---- trend: this period against the one before (conversations) ----
  const scoresOf = (list) => list.map((c) => c.score).filter((s) => s != null);
  const trend = {
    avgScore: { current: avg(scoresOf(curConvs)), previous: avg(scoresOf(prevConvs)) },
    mistakesPerSession: { current: perSession(curConvs), previous: perSession(prevConvs) },
  };

  // ---- mistakes by type, with the change ----
  const types = {};
  for (const m of mistakes) {
    const t = (types[m.type || 'other'] ??= { type: m.type || 'other', count: 0, previous: 0 });
    if (inRange(m.at)) t.count += 1;
    else t.previous += 1;
  }
  const mistakesByType = Object.values(types)
    .map((t) => ({ ...t, change: t.count - t.previous }))
    .sort((a, b) => b.count - a.count || b.previous - a.previous || a.type.localeCompare(b.type))
    .slice(0, TOP_TYPES);

  res.json({
    days,
    series,
    totals,
    trend,
    mistakesByType,
    writing: curChecks.map((w) => ({ date: w.createdAt, score: w.score, errorsPer100: w.errorsPer100 })),
    reading: curReadings.map((r) => ({ date: r.createdAt, wpm: r.wpm, accuracy: r.accuracy })),
  });
});
