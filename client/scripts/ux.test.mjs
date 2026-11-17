// UX logic and components (Step 18.4). Run with: npm run test:ux
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { errorInfo, backoff } from '../src/lib/errors.js';
import { createTimer } from '../src/lib/timer.js';
import { validate } from '../src/lib/validate.js';
import { nextFocusIndex } from '../src/lib/focusTrap.js';
import { safeReturnPath } from '../src/lib/safeReturn.js';

const err = (status, data = {}, headers = {}) => ({ response: { status, data, headers } });
const TECH = /stack|exception|mongo|axios|ECONN|undefined|null|status code|at \w+ \(|Error:/i;

test('errorInfo maps each status to a friendly message and the right action', () => {
  const auth = errorInfo(err(401, { message: 'jwt expired' }));
  assert.equal(auth.kind, 'auth'); assert.equal(auth.action, 'login');
  const missing = errorInfo(err(404));
  assert.equal(missing.kind, 'notFound'); assert.equal(missing.action, 'home');
  const busy = errorInfo(err(503, { message: 'The AI is busy right now' }));
  assert.equal(busy.kind, 'busy'); assert.equal(busy.action, 'retry');
  const limited = errorInfo(err(429, { message: 'Too many requests' }, { 'retry-after': '90' }));
  assert.equal(limited.kind, 'rateLimit'); assert.equal(limited.action, 'retry');
  assert.equal(limited.retryAfter, 90); assert.match(limited.message, /2 minutes|a minute|90 seconds/);
  const offline = errorInfo({ request: {}, message: 'Network Error' });
  assert.equal(offline.kind, 'network'); assert.equal(offline.action, 'retry');
  assert.match(offline.message, /internet/i);
  const slow = errorInfo({ code: 'ECONNABORTED', request: {} });
  assert.equal(slow.kind, 'timeout'); assert.equal(slow.action, 'retry');
  for (const e of [auth, missing, busy, limited, offline, slow]) assert.doesNotMatch(e.message + e.title, TECH, `${e.kind}: ${e.message}`);
});

test('server faults never show server details; user-facing 4xx messages do show', () => {
  const crash = errorInfo(err(500, { message: 'MongoServerError: E11000 duplicate key at Model.save (/app/x.js:3)', stack: 'Error: ...' }));
  assert.equal(crash.kind, 'server'); assert.doesNotMatch(crash.message, TECH); assert.equal(crash.action, 'retry');
  const bad = errorInfo(err(400, { message: 'Name is required' }));
  assert.equal(bad.message, 'Name is required');
  const sneaky = errorInfo(err(400, { message: 'TypeError: Cannot read properties of undefined (reading x)' }));
  assert.doesNotMatch(sneaky.message, TECH, 'a technical-looking 4xx message is replaced');
  for (const leak of ['E11000 duplicate key error collection: speakup.users', 'Cast to ObjectId failed for value "x"', 'connect ETIMEDOUT 10.0.0.1:27017',
    'jwt malformed', 'Unexpected token u in JSON at position 0', 'Operation users.find() buffering timed out after 10000ms',
    'ENOENT C:\\app\\server\\x.js', 'see https://internal.example/x'])
    assert.doesNotMatch(errorInfo(err(400, { message: leak })).message, /E11000|ObjectId|ETIMEDOUT|jwt|JSON|buffering|ENOENT|https?:/, leak);
  const long = errorInfo(err(400, { message: 'x'.repeat(500) }));
  assert.ok(long.message.length <= 200, 'very long server text is replaced');
});

test('a wrong password and a closed signup keep their own (safe) words', () => {
  const wrong = errorInfo({ ...err(401, { message: 'Invalid email or password' }), config: { url: '/auth/login' } });
  assert.equal(wrong.message, 'Invalid email or password'); assert.notEqual(wrong.action, 'login');
  const closed = errorInfo(err(503, { message: 'Registration is currently closed' }));
  assert.equal(closed.message, 'Registration is currently closed');
  const aiBusy = errorInfo(err(503, { message: 'TypeError at x' }));
  assert.match(aiBusy.message, /try again/i, 'unsafe 503 text falls back to the friendly default');
});

test('retries back off, with a cap', () => {
  const delays = [0, 1, 2, 3, 4].map((a) => backoff(a));
  for (let i = 1; i < delays.length; i++) assert.ok(delays[i] >= delays[i - 1], 'grows');
  assert.ok(delays[0] >= 1000, 'first retry waits at least a second');
  assert.ok(Math.max(...delays) <= 30000, 'capped at 30s');
  assert.equal(backoff(0, 60), 60000, 'a server Retry-After wins');
});

test('toast timer pauses and resumes with the time left', () => {
  let now = 0;
  const timers = new Map(); let id = 0;
  const clock = { now: () => now, set: (fn, ms) => { timers.set(++id, { fn, at: now + ms }); return id; }, clear: (i) => timers.delete(i) };
  const advance = (ms) => { now += ms; for (const [i, t] of [...timers]) if (t.at <= now) { timers.delete(i); t.fn(); } };
  let done = 0;
  const t = createTimer(5000, () => done++, clock);
  advance(3000); t.pause();
  advance(10000); assert.equal(done, 0, 'paused: never fires');
  assert.equal(t.remaining(), 2000);
  t.resume(); advance(1999); assert.equal(done, 0);
  advance(1); assert.equal(done, 1, 'fires after the remaining 2s');
  t.pause(); t.resume(); advance(10000); assert.equal(done, 1, 'never fires twice');
});

test('form validators', () => {
  assert.equal(validate.email(''), 'Enter your email');
  assert.match(validate.email('abc'), /valid email/);
  assert.equal(validate.email(' me@home.in '), null);
  assert.match(validate.password('short'), /at least 8/);
  assert.match(validate.password('x'.repeat(73)), /72/);
  assert.equal(validate.password('Test12345'), null);
  assert.match(validate.password('me@home.in', { email: 'me@home.in' }), /email/);
  assert.equal(validate.name('  '), 'Enter your name');
  assert.match(validate.name('x'.repeat(41)), /40/);
  assert.equal(validate.signupCode(''), 'Enter the signup code from your family admin');
  assert.equal(validate.confirm('a', 'b'), "The two passwords don't match");
  assert.equal(validate.confirm('a', 'a'), null);
});

test('focus trap wraps at both ends', () => {
  assert.equal(nextFocusIndex(3, 2, false), 0, 'Tab on the last goes to the first');
  assert.equal(nextFocusIndex(3, 0, true), 2, 'Shift+Tab on the first goes to the last');
  assert.equal(nextFocusIndex(3, 1, false), null, 'in the middle the browser moves focus');
  assert.equal(nextFocusIndex(3, -1, false), 0, 'focus outside comes back in');
  assert.equal(nextFocusIndex(0, -1, false), null, 'nothing to focus');
});

test('return-after-login only allows same-origin relative paths', () => {
  assert.equal(safeReturnPath('/history?type=writing'), '/history?type=writing');
  assert.equal(safeReturnPath({ pathname: '/practice/abc', search: '?x=1', hash: '' }), '/practice/abc?x=1');
  for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '/login', '', null, undefined, 'history', ' /x', '/%2F%2Fevil.example'])
    assert.equal(safeReturnPath(bad), '/', String(bad));
});

// Components render (through Vite's SSR loader, so the real JSX and imports are used)
const CLIENT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { createServer } = await import('vite');
const vite = await createServer({ root: CLIENT, logLevel: 'error', server: { middlewareMode: true, hmr: false }, appType: 'custom', ssr: { external: ['react', 'react-dom', 'react-router', 'react-router-dom', '@phosphor-icons/react'] } });
after(() => vite.close());
const render = async (file, name, props) => {
  const { render: toHtml } = await vite.ssrLoadModule('/scripts/ssr-render.mjs');
  const mod = await vite.ssrLoadModule(file);
  return toHtml(mod[name] ?? mod.default, props);
};

test('ErrorState renders the friendly message, a Retry button and an alert role', async () => {
  const html = await render('/src/components/ErrorState.jsx', 'default', { error: { request: {} }, onRetry: () => {} });
  assert.match(html, /role="alert"/); assert.match(html, /internet/i); assert.match(html, />Try again</);
  const busy = await render('/src/components/ErrorState.jsx', 'default', { error: err(503), onRetry: () => {} });
  assert.match(busy, /Try again in \d+s/); assert.match(busy, /disabled/, 'busy: Try again waits before it can be pressed');
  const login = await render('/src/components/ErrorState.jsx', 'default', { error: err(401) });
  assert.match(login, /Log in/);
  const xss = await render('/src/components/ErrorState.jsx', 'default', { error: err(400, { message: '<img src=x onerror=alert(1)>' }) });
  assert.doesNotMatch(xss, /<img/, 'server text is rendered as text, never HTML');
});

test('EmptyState and skeletons render', async () => {
  const empty = await render('/src/components/EmptyState.jsx', 'default', { title: 'No sessions yet', text: 'Your practice shows up here.', action: { to: '/practice', label: 'Start practising' } });
  assert.match(empty, /No sessions yet/); assert.match(empty, /href="\/practice"/); assert.match(empty, /Start practising/);
  for (const name of ['ListSkeleton', 'CardsSkeleton', 'ChartsSkeleton', 'FormSkeleton', 'PageSkeleton']) {
    const html = await render('/src/components/Skeleton.jsx', name, {});
    assert.match(html, /aria-busy="true"/, name); assert.match(html, /Loading/, name);
  }
});
