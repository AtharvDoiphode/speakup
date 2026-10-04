import crypto from 'node:crypto';
import { z } from 'zod';
import User from '../models/User.js';
import { HttpError } from '../utils/httpError.js';
import { setAuthCookie, clearAuthCookie } from '../utils/token.js';

// { error: ... } is the message used when the field is missing or not text
const registerSchema = z.object({
  name: z
    .string({ error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be at most 50 characters'),
  email: z.email({ error: 'Enter a valid email' }),
  password: z
    .string({ error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be at most 100 characters'),
  signupCode: z.string({ error: 'Signup code is required' }).min(1, 'Signup code is required'),
});

const loginSchema = z.object({
  email: z.email({ error: 'Enter a valid email' }),
  password: z.string({ error: 'Password is required' }).min(1, 'Password is required'),
});

// Validates req.body and turns the first problem into a 400 error
const parse = (schema, body) => {
  const result = schema.safeParse(body ?? {});
  if (!result.success) throw new HttpError(400, result.error.issues[0].message);
  return result.data;
};

// Compares two strings in constant time, so attackers can't guess the code by timing
const safeEqual = (a, b) => {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
};

export const register = async (req, res) => {
  const { name, email, password, signupCode } = parse(registerSchema, req.body);

  const expectedCode = process.env.SIGNUP_CODE;
  if (!expectedCode) throw new HttpError(503, 'Registration is currently closed');
  if (!safeEqual(signupCode, expectedCode)) throw new HttpError(403, 'Invalid family signup code');

  if (await User.exists({ email: email.toLowerCase() })) {
    throw new HttpError(409, 'An account with this email already exists');
  }

  const user = await User.create({ name, email, password });
  setAuthCookie(res, user.id);
  res.status(201).json({ user });
};

export const login = async (req, res) => {
  const { email, password } = parse(loginSchema, req.body);

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  // Same message for both cases, so nobody can find out which emails are registered
  if (!user || !(await user.comparePassword(password))) {
    throw new HttpError(401, 'Invalid email or password');
  }

  setAuthCookie(res, user.id);
  res.json({ user });
};

export const logout = (req, res) => {
  clearAuthCookie(res);
  res.json({ message: 'Logged out' });
};

export const me = (req, res) => {
  res.json({ user: req.user });
};
