import rateLimit from 'express-rate-limit';

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
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 15,
  keyGenerator: (req) => req.user.id,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Slow down a little. Try again in a minute.' },
});
