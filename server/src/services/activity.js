import Conversation from '../models/Conversation.js';
import ReadingSession from '../models/ReadingSession.js';
import { TZ, keysBack } from '../utils/days.js';

// Everyone's practice seconds this week (the last 7 India-time days, today included):
// ended conversations plus read-aloud, the same days as the Dashboard. Returns { userId: seconds }.
export async function weekSecondsByUser(now = Date.now()) {
  const weekKeys = keysBack(7, now);
  const since8 = new Date(now - 8 * 86_400_000);
  const rows = await Conversation.aggregate([
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
  ]);
  return Object.fromEntries(rows.map((r) => [String(r._id), r.sec]));
}

// Every India-time day on which this person finished a conversation or a read-aloud,
// across all time. Streaks are built from this (same rule as the Dashboard has always used).
export async function activeDayKeys(userId) {
  const rows = await Conversation.aggregate([
    { $match: { user: userId, status: 'ended', endedAt: { $ne: null } } },
    { $project: { _id: 0, at: '$endedAt' } },
    {
      $unionWith: {
        coll: ReadingSession.collection.name,
        pipeline: [{ $match: { user: userId } }, { $project: { _id: 0, at: '$createdAt' } }],
      },
    },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$at', timezone: TZ } } } },
  ]);
  return new Set(rows.map((r) => r._id));
}
