// Production setup (Step 17.1). Run with: npm test (in server/)
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import { parseEnv } from '../src/config/env.js';
import { cacheControlFor, isSpaRoute, healthBody, serveClient } from '../src/production.js';

const GOOD = {
  JWT_SECRET: 'x'.repeat(32),
  MONGODB_URI: 'mongodb+srv://u:p@cluster.example.net/speakup',
  GEMINI_API_KEY: 'test-gemini-key',
  ADMIN_EMAIL: 'admin@example.com',
  CLIENT_ORIGIN: 'https://speakup.example.com',
};

test('env: a good set passes and gets the same defaults as today', () => {
  const env = parseEnv(GOOD);
  assert.equal(env.JWT_SECRET, GOOD.JWT_SECRET);
  assert.equal(env.GEMINI_MODEL, 'gemini-3-flash-preview');
  assert.equal(env.GEMINI_FALLBACK_MODELS, 'gemini-3.1-flash-lite,gemini-3.5-flash-lite,gemini-3.1-flash-lite-preview');
  assert.equal(env.APP_TIMEZONE, 'Asia/Kolkata');
  assert.equal(env.PORT, 5000);
  assert.equal(env.NODE_ENV, 'development');
});

test('env: missing or short JWT_SECRET fails with a clear message', () => {
  assert.throws(() => parseEnv({ ...GOOD, JWT_SECRET: undefined }), /JWT_SECRET/);
  assert.throws(() => parseEnv({ ...GOOD, JWT_SECRET: 'short-secret' }), /JWT_SECRET.*32/);
  assert.throws(() => parseEnv({ ...GOOD, JWT_SECRET: ' '.repeat(40) }), /JWT_SECRET/);
});

test('env: each required variable is named when missing', () => {
  for (const key of ['MONGODB_URI', 'GEMINI_API_KEY', 'ADMIN_EMAIL', 'CLIENT_ORIGIN']) {
    assert.throws(() => parseEnv({ ...GOOD, [key]: undefined }), new RegExp(key), key);
    assert.throws(() => parseEnv({ ...GOOD, [key]: '' }), new RegExp(key), `${key} empty`);
  }
});

test('env: the older names MONGO_URI and CLIENT_URL still work', () => {
  const { MONGODB_URI, CLIENT_ORIGIN, ...rest } = GOOD;
  const env = parseEnv({ ...rest, MONGO_URI: MONGODB_URI, CLIENT_URL: CLIENT_ORIGIN });
  assert.equal(env.MONGODB_URI, MONGODB_URI);
  assert.equal(env.CLIENT_ORIGIN, CLIENT_ORIGIN);
});

test('env: the error never repeats a secret value', () => {
  const secret = 'leaky-but-short';
  assert.throws(() => parseEnv({ ...GOOD, JWT_SECRET: secret, GEMINI_API_KEY: '' }), (e) => !e.message.includes(secret));
});

test('env: a weak SIGNUP_CODE is refused; none at all is fine', () => {
  assert.throws(() => parseEnv({ ...GOOD, SIGNUP_CODE: 'family' }), /SIGNUP_CODE.*8/);
  assert.equal(parseEnv({ ...GOOD, SIGNUP_CODE: 'family-2026' }).SIGNUP_CODE, 'family-2026');
  assert.equal(parseEnv({ ...GOOD, SIGNUP_CODE: '' }).SIGNUP_CODE, undefined);
});

test('cache rules by file type', () => {
  const immutable = 'public, max-age=31536000, immutable';
  assert.equal(cacheControlFor('/assets/index-B2x9kQ.js'), immutable);
  assert.equal(cacheControlFor('/assets/index-Cq1a.css'), immutable);
  assert.equal(cacheControlFor('/assets/hanken-grotesk-latin-wght-normal-Dk1.woff2'), immutable);
  assert.equal(cacheControlFor('/index.html'), 'no-cache');
  assert.equal(cacheControlFor('/manifest.webmanifest'), 'no-cache');
  for (const f of ['/favicon.svg', '/favicon.ico', '/icon-192.png', '/apple-touch-icon.png', '/brand/logo.svg', '/og-image.png'])
    assert.equal(cacheControlFor(f), 'public, max-age=86400', f);
  // Windows paths from express.static work too
  assert.equal(cacheControlFor('C:\\app\\client\\dist\\assets\\x-1.js'), immutable);
  assert.equal(cacheControlFor('C:\\app\\client\\dist\\index.html'), 'no-cache');
});

test('the app fallback skips /api, files and non-GET requests', () => {
  assert.equal(isSpaRoute('GET', '/'), true);
  assert.equal(isSpaRoute('GET', '/history/123'), true);
  assert.equal(isSpaRoute('HEAD', '/practice'), true);
  assert.equal(isSpaRoute('GET', '/apiary'), true, 'only the /api segment is reserved');
  assert.equal(isSpaRoute('GET', '/api'), false);
  assert.equal(isSpaRoute('GET', '/api/nope'), false);
  assert.equal(isSpaRoute('GET', '/API/nope'), false);
  assert.equal(isSpaRoute('POST', '/history'), false);
  assert.equal(isSpaRoute('GET', '/assets/missing-abc.js'), false, 'a missing file is a 404, not the app');
  assert.equal(isSpaRoute('GET', '/.env'), false);
  assert.equal(isSpaRoute('GET', '/assets/index.js.map'), false);
});

test('health response shape', () => {
  assert.deepEqual(healthBody(1, 12.7), { status: 'ok', uptime: 12, db: 'connected' });
  assert.deepEqual(healthBody(0, 3), { status: 'degraded', uptime: 3, db: 'disconnected' });
  assert.deepEqual(healthBody(2, 3).db, 'connecting');
  assert.deepEqual(Object.keys(healthBody(1, 1)).sort(), ['db', 'status', 'uptime']);
});

// serveClient against a fake build folder: headers, fallback, 404s and path traversal
const dist = mkdtempSync(join(tmpdir(), 'speakup-dist-'));
mkdirSync(join(dist, 'assets'));
writeFileSync(join(dist, 'index.html'), '<!doctype html><div id="root"></div>');
writeFileSync(join(dist, 'assets', 'index-abc.js'), 'console.log(1)');
writeFileSync(join(dist, 'manifest.webmanifest'), '{}');
writeFileSync(join(dist, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
writeFileSync(join(dist, '.env'), 'SECRET=1');
const app = express();
app.use('/api', (req, res) => res.status(404).json({ message: 'Route not found' }));
serveClient(app, dist);
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
after(() => { server.close(); rmSync(dist, { recursive: true, force: true }); });

test('serveClient: files, fallback and 404s', async () => {
  const home = await fetch(`${base}/`);
  assert.equal(home.status, 200);
  assert.equal(home.headers.get('cache-control'), 'no-cache');
  assert.match(await home.text(), /id="root"/);

  const deep = await fetch(`${base}/history/123`);
  assert.equal(deep.status, 200);
  assert.equal(deep.headers.get('cache-control'), 'no-cache');
  assert.match(deep.headers.get('content-type'), /text\/html/);

  const js = await fetch(`${base}/assets/index-abc.js`);
  assert.equal(js.headers.get('cache-control'), 'public, max-age=31536000, immutable');
  assert.match(js.headers.get('content-type'), /javascript/);

  const manifest = await fetch(`${base}/manifest.webmanifest`);
  assert.match(manifest.headers.get('content-type'), /application\/manifest\+json/);
  assert.equal(manifest.headers.get('cache-control'), 'no-cache');

  const svg = await fetch(`${base}/favicon.svg`);
  assert.match(svg.headers.get('content-type'), /image\/svg\+xml/);

  const api = await fetch(`${base}/api/nope`);
  assert.equal(api.status, 404);
  assert.match(api.headers.get('content-type'), /json/);

  assert.equal((await fetch(`${base}/assets/missing.js`)).status, 404);
});

test('serveClient: no dotfiles and no path traversal', async () => {
  for (const p of ['/.env', '/..%2f..%2fpackage.json', '/%2e%2e/%2e%2e/package.json', '/assets/..%2f.env', '/..%5c..%5cpackage.json', '/%2e%2e%2f.env']) {
    const res = await fetch(`${base}${p}`);
    const body = await res.text();
    assert.doesNotMatch(body, /SECRET=1|"dependencies"/, p);
    assert.ok(res.status === 404 || res.status === 400 || /id="root"/.test(body), `${p}: ${res.status}`);
  }
});
