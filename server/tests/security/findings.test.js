// One test per Step 18.5 finding (each reproduced the exploit before its fix), plus the attacks that
// were tried and found clean, kept so they stay clean.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { start, skip, SIGNUP } from './setup.js';

const DAILY = 5;
let s, A, B, admin;

before(async () => {
  if (skip) return;
  s = await start({ aiDailyLimit: DAILY });
  A = await s.makeUser({ name: 'Member A' });
  B = await s.makeUser({ name: 'Member B' });
  admin = await s.makeUser({ name: 'Admin', role: 'admin' });
});
after(async () => { if (s) await s.close(); });

// ---------------- Findings ----------------

test('F1 daily AI cap: one member cannot burn the shared quota; others are unaffected', { skip }, async () => {
  // Invalid words are refused before the AI, so this spends no quota, but each request still counts
  for (let i = 0; i < DAILY; i++) assert.equal((await s.api('POST', '/vocab/lookup', { as: B, body: { word: '123' } })).status, 400);
  const capped = await s.api('POST', '/vocab/lookup', { as: B, body: { word: '123' } });
  assert.equal(capped.status, 429);
  assert.match(capped.json.message, /midnight/i);
  assert.equal(capped.headers.get('retry-after'), null, 'no Retry-After: the client would replace the message with a generic countdown');
  // The cap covers every AI feature, not just one route
  for (const [path, body] of [['/ai/correct', { text: '' }], ['/writing/check', { text: 'x' }], ['/conversations', { mode: 'interview' }]]) {
    assert.equal((await s.api('POST', path, { as: B, body })).status, 429, path);
  }
  // Another member still has their own allowance
  assert.equal((await s.api('POST', '/vocab/lookup', { as: A, body: { word: '123' } })).status, 400);
  // Parallel requests can't squeeze past the cap
  const C = await s.makeUser();
  const burst = await Promise.all(Array.from({ length: 12 }, () => s.api('POST', '/vocab/lookup', { as: C, body: { word: '123' } })));
  assert.equal(burst.filter((r) => r.status === 400).length, DAILY);
});

test('F3 the 12-people limit holds under parallel requests', { skip }, async () => {
  const P = await s.makeUser();
  const body = (i) => ({ name: `Person ${i}`, role: 'A colleague', brief: 'We talk about the weekly report.' });
  await Promise.all(Array.from({ length: 25 }, (_, i) => s.api('POST', '/people', { as: P, body: body(i) })));
  const people = (await s.api('GET', '/people', { as: P })).json.people;
  assert.ok(people.length <= 12, `saved ${people.length} people`);
  assert.equal((await s.api('POST', '/people', { as: P, body: body(99) })).status, 409);
});

test('F4 vocabulary review spam: a card only moves when it is due (or just forgotten)', { skip }, async () => {
  const V = await s.makeUser();
  const card = (await s.api('POST', '/vocab/cards', { as: V, body: { word: 'diligent', meaning: 'careful and hard-working' } })).json.card;
  const review = (grade) => s.api('POST', '/vocab/review', { as: V, body: { cardId: card.id, grade } });
  assert.equal((await review('easy')).json.card.box, 2);
  const spam = await review('easy');
  assert.equal(spam.status, 409, 'not due: refused');
  const again = await review('again'); // not due either: refused, so "again" can't be used to reset and re-climb
  assert.equal(again.status, 409);
  // The app's own flow: a due card forgotten ("again") comes straight back in the session and can be graded
  const W = await s.makeUser();
  const c2 = (await s.api('POST', '/vocab/cards', { as: W, body: { word: 'candid', meaning: 'honest and direct' } })).json.card;
  const r = (grade) => s.api('POST', '/vocab/review', { as: W, body: { cardId: c2.id, grade } });
  assert.equal((await r('again')).json.card.box, 0);
  assert.equal((await r('good')).json.card.box, 1);
  assert.equal((await r('good')).status, 409);
  const { wordsLearned } = (await s.api('GET', '/progress?days=30', { as: W })).json.totals;
  assert.equal(wordsLearned, 0, 'nothing became "learned" by spamming');
});

test('F6 register refuses passwords bcrypt would silently cut (over 72 characters)', { skip }, async () => {
  const res = await s.api('POST', '/auth/register', { body: { name: 'Long', email: 'zz-long@example.com', password: 'x'.repeat(73), signupCode: SIGNUP } });
  assert.equal(res.status, 400);
  assert.match(res.json.message, /72/);
});

test('F7 tokens must be HS256: other algorithms and "none" are refused', { skip }, async () => {
  const secret = process.env.JWT_SECRET;
  const hs512 = jwt.sign({ id: A.id, v: 0 }, secret, { algorithm: 'HS512', expiresIn: '1h' });
  assert.equal((await s.api('GET', '/auth/me', { headers: { cookie: `token=${hs512}` } })).status, 401);
  const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ id: A.id, v: 0 })).toString('base64url')}.`;
  assert.equal((await s.api('GET', '/auth/me', { headers: { cookie: `token=${none}` } })).status, 401);
  const expired = jwt.sign({ id: A.id, v: 0, exp: Math.floor(Date.now() / 1000) - 10 }, secret, { algorithm: 'HS256' });
  assert.equal((await s.api('GET', '/auth/me', { headers: { cookie: `token=${expired}` } })).status, 401);
  assert.equal((await s.api('GET', '/auth/me', { as: A })).status, 200, 'a normal cookie still works');
});

// ---------------- Tried and found clean (kept as regressions) ----------------

test('mass assignment: extra fields never reach the database', { skip }, async () => {
  const reg = await s.api('POST', '/auth/register', { body: { name: 'Sneaky', email: 'zz-sneaky@example.com', password: 'Correct-Horse-9', signupCode: SIGNUP, role: 'admin', isAdmin: true, _id: '000000000000000000000001', tokenVersion: 99, mustChangePassword: false } });
  assert.equal(reg.status, 201);
  assert.equal(reg.json.user.role, 'member');
  assert.notEqual(reg.json.user.id, '000000000000000000000001');
  assert.equal((await s.api('PATCH', '/me/settings', { as: A, body: { goalMin: 15, role: 'admin' } })).status, 400);
  await s.api('PATCH', '/me/profile', { as: A, body: { name: 'Member A', role: 'admin', email: 'x@y.z' } });
  const me = (await s.api('GET', '/auth/me', { as: A })).json.user;
  assert.equal(me.role, 'member'); assert.equal(me.email, A.email);
  const person = (await s.api('POST', '/people', { as: A, body: { name: 'Meera', role: 'Neighbour', brief: 'We chat about the building.', user: B.id, _id: '000000000000000000000002' } })).json.person;
  assert.equal(person.user, A.id);
  await s.api('PATCH', `/people/${person.id}`, { as: A, body: { mood: 'Neutral', user: B.id } });
  assert.equal((await s.api('GET', '/people', { as: B })).json.people.length, 0);
  const card = (await s.api('POST', '/vocab/cards', { as: A, body: { word: 'prudent', meaning: 'careful with money', box: 5, dueAt: '2099-01-01', user: B.id, reps: 50 } })).json.card;
  assert.equal(card.box, 0); assert.equal(card.user, A.id); assert.equal(card.reps, 0);
  const sess = (await s.api('POST', '/reading/sessions', { as: A, body: { passageId: 'morning-tea', durationSec: 60, wordsReached: 30, wordsRead: 15, accuracy: 100, wpm: 999, user: B.id } })).json.session;
  assert.equal(sess.accuracy, 50); assert.equal(sess.wpm, 30); assert.equal(sess.user, A.id);
  const att = (await s.api('POST', '/grammar/attempts', { as: A, body: { kind: 'lesson', type: 'tense', correct: 2, total: 4, user: B.id } })).json.attempt;
  assert.equal(att.user, A.id);
});

test('NoSQL operators, regex tricks and odd types are refused or treated as plain text', { skip }, async () => {
  for (const body of [{ email: { $ne: null }, password: { $ne: null } }, { email: 'a@b.c', password: { $gt: '' } }, { email: ['a@b.c'], password: 'x' }, { $where: 'sleep(1000)' }]) {
    assert.equal((await s.api('POST', '/auth/login', { body })).status, 400, JSON.stringify(body));
  }
  for (const id of ['{"$ne":null}', '%7B%22%24ne%22%3Anull%7D', '000000000000000000000000', 'abc']) {
    assert.equal((await s.api('GET', `/conversations/${id}`, { as: A })).status, 404, id);
  }
  assert.equal((await s.api('POST', '/vocab/review', { as: A, body: { cardId: { $ne: null }, grade: 'good' } })).status, 400);
  // Query strings: Express 5 doesn't build objects from q[$ne]=…
  for (const q of ['q[$ne]=x', 'q[$regex]=.*', 'type[$ne]=x', 'limit[$gt]=0', 'q=.*', 'q=(a%2B)%2B$', 'q=' + 'a'.repeat(41)]) {
    const t = Date.now();
    const r = await s.api('GET', `/history?${q}`, { as: A });
    assert.ok([200, 400].includes(r.status), `${q}: ${r.status}`);
    assert.ok(Date.now() - t < 2000, `${q} took too long`);
  }
  // The search is literal: ".*" finds nothing, it doesn't match everything
  assert.equal((await s.api('GET', '/history?q=.*', { as: A })).json.items.length, 0);
});

test('oversized, deeply nested and wrongly typed bodies are refused, never a crash', { skip }, async () => {
  assert.equal((await s.api('POST', '/people', { as: A, raw: JSON.stringify({ brief: 'x'.repeat(1_100_000) }), headers: { 'content-type': 'application/json' } })).status, 413);
  const deep = '['.repeat(50_000) + ']'.repeat(50_000);
  const d = await s.api('POST', '/ai/correct', { as: A, raw: deep, headers: { 'content-type': 'application/json' } });
  assert.ok(d.status >= 400 && d.status < 500, `deep JSON: ${d.status}`);
  // (a non-AI route: each AI request counts against the daily cap, which this file sets to 5)
  for (const body of [{ word: ['a', 'b'], meaning: 'x'.repeat(5) }, { word: { a: 1 }, meaning: 'abcde' }, { word: 12, meaning: 'abcde' }, [1, 2], 'just a string', null]) {
    assert.equal((await s.api('POST', '/vocab/cards', { as: A, body })).status, 400, JSON.stringify(body));
  }
  assert.equal((await s.api('GET', '/health')).status, 200, 'still up');
});

test('settings refuse negative, huge and fractional numbers; limits clamp', { skip }, async () => {
  for (const body of [{ goalMin: -10 }, { goalMin: 1e9 }, { goalMin: 15.5 }, { goalMin: '15' }, { speechRate: 50 }, { speechRate: -1 }, { speechRate: '1' }, { voiceName: 'x'.repeat(101) }, {}]) {
    assert.equal((await s.api('PATCH', '/me/settings', { as: A, body })).status, 400, JSON.stringify(body));
  }
  for (const q of ['limit=-5', 'limit=1e9', 'limit=abc', 'limit=2.5']) {
    assert.ok([200, 400].includes((await s.api('GET', `/conversations?${q}`, { as: A })).status), q);
    assert.ok([200, 400].includes((await s.api('GET', `/history?${q}`, { as: A })).status), q);
  }
  assert.equal((await s.api('POST', '/grammar/attempts', { as: A, body: { kind: 'lesson', type: 'tense', correct: 9, total: 4 } })).status, 400);
  assert.equal((await s.api('POST', '/reading/sessions', { as: A, body: { passageId: 'morning-tea', durationSec: 1e9, wordsReached: 30, wordsRead: 15 } })).status, 400);
});

test('admin reset: temp password hashed, shown once, never cached; the forced change cannot be skipped', { skip }, async () => {
  const R = await s.makeUser({ name: 'Reset Me' });
  const reset = await s.api('POST', `/admin/members/${R.id}/reset-password`, { as: admin });
  assert.equal(reset.status, 200);
  assert.equal(reset.headers.get('cache-control'), 'no-store');
  const temp = reset.json.password;
  const stored = await s.User.findById(R.id).select('+password').lean();
  assert.notEqual(stored.password, temp); assert.match(stored.password, /^\$2[aby]\$12\$/);
  assert.equal((await s.api('GET', '/auth/me', { as: R })).status, 401, 'the old cookie ended');
  const login = await s.api('POST', '/auth/login', { body: { email: R.email, password: temp } });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const as = { cookie };
  for (const path of ['/conversations', '/history', '/vocab/cards', '/admin/members', '/people']) {
    assert.equal((await s.api('GET', path, { as })).status, 403, path);
  }
  assert.equal((await s.api('GET', '/auth/me', { as })).status, 200);
  const ch = await s.api('POST', '/auth/change-password', { as, body: { currentPassword: temp, newPassword: 'Brand-New-Pass-7' } });
  assert.equal(ch.status, 200);
  const after2 = { cookie: ch.headers.get('set-cookie').split(';')[0] };
  assert.equal((await s.api('GET', '/conversations', { as: after2 })).status, 200);
});

test('signup code: regenerating stops the old one at once; wrong codes are refused', { skip }, async () => {
  const old = (await s.api('GET', '/admin/signup-code', { as: admin })).json.code;
  const fresh = (await s.api('POST', '/admin/signup-code/regenerate', { as: admin })).json.code;
  assert.notEqual(old, fresh);
  const reg = (code, email) => s.api('POST', '/auth/register', { body: { name: 'New', email, password: 'Correct-Horse-9', signupCode: code } });
  assert.equal((await reg(old, 'zz-old-code@example.com')).status, 403);
  assert.equal((await reg(fresh.toUpperCase(), 'zz-upper@example.com')).status, 403);
  assert.equal((await reg(fresh, 'zz-new-code@example.com')).status, 201);
});

test('responses never carry password hashes, token versions or other people\'s emails', { skip }, async () => {
  const bodies = [
    (await s.api('GET', '/auth/me', { as: A })).text,
    (await s.api('PATCH', '/me/settings', { as: A, body: { goalMin: 20 } })).text,
    (await s.api('PATCH', '/me/profile', { as: A, body: { name: 'Member A' } })).text,
    (await s.api('GET', '/stats/dashboard', { as: A })).text,
    (await s.api('GET', '/admin/members', { as: admin })).text,
    (await s.api('GET', '/admin/users', { as: admin })).text,
  ];
  for (const b of bodies) {
    assert.doesNotMatch(b, /"password"\s*:\s*"\$2|tokenVersion|"__v"/);
  }
  assert.ok(!bodies[3].includes(B.email), 'the family list shows first names and minutes only');
});
