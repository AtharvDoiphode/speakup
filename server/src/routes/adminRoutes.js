import crypto from 'node:crypto';
import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import WritingCheck from '../models/WritingCheck.js';
import ReadingSession from '../models/ReadingSession.js';
import GrammarAttempt from '../models/GrammarAttempt.js';
import VocabCard from '../models/VocabCard.js';
import CustomPerson from '../models/CustomPerson.js';
import { getSignupCode, setSignupCode } from '../models/AppSettings.js';
import { weekSecondsByUser } from '../services/activity.js';
import { toMin } from '../utils/days.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { HttpError } from '../utils/httpError.js';

// Everything a person owns, removed with them
const OWNED = [Conversation, WritingCheck, ReadingSession, GrammarAttempt, VocabCard, CustomPerson];

// No 0/O, 1/l/I: easy to read out to a family member
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const tempPassword = (n = 10) => Array.from({ length: n }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('');

const WORDS = ['mango', 'chai', 'kite', 'river', 'lotus', 'tiger', 'monsoon', 'peacock', 'banyan', 'jasmine', 'cricket', 'garden',
  'rocket', 'pebble', 'sunset', 'lantern', 'coconut', 'parrot', 'meadow', 'harbour', 'cedar', 'falcon', 'saffron', 'thunder'];
const newCode = () => `${WORDS[crypto.randomInt(WORDS.length)]}-${WORDS[crypto.randomInt(WORDS.length)]}-${crypto.randomInt(1000, 10000)}`;

const findMember = async (id) => {
  const user = isValidObjectId(id) ? await User.findById(id) : null;
  if (!user) throw new HttpError(404, 'Member not found');
  return user;
};

// The most recent thing each person did, across everything they can do
async function lastActiveByUser() {
  const latest = (Model, field) => Model.aggregate([{ $group: { _id: '$user', at: { $max: `$${field}` } } }]);
  const lists = await Promise.all([
    latest(Conversation, 'updatedAt'), latest(WritingCheck, 'createdAt'), latest(ReadingSession, 'createdAt'),
    latest(GrammarAttempt, 'createdAt'), latest(VocabCard, 'lastReviewedAt'),
  ]);
  const out = {};
  for (const r of lists.flat()) {
    const k = String(r._id);
    if (r.at && (!out[k] || r.at > out[k])) out[k] = r.at;
  }
  return out;
}

const router = Router();

// Every route in this file needs a logged-in admin
router.use(protect, adminOnly);

// GET /api/admin/users: list all users, newest first (passwords are never selected)
router.get('/users', async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ users });
});

// GET /api/admin/members: everyone, with when they joined, last practised and minutes this week
router.get('/members', async (req, res) => {
  const [users, weekSec, lastActive] = await Promise.all([
    User.find().sort({ createdAt: 1 }).lean(),
    weekSecondsByUser(),
    lastActiveByUser(),
  ]);
  res.json({
    members: users.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      role: u.role,
      joined: u.createdAt,
      lastActive: lastActive[String(u._id)] ?? null,
      minutesThisWeek: toMin(weekSec[String(u._id)]),
      mustChangePassword: Boolean(u.mustChangePassword),
      isMe: String(u._id) === String(req.user._id),
    })),
  });
});

// POST /api/admin/members/:id/reset-password: a temporary password, shown once and never logged
router.post('/members/:id/reset-password', async (req, res) => {
  const user = await findMember(req.params.id);
  const password = tempPassword();
  user.password = password; // hashed by the model
  user.mustChangePassword = true;
  await user.save();
  res.json({ password, member: { id: user.id, name: user.name } });
});

// DELETE /api/admin/members/:id: the person and everything they made
router.delete('/members/:id', async (req, res) => {
  const user = await findMember(req.params.id);
  if (String(user._id) === String(req.user._id)) throw new HttpError(409, "You can't remove yourself");
  if (user.role === 'admin' && (await User.countDocuments({ role: 'admin' })) <= 1) {
    throw new HttpError(409, "You can't remove the last admin");
  }
  await Promise.all(OWNED.map((Model) => Model.deleteMany({ user: user._id })));
  await user.deleteOne();
  res.json({ deleted: true, id: user.id });
});

// GET /api/admin/signup-code
router.get('/signup-code', async (req, res) => {
  res.json({ code: await getSignupCode() });
});

// POST /api/admin/signup-code/regenerate: the old code stops working at once
router.post('/signup-code/regenerate', async (req, res) => {
  res.json({ code: await setSignupCode(newCode()) });
});

export default router;
