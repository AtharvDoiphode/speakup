import { Router } from 'express';
import { z } from 'zod';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { parse } from '../utils/validate.js';
import { HttpError } from '../utils/httpError.js';

const SETTING_KEYS = ['goalMin', 'voiceName', 'speechRate', 'defaultDifficulty'];

// Only these fields can be changed; anything else is refused (strict)
const settingsSchema = z
  .object({
    goalMin: z.union([z.literal(10), z.literal(15), z.literal(20), z.literal(30)], { error: 'Daily goal must be 10, 15, 20 or 30 minutes' }),
    voiceName: z.string({ error: 'Voice must be text' }).trim().max(100, 'Voice name is too long'),
    speechRate: z.number({ error: 'Speech speed must be a number' }).min(0.7, 'Speech speed must be between 0.7 and 1.3').max(1.3, 'Speech speed must be between 0.7 and 1.3'),
    defaultDifficulty: z.enum(['friendly', 'neutral', 'tough'], { error: 'Difficulty must be friendly, neutral or tough' }),
  })
  .partial()
  .refine((b) => Object.keys(b).length > 0, { error: 'Send a setting to change' });

const profileSchema = z.object({
  name: z.string({ error: 'Name is required' }).trim().min(1, 'Name is required').max(40, 'Name must be at most 40 characters'),
});

const router = Router();
router.use(protect);

// GET /api/me/settings
router.get('/settings', (req, res) => {
  res.json({ settings: req.user.settings });
});

// PATCH /api/me/settings
router.patch('/settings', async (req, res) => {
  // Only these fields can be changed: anything else (role, mustChangePassword…) is refused
  if (Object.keys(req.body ?? {}).some((k) => !SETTING_KEYS.includes(k))) {
    throw new HttpError(400, 'Only goalMin, voiceName, speechRate and defaultDifficulty can be changed');
  }
  const body = parse(settingsSchema, req.body ?? {});
  const $set = Object.fromEntries(Object.entries(body).map(([k, v]) => [`settings.${k}`, v]));
  const user = await User.findByIdAndUpdate(req.user._id, { $set }, { new: true, runValidators: true });
  res.json({ settings: user.settings, user });
});

// PATCH /api/me/profile
router.patch('/profile', async (req, res) => {
  const { name } = parse(profileSchema, req.body ?? {});
  const user = await User.findByIdAndUpdate(req.user._id, { $set: { name } }, { new: true, runValidators: true });
  res.json({ user });
});

export default router;
