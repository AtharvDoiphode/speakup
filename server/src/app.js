import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { HttpError } from './utils/httpError.js';
import { healthBody, requestLogger, serveClient } from './production.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import meRoutes from './routes/meRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import scenarioRoutes from './routes/scenarioRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import writingRoutes from './routes/writingRoutes.js';
import readingRoutes from './routes/readingRoutes.js';
import grammarRoutes from './routes/grammarRoutes.js';
import vocabRoutes from './routes/vocabRoutes.js';
import { progressRouter, historyRouter } from './routes/progressRoutes.js';
import { peopleRouter, modesRouter } from './routes/peopleRoutes.js';

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// Render puts one proxy in front of us: req.ip (and so the rate limits) use the real client IP
app.set('trust proxy', 1);

if (isProduction) app.use(requestLogger);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        // motion writes transforms straight to element.style (CSSOM), which CSP allows without 'unsafe-inline'
        styleSrc: ["'self'"],
        fontSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        mediaSrc: ["'self'", 'blob:'],
        manifestSrc: ["'self'"],
        workerSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: isProduction ? [] : null,
      },
    },
    frameguard: { action: 'deny' }, // matches frame-ancestors 'none'
  })
);
// Mic for speaking practice on our own pages only; nothing else
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'microphone=(self), camera=(), geolocation=(), payment=(), usb=()');
  next();
});
app.use(compression());
// In production the app and the API share one origin, so this only matters for local dev
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// API answers are private to the person asking: never stored by the browser or a proxy
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// CSRF: a page on another site can't change anything. Browsers send Origin on every POST/PATCH/DELETE;
// it must be our own address (or CLIENT_ORIGIN, the Vite dev server). No Origin = not a browser.
app.use('/api', (req, res, next) => {
  const origin = req.get('origin');
  if (req.method === 'GET' || req.method === 'HEAD' || !origin) return next();
  let host = null;
  try { host = new URL(origin).host; } catch { /* "null" or junk: refused below */ }
  if (origin === process.env.CLIENT_ORIGIN || host === req.get('host')) return next();
  res.status(403).json({ message: 'That request came from another site' });
});

// Cheap enough for an uptime ping every 5 minutes: no database query, no secrets
app.get('/api/health', (req, res) => {
  res.set('Cache-Control', 'no-store').json(healthBody(mongoose.connection.readyState, process.uptime()));
});

// Feature routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/me', meRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/scenarios', scenarioRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/writing', writingRoutes);
app.use('/api/reading', readingRoutes);
app.use('/api/grammar', grammarRoutes);
app.use('/api/vocab', vocabRoutes);
app.use('/api/progress', progressRouter);
app.use('/api/history', historyRouter);
app.use('/api/people', peopleRouter);
app.use('/api/modes', modesRouter);

// An unknown /api/* is always a JSON 404, never the app's HTML page
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// The built React app (client/dist) on the same origin, with deep links falling back to index.html
if (isProduction) serveClient(app, fileURLToPath(new URL('../../client/dist', import.meta.url)));

// Must come after all routes: anything not matched above is a 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});


app.use((err, req, res, next) => {
  // MongoDB "duplicate key" error (e.g. two people registering the same email at once)
  if (err.code === 11000) {
    return res.status(409).json({ message: 'That value is already in use' });
  }
  const status = err.status || err.statusCode || 500;
  // Log the error itself, never the whole object: a JSON parse error carries the raw request body (passwords)
  if (status >= 500) console.error(`${req.method} ${req.path} ${status}`, isProduction ? `${err.name}: ${err.message}` : err.stack);
  // Our own HttpErrors and Express's client errors (bad JSON, too large) say what went wrong;
  // anything else (database, library, bug) gets a plain message with no internals
  const ours = err instanceof HttpError || (status < 500 && err.expose && err.type !== 'entity.parse.failed');
  res.status(status).json({
    message: ours ? err.message : status < 500 ? 'That request was not valid' : 'Something went wrong',
  });
});

export default app;