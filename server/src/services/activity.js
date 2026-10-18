import Conversation from '../models/Conversation.js';
import ReadingSession from '../models/ReadingSession.js';
import { TZ } from '../utils/days.js';

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
