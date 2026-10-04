import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'token';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const cookieOptions = () => ({
  httpOnly: true, // JavaScript in the browser can't read it (protects against XSS)
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'lax',
  maxAge: SEVEN_DAYS_MS,
});

export const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

export const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

export const setAuthCookie = (res, userId) => {
  res.cookie(COOKIE_NAME, signToken(userId), cookieOptions());
};

export const clearAuthCookie = (res) => {
  const { maxAge, ...options } = cookieOptions();
  res.clearCookie(COOKIE_NAME, options);
};

export const getTokenFromRequest = (req) => req.cookies?.[COOKIE_NAME];
