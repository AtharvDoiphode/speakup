// Where to go after logging in: only a path inside this app (never another site, never back to /login)
const BASE = 'https://speakup.invalid';
const SLASH_OR_BACKSLASH = /^\/[/\\]/;

export function safeReturnPath(from) {
  const path = typeof from === 'string' ? from
    : from && typeof from.pathname === 'string' ? from.pathname + (from.search || '') + (from.hash || '') : '';
  if (!path.startsWith('/') || SLASH_OR_BACKSLASH.test(path)) return '/';
  let decoded;
  try { decoded = decodeURIComponent(path); } catch { return '/'; }
  // eslint-disable-next-line no-control-regex
  if (SLASH_OR_BACKSLASH.test(decoded) || /[\u0000-\u001f]/.test(decoded) || /^\/login(?:[/?#]|$)/.test(path)) return '/';
  try { if (new URL(path, BASE).origin !== BASE) return '/'; } catch { return '/'; }
  return path;
}
