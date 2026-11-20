import rateLimit from 'express-rate-limit';
import { aiDailyCap } from './aiDailyCap.js';

// Slows down password guessing: max 20 login/register attempts per 15 minutes per IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again in 15 minutes' },
});

// Limits AI requests per logged-in user, to protect the shared free quota.
// Must run after `protect`, because it uses req.user.
const aiPerMinute = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 15,
  keyGenerator: (req) => req.user.id,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Slow down a little. Try again in a minute.' },
});

// Every AI route uses both: 15 a minute, and AI_DAILY_LIMIT a day (Express runs the list in order)
export const aiLimiter = [aiPerMinute, aiDailyCap];
