import AiUsage from '../models/AiUsage.js';
import { dayKey, DAY } from '../utils/days.js';
import { startOfDay } from '../utils/srs.js';

// The per-minute limit stops bursts; this stops one person using the whole family's free AI quota
// in a day. AI_DAILY_LIMIT requests per person per India-time day (default 100). Must run after `protect`.

/** Midnight (app time zone) after `now`: when today's allowance starts again. */
export const nextReset = (now = new Date()) => startOfDay(now, 1);

const inWords = (ms) => {
  const min = Math.max(1, Math.round(ms / 60_000));
  if (min < 55) return min === 1 ? '1 minute' : `${min} minutes`;
  const h = Math.round(min / 60);
  return h === 1 ? 'an hour' : `${h} hours`;
};

/** The friendly 429 message. Plain words and short numbers, so the app shows it as it is. */
export const dailyCapMessage = (limit, now = new Date()) =>
  `You've used today's ${limit} AI requests. They start again at midnight, in about ${inWords(nextReset(now) - now)}.`;

let indexReady; // the unique (user, day) index must exist before the first count, or a burst could make two documents

export async function aiDailyCap(req, res, next) {
  const limit = Number(process.env.AI_DAILY_LIMIT) || 100;
  const now = new Date();
  const key = { user: req.user._id, day: dayKey(now) };
  indexReady ??= AiUsage.init();
  await indexReady;

  // Counts up only while under the limit, in one atomic step, so parallel requests can't slip past it.
  // At the limit the filter matches nothing and the upsert hits the unique index (E11000).
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await AiUsage.updateOne(
        { ...key, count: { $lt: limit } },
        { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(now.getTime() + 3 * DAY) } },
        { upsert: true }
      );
      return next();
    } catch (err) {
      if (err.code !== 11000) throw err;
      // Two first-requests-of-the-day can also collide while still under the limit: try again
      const doc = await AiUsage.findOne(key).lean();
      if (doc && doc.count >= limit) break;
    }
  }
  res.status(429).json({ message: dailyCapMessage(limit, now) });
}
