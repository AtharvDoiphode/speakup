import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowClockwiseIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { backoff, errorInfo } from '../lib/errors';

// The one friendly error: what happened, and the next step (try again, log in, or go home).
// Server words reach the screen only through errorInfo, and only as text.
export default function ErrorState({ error, onRetry, className = '' }) {
  const info = errorInfo(error);
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  // After "busy" or "too many tries", Try again waits a moment, so nobody can hammer the AI limit
  const waitMs = info.kind === 'rateLimit' ? backoff(2, info.retryAfter) : info.kind === 'busy' ? backoff(1) : 0;
  const [left, setLeft] = useState(Math.ceil(waitMs / 1000));
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  async function retry() {
    setBusy(true);
    try { await onRetry(); } finally { setBusy(false); }
  }
  const btn = 'flex min-h-11 w-fit items-center gap-2 rounded-field px-5 font-semibold transition';
  return (
    <div role="alert" className={`flex flex-col items-start gap-3 rounded-panel border border-mistake bg-mistake-tint p-5 md:p-6 ${className}`} data-error={info.kind}>
      <div className="flex items-start gap-2.5">
        <WarningCircleIcon size={22} weight="fill" className="mt-0.5 shrink-0 text-mistake-text" aria-hidden="true" />
        <div>
          <p className="font-semibold text-text-primary">{info.title}</p>
          <p className="text-[15px] text-text-primary">{info.message}</p>
        </div>
      </div>
      {info.action === 'retry' && onRetry && (
        <button type="button" onClick={retry} disabled={busy || left > 0} className={`${btn} bg-brand text-on-brand hover:bg-brand-700 disabled:opacity-60`}>
          <ArrowClockwiseIcon size={18} aria-hidden="true" className={busy ? 'animate-spin' : ''} /> {busy ? 'Trying again…' : left > 0 ? `Try again in ${left}s` : 'Try again'}
        </button>
      )}
      {info.action === 'login' && (
        <Link to="/login" state={{ from: location }} className={`press ${btn} bg-brand text-on-brand hover:bg-brand-700`}>Log in</Link>
      )}
      {info.action === 'home' && (
        <Link to="/" className={`press ${btn} border border-border-strong bg-surface-card hover:border-text-secondary`}>Go to Home</Link>
      )}
    </div>
  );
}
