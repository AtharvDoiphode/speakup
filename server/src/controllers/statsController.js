import Conversation from '../models/Conversation.js';
import ReadingSession from '../models/ReadingSession.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import { SCENARIOS } from '../data/scenarios.js';

const TZ = process.env.APP_TIMEZONE || 'Asia/Kolkata';
const DAY = 86_400_000;
const GOAL_MIN = 15;

const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const dayKey = (d) => dayFmt.format(new Date(d)); // 'YYYY-MM-DD' in India time
const keysBack = (n, now) => Array.from({ length: n }, (_, i) => dayKey(now - (n - 1 - i) * DAY)); // oldest → today
const toMin = (sec) => Math.round((sec || 0) / 60);

// GET /api/stats/dashboard
export const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const now = Date.now();
  const today = dayKey(now);
  const yesterday = dayKey(now - DAY);
  const since60 = new Date(now - 60 * DAY);
  const since14 = new Date(now - 14 * DAY);
  const since8 = new Date(now - 8 * DAY);
  // "This week" = the last 7 calendar days in India time, today included.
  // "Last week" = the 7 days before that. Everything below uses these same days,
  // so a week's count always equals the sum of its daily bars.
  const fortnight = keysBack(14, now);
  const weekKeys = fortnight.slice(7);
  const thisWeek = new Set(weekKeys);
  const lastWeek = new Set(fortnight.slice(0, 7));

  const [ended, readings, withMessages, familyRows, users] = await Promise.all([
    Conversation.find({ user: userId, status: 'ended', endedAt: { $gte: since60 } })
      .select('scenarioId title persona.name persona.role endedAt durationSec score')
      .sort({ endedAt: -1 })
      .lean(),
    ReadingSession.find({ user: userId, createdAt: { $gte: since60 } })
      .select('title createdAt durationSec wpm')
      .sort({ createdAt: -1 })
      .lean(),
    Conversation.find({ user: userId, 'messages.createdAt': { $gte: since14 } })
      .select('messages.role messages.mistakes messages.createdAt')
      .lean(),
    // Family minutes this week: ended conversations plus read-aloud sessions, grouped
    // by person and counted on the same India-time days as everything else
    Conversation.aggregate([
      { $match: { status: 'ended', endedAt: { $gte: since8 } } },
      { $project: { user: 1, durationSec: 1, at: '$endedAt' } },
      {
        $unionWith: {
          coll: ReadingSession.collection.name,
          pipeline: [
            { $match: { createdAt: { $gte: since8 } } },
            { $project: { user: 1, durationSec: 1, at: '$createdAt' } },
          ],
        },
      },
      { $project: { user: 1, durationSec: 1, day: { $dateToString: { format: '%Y-%m-%d', date: '$at', timezone: TZ } } } },
      { $match: { day: { $in: weekKeys } } },
      { $group: { _id: '$user', sec: { $sum: '$durationSec' } } },
    ]),
    User.find().select('name').lean(),
  ]);

  // Minutes per day and streak: conversations and read-aloud both count
  const secByDay = {};
  const activeDays = new Set();
  const addTime = (at, sec) => {
    const k = dayKey(at);
    secByDay[k] = (secByDay[k] || 0) + (sec || 0);
    activeDays.add(k);
  };
  for (const c of ended) addTime(c.endedAt, c.durationSec);
  for (const r of readings) addTime(r.createdAt, r.durationSec);
  const last7 = keysBack(7, now).map((date) => ({ date, minutes: toMin(secByDay[date]), done: activeDays.has(date) }));

  let streak = 0;
  let cursor = activeDays.has(today) ? now : now - DAY; // today not done yet doesn't break the streak
  while (activeDays.has(dayKey(cursor))) {
    streak += 1;
    cursor -= DAY;
  }

  // Recurring mistakes: this week vs the week before
  const byType = {};
  for (const c of withMessages) {
    for (const m of c.messages) {
      if (m.role !== 'user' || !m.mistakes?.length) continue;
      const t = new Date(m.createdAt).getTime();
      const k = dayKey(t);
      if (!thisWeek.has(k) && !lastWeek.has(k)) continue;
      for (const x of m.mistakes) {
        const g = (byType[x.type] ??= {
          type: x.type, count: 0, prevCount: 0,
          perDay: Object.fromEntries(weekKeys.map((d) => [d, 0])),
          example: null, exampleAt: 0,
        });
        if (thisWeek.has(k)) {
          g.count += 1;
          g.perDay[k] += 1;
          if (t >= g.exampleAt) {
            g.example = { wrong: x.wrong, right: x.right };
            g.exampleAt = t;
          }
        } else {
          g.prevCount += 1;
        }
      }
    }
  }
  const mistakes = Object.values(byType)
    .filter((g) => g.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((g) => ({ type: g.type, count: g.count, prevCount: g.prevCount, daily: weekKeys.map((d) => g.perDay[d]), example: g.example }));

  // Family: first names and minutes only
  const secByUser = Object.fromEntries(familyRows.map((r) => [String(r._id), r.sec]));
  const family = users
    .map((u) => ({
      name: (u.name || '').trim().split(/\s+/)[0] || 'Member',
      minutes: toMin(secByUser[String(u._id)]),
      isMe: String(u._id) === String(userId),
    }))
    .sort((a, b) => b.minutes - a.minutes);

  // Last sessions: the newest 3 of both kinds together
  const recent = [
    ...ended.slice(0, 3).map((c) => ({
      id: c._id,
      type: 'conversation',
      title: c.title,
      with: [c.persona?.name, c.persona?.role].filter(Boolean).join(', '),
      endedAt: c.endedAt,
      minutes: Math.max(1, toMin(c.durationSec)),
      score: c.score,
      unit: '%',
    })),
    ...readings.slice(0, 3).map((r) => ({
      id: r._id,
      type: 'reading',
      title: `Read aloud: ${r.title}`,
      with: 'Read-aloud coach',
      endedAt: r.createdAt,
      minutes: Math.max(1, toMin(r.durationSec)),
      score: r.wpm,
      unit: 'wpm',
    })),
  ]
    .sort((a, b) => new Date(b.endedAt) - new Date(a.endedAt))
    .slice(0, 3);

  // Today's challenge: same all day, different each day, never the scene you just did.
  // Picked from the full list, and moved on by one only if it equals the last scene,
  // so finishing some other scene during the day doesn't change it.
  const seed = [...`${today}:${userId}`].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  let pick = seed % SCENARIOS.length;
  if (SCENARIOS[pick].id === ended[0]?.scenarioId) pick = (pick + 1) % SCENARIOS.length;
  const s = SCENARIOS[pick];
  const challenge = {
    scenarioId: s.id, title: s.title, category: s.category, who: s.who, role: s.role,
    minutes: s.minutes, brief: s.brief, focusType: mistakes[0]?.type ?? null,
  };

  res.json({
    goalMin: GOAL_MIN,
    today: { minutes: toMin(secByDay[today]), yesterdayMinutes: toMin(secByDay[yesterday]) },
    streak,
    last7,
    mistakes,
    family,
    recent,
    challenge,
    hasSessions: ended.length + readings.length > 0,
  });
});