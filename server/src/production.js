import express from 'express';
import { join } from 'node:path';

const HASHED = /[\\/]assets[\\/]/; // Vite puts every content-hashed file in /assets
const NO_CACHE = /(^|[\\/])(index\.html|manifest\.webmanifest)$/;

/** Cache-Control for a built file: hashed assets forever, the app shell and manifest always revalidated, icons for a day. */
export const cacheControlFor = (filePath) =>
  HASHED.test(filePath) ? 'public, max-age=31536000, immutable' : NO_CACHE.test(filePath) ? 'no-cache' : 'public, max-age=86400';

/** Deep links (GET /history/123) get the app. /api, anything that looks like a file, and non-GETs never do. */
export const isSpaRoute = (method, path) =>
  (method === 'GET' || method === 'HEAD') && !/^\/api(\/|$)/i.test(path) && !/\.[^/]*$/.test(path);

const DB_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

/** GET /api/health body: no secrets, nothing slow. */
export const healthBody = (readyState, uptimeSec) => ({
  status: readyState === 1 ? 'ok' : 'degraded',
  uptime: Math.floor(uptimeSec),
  db: DB_STATES[readyState] ?? 'unknown',
});

/** Serves the built React app from distDir, with the app shell for deep links. Mount after the /api routes. */
export function serveClient(app, distDir) {
  app.use(
    express.static(distDir, {
      index: false, // "/" goes through the fallback below, so it gets the no-cache header too
      dotfiles: 'ignore',
      setHeaders: (res, filePath) => res.setHeader('Cache-Control', cacheControlFor(filePath)),
    })
  );
  const indexHtml = join(distDir, 'index.html');
  app.use((req, res, next) => {
    if (!isSpaRoute(req.method, req.path)) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexHtml);
  });
}

/** Production access log: one line per request. Path only (no query string), never headers, cookies or bodies. */
export const requestLogger = (req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    console.log(`${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode} ${ms.toFixed(0)}ms`);
  });
  next();
};
