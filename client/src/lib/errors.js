// One place that turns any failed request into friendly words and the right next step.
// Server text is shown only when it is ordinary words written for people (e.g. "Name is required");
// server faults, technical-looking or very long text are replaced. Always rendered as text, never HTML.
const TECHNICAL = /stack|exception|mongo|axios|ECONN|undefined|null|status code|at \w+ \(|Error:|[<>{}]/i;
const CODE_ERROR = /\b[A-Z]\w*Error\b/; // TypeError, MongoServerError…
// Database, network and parser details: long numbers, ports, paths, URLs, error codes
const LEAK = /\d{5,}|:\/\/|[\\/]\w+[\\/]|\bE\d{4,}|ObjectId|\bjwt\b|\btoken\b|JSON|ETIMEDOUT|ENOENT|ECONN|buffering/i;

/** How long Try again waits after a busy or rate-limited answer: 1s, 2s, 4s… capped at 30s. A server Retry-After (seconds) wins. */
export const backoff = (attempt, retryAfterSec) => (retryAfterSec ? retryAfterSec * 1000 : Math.min(30_000, 1000 * 2 ** attempt));

const waitWords = (s) => (s >= 90 ? `${Math.ceil(s / 60)} minutes` : s >= 60 ? 'a minute' : `${s} seconds`);

/** { kind, title, message, action: 'retry' | 'login' | 'home' | 'none', retryAfter? } */
export function errorInfo(error) {
  const res = error?.response;
  if (!res) {
    if (error?.code === 'ECONNABORTED') return { kind: 'timeout', title: 'That took too long', message: 'The server is slower than usual. Try again in a moment.', action: 'retry' };
    return { kind: 'network', title: "Couldn't reach the server", message: 'Check your internet and try again.', action: 'retry' };
  }
  const status = res.status;
  const own = typeof res.data?.message === 'string' ? res.data.message.trim() : '';
  const safe = own && own.length <= 200 && !TECHNICAL.test(own) && !CODE_ERROR.test(own) && !LEAK.test(own) ? own : null;

  // A wrong password on the login form is not an expired login
  if (status === 401 && /\/auth\/login$/.test(error.config?.url ?? '')) {
    return { kind: 'request', title: "That didn't work", message: safe ?? "That email and password don't match.", action: 'none' };
  }
  if (status === 401) return { kind: 'auth', title: 'Please log in again', message: 'Your login has expired. Log in again to carry on where you were.', action: 'login' };
  if (status === 404) return { kind: 'notFound', title: "We couldn't find that", message: 'It may have been deleted, or the link is wrong.', action: 'home' };
  if (status === 429) {
    const after = Number(res.headers?.['retry-after']) || null;
    const message = after ? `That was a lot of tries. Please wait ${waitWords(after)} and try again.` : (safe ?? 'That was a lot of tries. Please wait a minute and try again.');
    return { kind: 'rateLimit', title: 'Too many tries', message, action: 'retry', retryAfter: after };
  }
  if (status === 503) return { kind: 'busy', title: 'Busy right now', message: safe ?? 'The AI is busy right now. Wait a few seconds and try again.', action: 'retry' };
  if (status >= 500) return { kind: 'server', title: 'Something went wrong on our side', message: "It's not you. Try again in a moment.", action: 'retry' };
  return { kind: 'request', title: "That didn't work", message: safe ?? "That didn't work. Check what you entered and try again.", action: 'none' };
}
