import rateLimit from 'express-rate-limit';

// Slows down password guessing: max 10 login/register attempts per 15 minutes per IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again in 15 minutes' },
});
