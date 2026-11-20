# Security

SpeakUp is a small family app for practising spoken English with an AI tutor. It runs as one Node.js (Express) service that serves both the API and the React app, with MongoDB Atlas for data and Google Gemini for the AI. This document describes what it protects, how, what a white-box security review found, and what is still open.

## Threat model

**Assets**
- Members' private practice data: conversation transcripts, essays, reading sessions, vocabulary, the custom people they describe (who can be real colleagues or relatives).
- Accounts: emails, password hashes, login sessions, the admin role.
- The family's shared free Gemini quota, and the signup code that gates new accounts.

**Actors**
- Anyone on the internet (no account).
- A family member, including a curious or careless one who uses the API directly instead of the app.
- The admin (manages members, but should not read their private practice).
- The AI model itself, treated as untrusted output: it can be steered by what learners type.

**Trust boundaries**
1. Browser → API: every request is untrusted input (body, query, path, cookies, headers).
2. API → Gemini: learner text goes into prompts; whatever comes back is validated before use.
3. API → MongoDB: queries only ever use validated values, scoped to the logged-in user.
4. Render's proxy → app: one trusted proxy hop supplies the client IP.

## What is protected, and how

| Area | Protection |
|---|---|
| **Authentication** | bcrypt (cost 12) password hashes, never returned by any response. JWT in an `HttpOnly; Secure; SameSite=Lax` cookie, HS256 only, 7-day expiry. Each token carries the account's version number, so a password change or an admin reset ends every older session at once. Equal-time login for known and unknown emails. Registration needs the family signup code (compared in constant time); the first `ADMIN_EMAIL` registration becomes admin, never a later one. |
| **Authorisation** | Every data query is scoped to the logged-in user (`{ _id, user }`); someone else's item and a missing item give the same 404. Admin routes check the role server-side. After an admin password reset, every route except changing the password is blocked. Removing a member deletes all their data, and their cookie stops working immediately. |
| **Input validation** | Every body and query is checked with zod schemas that whitelist fields (no mass assignment) and types (no NoSQL operators). The user search escapes regex and is capped at 40 characters. Bodies are capped at 1 MB; ids are checked before any query. |
| **AI safety** | Learner text and everything learners type into prompts (job titles, debate topics, custom people) goes inside tags that learners cannot open or close, with instructions to treat it as data. Every AI reply is validated against a schema; a malformed one becomes a friendly error and is never saved. Scores and "correct" flags are computed by the server, not trusted from the AI. Logs record only which fields came back, never learner text or AI replies. |
| **Cost and abuse** | 15 AI requests a minute and `AI_DAILY_LIMIT` (default 100) a day per member, counted atomically in MongoDB so parallel requests can't slip past. Login, register and password change: 20 tries per 15 minutes per IP. Conversations are capped at 100 messages; custom people at 12 (enforced even for parallel requests). |
| **Browser** | React renders all text as text (no `dangerouslySetInnerHTML` anywhere). Strict Content-Security-Policy (`script-src 'self'`, no inline script or eval, `frame-ancestors 'none'`), HSTS, `nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy` allowing only the microphone. State-changing requests from another site's `Origin` are refused (CSRF). API responses are `no-store`. |
| **Secrets and operations** | All settings validated at startup; the server refuses to start with a missing or short (<32 character) `JWT_SECRET`. No secrets in the repo or its history (scanned). Production logs are one line per request: method, path, status and time only. No source maps in production. Error responses never include stack traces or internal messages. |

## Security review (Step 18.5)

A white-box penetration test of the production build: an authorisation matrix of **58 routes × 4 actors (232 cells, 0 failures)**, mass-assignment and NoSQL-injection attempts on every create and update route, live prompt-injection attempts against the real model on every AI feature, rendering of hostile HTML in AI and user text, session and password-reset abuse, race conditions, and a dependency audit. Every finding has a regression test in `server/tests/security/`.

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | No daily AI limit: one member could use about 21,000 AI requests a day (15 a minute, all day) and exhaust the family's free quota | Medium | Fixed: per-member daily cap (`AI_DAILY_LIMIT`), with a message saying when it resets |
| 2 | The grammar-correction endpoint put learner text into the prompt without the tag guard the other AI paths used, so a learner could "close" the data tag | Low | Fixed: one shared helper wraps learner text everywhere |
| 3 | The 12-custom-people limit could be bypassed with parallel requests (20 saved) | Low | Fixed: an over-limit save is undone in creation order |
| 4 | Grading the same flashcard repeatedly faked "learned" words | Low | Fixed: a card moves only when due, or straight after "Again" |
| 5 | A broken `.docx` upload showed the parser's internal error text, with a library URL | Low | Fixed: a plain message |
| 6 | Registration accepted passwords over 72 characters, which bcrypt silently cuts | Low | Fixed: 72 maximum, as in the app and on password change |
| 7 | The JWT algorithm wasn't pinned (another HMAC algorithm with the same secret was accepted) | Info | Fixed: HS256 only |
| 8 | An unused server dependency (`google-auth-library`) | Info | Fixed: removed |
| 9 | Read-aloud minutes and grammar quiz scores are self-reported by the browser, so a member could inflate their own minutes on the family board | Low | Not fixed: speech is measured in the browser, so the server can't verify it. Values are range-checked, and this only affects the member's own figures |
| 10 | No per-account lockout after failed logins | Low | Not fixed, by design: a per-account lockout would let anyone lock family members out. Per-IP limits plus bcrypt cost 12 and an 8-character minimum make guessing slow |
| 11 | Logging out ends only that device's session | Info | Not fixed: changing the password ends all sessions |
| 12 | The admin sees members' names, emails, joining date, last activity and weekly minutes | Info | Intended. The admin cannot read anyone's conversations, writing or other practice (verified in the matrix) |
| 13 | Ending an interview or debate makes one scorecard AI call that the daily cap doesn't count | Info | Not fixed: at most one per conversation, and starting conversations is capped |

The 17.1 production-hardening review (sessions surviving a password change, CSRF on body-less POSTs, cache headers, timing, headers) is covered by the same suite.

## Known limitations

- **Network access to the database.** Render's free plan has no fixed IP address, so Atlas accepts connections from anywhere (`0.0.0.0/0`); the database user's strong password is the only gate.
- **Rate limits rely on Render having one proxy hop.** This is checked once after deploying (see DEPLOY.md).
- **Prompt injection is reduced, not impossible.** The AI only ever sees one member's own text and fixed instructions (nothing secret, no other members' data), so the worst case is a strange reply to the person who asked for it.
- **Personal data retention.** Conversations and essays stay until the member deletes them or the admin removes the member. There is no self-service "delete my account" yet.
- **Not covered:** penetration testing of Render, Atlas and Google infrastructure, denial of service beyond the rate limits, and the browser's own speech-recognition service.

## Running the security tests

```bash
cd server
npm test   # unit tests + the security suite (needs TEST_MONGODB_URI or server/.env; uses a throwaway database it drops)
```

## Reporting a problem

Please tell the repository owner privately rather than opening a public issue.
