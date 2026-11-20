// Shared setup for the security regression suite: the real app, in-process, against a throwaway
// database that is dropped afterwards. Users are made directly in the database and their cookies are
// signed directly, so the suite never trips the login rate limit and never needs a password round trip.
//
// Database: TEST_MONGODB_URI, or the MONGODB_URI / MONGO_URI in server/.env with the database name
// swapped for a throwaway one. Without either, the suite is skipped (it never touches real data).
import { readFileSync, existsSync } from 'node:fs';
import dotenv from 'dotenv';

const envFile = new URL('../../.env', import.meta.url);
const local = existsSync(envFile) ? dotenv.parse(readFileSync(envFile)) : {};
const baseUri = process.env.TEST_MONGODB_URI || local.MONGODB_URI || local.MONGO_URI;
export const skip = baseUri ? false : 'no TEST_MONGODB_URI (or server/.env) to make a throwaway database';

export const SIGNUP = 'sectest-signup-code';
export const ADMIN_EMAIL = 'zz-sectest-admin@example.com';
export const ORIGIN = 'http://localhost';

/** Starts the app on a random port with a fresh database. Returns helpers; call close() at the end. */
export async function start({ aiDailyLimit = 1000 } = {}) {
  const uri = new URL(baseUri);
  uri.pathname = `/speakup_sectest_${process.pid}_${Date.now()}`;
  Object.assign(process.env, {
    NODE_ENV: 'test',
    MONGODB_URI: uri.toString(),
    JWT_SECRET: 'security-suite-secret-that-is-long-enough-1234567890',
    // Never a real key: if a test ever reached the AI by mistake it would fail, not spend quota
    GEMINI_API_KEY: 'not-a-real-key',
    ADMIN_EMAIL,
    CLIENT_ORIGIN: ORIGIN,
    SIGNUP_CODE: SIGNUP,
    AI_DAILY_LIMIT: String(aiDailyLimit),
  });
  const { loadEnv } = await import('../../src/config/env.js');
  loadEnv();
  const mongoose = (await import('mongoose')).default;
  await mongoose.connect(process.env.MONGODB_URI);
  const { default: app } = await import('../../src/app.js');
  const User = (await import('../../src/models/User.js')).default;
  const { signToken } = await import('../../src/utils/token.js');
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;

  /** A user straight in the database, with a ready cookie. */
  const makeUser = async ({ name = 'Member', email, role = 'member', password = 'Correct-Horse-9' } = {}) => {
    const user = await User.create({ name, email: email ?? `zz-${Math.random().toString(36).slice(2)}@example.com`, password, role });
    return { id: user.id, email: user.email, password, cookie: `token=${signToken(user)}`, user };
  };

  /** fetch against the app. `as` is a user from makeUser (or nothing for logged out). */
  const api = async (method, path, { as, body, headers = {}, raw } = {}) => {
    const res = await fetch(base + '/api' + path, {
      method,
      headers: { ...(as && { cookie: as.cookie }), ...(body !== undefined && { 'content-type': 'application/json' }), ...headers },
      body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not JSON */ }
    return { status: res.status, headers: res.headers, text, json };
  };

  const close = async () => {
    await new Promise((r) => server.close(r));
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  };

  return { base, api, makeUser, close, mongoose, User };
}
