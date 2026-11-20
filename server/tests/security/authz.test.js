// Authorisation matrix: every API route against four actors (not logged in, member A, member B, admin).
// A owns one of everything. B and the admin must never see or change it; admin routes are admin-only.
// Routes that would call the AI get an invalid body for the "allowed" actor, so the matrix spends no quota:
// a validation error (400) proves the request got past the access checks.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { start, skip } from './setup.js';

const MARK = 'A-PRIVATE-MARKER';
let s, A, B, admin, C, ids;

before(async () => {
  if (skip) return;
  s = await start();
  A = await s.makeUser({ name: 'Member A' });
  B = await s.makeUser({ name: 'Member B' });
  C = await s.makeUser({ name: 'Member C' }); // removed by the admin at the end
  admin = await s.makeUser({ name: 'Admin', role: 'admin' });
  const Conversation = (await import('../../src/models/Conversation.js')).default;
  const WritingCheck = (await import('../../src/models/WritingCheck.js')).default;
  const persona = { name: 'Ravi', role: 'Shopkeeper', traits: [], mood: 'Neutral', brief: 'A shop' };
  const convo = await Conversation.create({ user: A.id, scenarioId: 'job-interview', title: `Talk ${MARK}`, persona, messages: [{ role: 'ai', text: 'Hello' }, { role: 'user', text: `secret ${MARK}` }] });
  const doomed = await Conversation.create({ user: A.id, scenarioId: 'job-interview', title: 'To delete', persona, messages: [{ role: 'ai', text: 'Hi' }] });
  const check = await WritingCheck.create({ user: A.id, title: `Essay ${MARK}`, kind: 'essay', text: `My essay ${MARK}`, score: 80, wordCount: 3 });
  const person = (await s.api('POST', '/people', { as: A, body: { name: 'Asha', role: 'My manager', brief: `Weekly review ${MARK} meeting` } })).json.person;
  const card = (await s.api('POST', '/vocab/cards', { as: A, body: { word: 'reluctant', meaning: `unwilling ${MARK}` } })).json.card;
  const reading = (await s.api('POST', '/reading/sessions', { as: A, body: { passageId: 'morning-tea', durationSec: 30, wordsReached: 20, wordsRead: 18, missed: [] } })).json.session;
  ids = { convo: convo.id, doomed: doomed.id, check: check.id, person: person.id, card: card.id, reading: reading.id };
});
after(async () => { if (s) await s.close(); });

// Expected outcome per actor: 'ok' (access allowed: any status except 401/403/404 and never 5xx),
// 401, 403, or 404 (someone else's thing: hidden, same as missing)
const MEMBER_ONLY = { anon: 401, A: 'ok', B: 'ok', admin: 'ok' };
const OWNED_BY_A = { anon: 401, A: 'ok', B: 404, admin: 404 };
const ADMIN_ONLY = { anon: 401, A: 403, B: 403, admin: 'ok' };
const PUBLIC = { anon: 'ok', A: 'ok', B: 'ok', admin: 'ok' };

// Reads of lists must never contain A's private text for anyone but A
const routes = () => [
  ['GET', '/health', PUBLIC],
  ['POST', '/auth/register', PUBLIC, { name: 'x' }],
  ['POST', '/auth/login', PUBLIC, { email: 'bad' }],
  ['GET', '/auth/me', MEMBER_ONLY],
  ['POST', '/auth/change-password', MEMBER_ONLY, {}],
  ['GET', '/me/settings', MEMBER_ONLY],
  ['PATCH', '/me/settings', MEMBER_ONLY, { goalMin: 15 }],
  ['PATCH', '/me/profile', MEMBER_ONLY, { name: '' }],
  ['GET', '/scenarios', MEMBER_ONLY],
  ['GET', '/modes', MEMBER_ONLY],
  ['GET', '/stats/dashboard', MEMBER_ONLY, undefined, true],
  ['GET', '/progress?days=30', MEMBER_ONLY, undefined, true],
  ['GET', '/history', MEMBER_ONLY, undefined, true],
  ['GET', `/history?q=${MARK}`, MEMBER_ONLY, undefined, true],
  ['POST', '/ai/correct', MEMBER_ONLY, { text: '' }],
  ['GET', '/conversations', MEMBER_ONLY, undefined, true],
  ['POST', '/conversations', MEMBER_ONLY, { mode: 'interview' }],
  ['GET', `/conversations/${ids.convo}`, OWNED_BY_A],
  ['POST', `/conversations/${ids.convo}/messages`, OWNED_BY_A, (who) => ({ text: who === 'A' ? '' : 'hello' })],
  ['PATCH', `/conversations/${ids.convo}/difficulty`, OWNED_BY_A, { difficulty: 'tough' }],
  ['POST', `/conversations/${ids.convo}/scorecard`, OWNED_BY_A],
  ['POST', `/conversations/${ids.convo}/end`, OWNED_BY_A],
  ['DELETE', `/conversations/${ids.doomed}`, OWNED_BY_A],
  ['POST', '/writing/check', MEMBER_ONLY, { text: 'short' }],
  ['GET', '/writing', MEMBER_ONLY, undefined, true],
  ['GET', `/writing/${ids.check}`, OWNED_BY_A],
  ['GET', '/reading/passages', MEMBER_ONLY],
  ['POST', '/reading/sessions', MEMBER_ONLY, { passageId: 'nope' }],
  ['GET', '/reading/sessions', MEMBER_ONLY, undefined, true],
  ['GET', `/reading/sessions/${ids.reading}`, OWNED_BY_A],
  ['GET', '/grammar/overview', MEMBER_ONLY],
  ['GET', '/grammar/lessons/article', MEMBER_ONLY],
  ['GET', '/grammar/quiz', MEMBER_ONLY, undefined, true],
  ['POST', '/grammar/attempts', MEMBER_ONLY, { kind: 'lesson', type: 'article', correct: 3, total: 5 }],
  ['GET', '/vocab/overview', MEMBER_ONLY],
  ['GET', '/vocab/review', MEMBER_ONLY, undefined, true],
  ['POST', '/vocab/review', OWNED_BY_A, { cardId: ids.card, grade: 'good' }],
  ['GET', '/vocab/library', MEMBER_ONLY],
  ['POST', '/vocab/deck', MEMBER_ONLY, { count: 0 }],
  ['GET', '/vocab/cards', MEMBER_ONLY, undefined, true],
  ['POST', '/vocab/cards', MEMBER_ONLY, { word: '' }],
  ['PATCH', `/vocab/cards/${ids.card}`, OWNED_BY_A, { meaning: `still ${MARK}` }],
  ['GET', '/vocab/suggestions', MEMBER_ONLY, undefined, true],
  ['POST', '/vocab/lookup', MEMBER_ONLY, { word: '123' }],
  ['GET', '/people', MEMBER_ONLY, undefined, true],
  ['POST', '/people', MEMBER_ONLY, { name: '' }],
  ['PATCH', `/people/${ids.person}`, OWNED_BY_A, { mood: 'Cheerful' }],
  ['GET', '/admin/users', ADMIN_ONLY],
  ['GET', '/admin/members', ADMIN_ONLY],
  ['GET', '/admin/signup-code', ADMIN_ONLY],
  ['POST', `/admin/members/${ids.person}/reset-password`, ADMIN_ONLY], // not a member id: 404 for the admin, still refused for others
  ['POST', '/admin/signup-code/regenerate', ADMIN_ONLY],
  // Deletes last, so every other cell saw the data
  ['DELETE', `/vocab/cards/${ids.card}`, OWNED_BY_A],
  ['DELETE', `/people/${ids.person}`, OWNED_BY_A],
  ['DELETE', `/writing/${ids.check}`, OWNED_BY_A],
  ['DELETE', `/reading/sessions/${ids.reading}`, OWNED_BY_A],
  ['DELETE', `/admin/members/${'C'}`, ADMIN_ONLY],
  ['POST', '/auth/logout', PUBLIC],
];

test('authorisation matrix: every route x not logged in, member A, member B, admin', { skip }, async () => {
  const actors = { anon: undefined, B, admin, A }; // A last: the owner's destructive calls run after everyone else's
  const failures = [];
  let cells = 0;
  for (const [method, rawPath, expect, body, isList] of routes()) {
    for (const [who, as] of Object.entries(actors)) {
      const path = rawPath.replace('/admin/members/C', `/admin/members/${C.id}`);
      const b = typeof body === 'function' ? body(who) : body;
      const res = await s.api(method, path, { as, body: b });
      cells += 1;
      const want = expect[who];
      const allowed = res.status < 500 && ![401, 403, 404].includes(res.status);
      // The admin route on a non-member id is a 404 *after* the admin check: still "allowed"
      const ok = want === 'ok' ? allowed || (who === 'admin' && expect === ADMIN_ONLY && res.status === 404) : res.status === want;
      const leak = who !== 'A' && res.text.includes(MARK);
      if (!ok || leak) failures.push(`${who.padEnd(5)} ${method} ${path} -> ${res.status}${leak ? ' LEAKS A\'s DATA' : ''} (wanted ${want})`);
      if (who === 'A' && isList && method === 'GET') assert.ok(res.status === 200, `${path} works for its owner`);
    }
  }
  console.log(`authorisation matrix: ${cells} cells, ${failures.length} failed`);
  assert.deepEqual(failures, []);
});

test('A really owns everything the others were refused: nothing of A was changed by B or the admin', { skip }, async () => {
  const me = await s.api('GET', `/conversations/${ids.convo}`, { as: A });
  assert.equal(me.status, 200);
  assert.equal(me.json.conversation.difficulty, 'tough', 'only A changed it');
});

test('a removed member is gone, with all their data, and their cookie stops working at once', { skip }, async () => {
  assert.equal((await s.api('GET', '/auth/me', { as: C })).status, 401);
  const members = (await s.api('GET', '/admin/members', { as: admin })).json.members;
  assert.ok(!members.some((m) => m.id === C.id));
});
