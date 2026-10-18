import { z } from 'zod';
import Conversation from '../models/Conversation.js';
import WritingCheck from '../models/WritingCheck.js';
import ReadingSession from '../models/ReadingSession.js';
import asyncHandler from '../utils/asyncHandler.js';
import { parse } from '../utils/validate.js';
import { TZ, toMin, addDays } from '../utils/days.js';
import { startOfDay } from '../utils/srs.js';

const KIND_LABEL = { essay: 'Essay', email: 'Email', message: 'Message', other: 'Other' };
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A real calendar date: "2026-02-30" is not
const dateSchema = (name) =>
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${name} must be a date like 2026-10-18`)
    // zod still runs this when the format check above failed, so it must not throw on "yesterday"
    .refine((s) => {
      const t = Date.parse(`${s}T00:00:00Z`);
      return !/^\d{4}-\d{2}-\d{2}$/.test(s) || (!Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s);
    }, `${name} must be a real date`);

const querySchema = z
  .object({
    type: z.enum(['all', 'conversation', 'writing', 'reading'], { error: 'Type must be all, conversation, writing or reading' }).default('all'),
    q: z.string().trim().max(40, 'Keep the search under 40 characters').optional(),
    from: dateSchema('From').optional(),
    to: dateSchema('To').optional(),
    before: z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'Before must be a date and time').optional(),
    limit: z.coerce.number({ error: 'Limit must be a number from 1 to 50' }).int('Limit must be a number from 1 to 50')
      .min(1, 'Limit must be a number from 1 to 50').max(50, 'Limit must be a number from 1 to 50').default(20),
  })
  .refine((p) => !p.from || !p.to || p.from <= p.to, { error: 'From must be on or before To' });

// The calendar day 'YYYY-MM-DD' in India time, as a moment: 00:00 IST that day
const istMidnight = (key) => startOfDay(new Date(`${key}T12:00:00Z`), 0, TZ);

const toItem = {
  conversation: (c) => ({
    id: String(c._id),
    type: 'conversation',
    title: c.title || 'Conversation',
    subtitle: c.persona?.name ? `with ${c.persona.name}` : '',
    date: c.endedAt,
    minutes: Math.max(1, toMin(c.durationSec)),
    score: c.score ?? null,
    unit: '%',
  }),
  writing: (w) => ({
    id: String(w._id),
    type: 'writing',
    title: w.title?.trim() || `Untitled ${(w.kind || 'essay').toLowerCase()}`,
    subtitle: `${KIND_LABEL[w.kind] ?? 'Writing'} · ${w.wordCount} word${w.wordCount === 1 ? '' : 's'}`,
    date: w.createdAt,
    minutes: null,
    score: w.score ?? null,
    unit: '/100',
  }),
  reading: (r) => ({
    id: String(r._id),
    type: 'reading',
    title: `Read aloud: ${r.title}`,
    subtitle: `${r.accuracy}% accurate`,
    date: r.createdAt,
    minutes: Math.max(1, toMin(r.durationSec)),
    score: r.wpm,
    unit: 'wpm',
  }),
};

// GET /api/history?type=&q=&from=&to=&before=&limit=
// One list of everything you've done, newest first, a page at a time
export const getHistory = asyncHandler(async (req, res) => {
  const p = parse(querySchema, req.query);
  const user = req.user._id;

  // The time window: from 00:00 IST on "from" up to (not including) 00:00 IST the day after "to",
  // and strictly before the cursor
  const range = {};
  if (p.from) range.$gte = istMidnight(p.from);
  if (p.to) range.$lt = istMidnight(addDays(p.to, 1));
  if (p.before) {
    const b = new Date(p.before);
    range.$lt = range.$lt && range.$lt < b ? range.$lt : b;
  }
  const when = (field) => (Object.keys(range).length ? { [field]: range } : {});
  const re = p.q ? new RegExp(escapeRegex(p.q), 'i') : null;

  // Enough from each kind to fill the page, plus spare to settle ties on the same moment
  const take = p.limit + 25;
  const wants = (t) => p.type === 'all' || p.type === t;
  const [convs, checks, readings] = await Promise.all([
    wants('conversation')
      ? Conversation.find({
          user, status: 'ended', ...when('endedAt'),
          // Your own words only: what the AI partner said is never searched
          ...(re && { $or: [{ title: re }, { 'persona.name': re }, { messages: { $elemMatch: { role: 'user', text: re } } }] }),
        }).select('title persona.name endedAt durationSec score').sort({ endedAt: -1, _id: -1 }).limit(take).lean()
      : [],
    wants('writing')
      ? WritingCheck.find({ user, ...when('createdAt'), ...(re && { title: re }) })
          .select('title kind wordCount score createdAt').sort({ createdAt: -1, _id: -1 }).limit(take).lean()
      : [],
    wants('reading')
      ? ReadingSession.find({ user, ...when('createdAt'), ...(re && { title: re }) })
          .select('title durationSec wpm accuracy createdAt').sort({ createdAt: -1, _id: -1 }).limit(take).lean()
      : [],
  ]);

  const all = [
    ...convs.map(toItem.conversation),
    ...checks.map(toItem.writing),
    ...readings.map(toItem.reading),
  ].sort((a, b) => b.date - a.date || (a.id < b.id ? 1 : -1));

  // A page never splits items that share the same moment, so the "before" cursor
  // can't skip or repeat anything
  let n = Math.min(p.limit, all.length);
  while (n > 0 && n < all.length && all[n].date.getTime() === all[n - 1].date.getTime()) n += 1;
  const items = all.slice(0, n);
  const more = all.length > n || convs.length === take || checks.length === take || readings.length === take;

  res.json({ items, nextBefore: more && items.length ? items.at(-1).date.toISOString() : null });
});

