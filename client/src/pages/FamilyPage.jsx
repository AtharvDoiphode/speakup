import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowClockwiseIcon, CopyIcon, KeyIcon, LockKeyIcon, TrashIcon } from '@phosphor-icons/react';
import api, { getErrorMessage } from '../lib/api';
import { useAuth } from '../context/useAuth';
import { copyText } from '../lib/copyText';
import { longDate } from '../lib/dates';

const when = (d) => (d ? longDate(d) : 'Not yet');

// A value to hand to someone, with a Copy button
function CopyBox({ value, label }) {
  const [copied, setCopied] = useState(null);
  async function copy() {
    setCopied((await copyText(value)) ? 'Copied' : 'Copy failed: select it instead');
    setTimeout(() => setCopied(null), 1800);
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="select-all rounded-field border border-border-subtle bg-surface-sunken px-3.5 py-2.5 font-mono text-[17px] tracking-wide" aria-label={label}>{value}</code>
      <button type="button" onClick={copy} className="flex min-h-11 items-center gap-1.5 rounded-field border border-border-subtle bg-surface-card px-3.5 text-sm font-semibold hover:border-border-strong">
        <CopyIcon size={16} /> {copied ?? 'Copy'}
      </button>
    </div>
  );
}

export default function FamilyPage() {
  const { user } = useAuth();
  if (user.role !== 'admin') {
    return (
      <div className="flex flex-col items-start gap-3 px-4 py-16 md:px-11">
        <LockKeyIcon size={36} className="text-text-secondary" />
        <h1 className="text-[clamp(28px,3.4vw,38px)] font-semibold tracking-[-0.03em]">Admins only</h1>
        <p className="max-w-[48ch] text-[15px] text-text-secondary">This page is for the family admin, who adds people and resets passwords. If you need help with your account, ask them.</p>
        <Link to="/" className="font-semibold text-brand hover:text-brand-700">Back to Home</Link>
      </div>
    );
  }
  return (
    <div className="flex max-w-[900px] flex-col gap-6 px-4 py-8 md:px-11 md:py-10">
      <header>
        <h1 className="text-[clamp(30px,3.4vw,38px)] font-semibold leading-[1.05] tracking-[-0.035em]">Family</h1>
        <p className="mt-2 text-[15px] text-text-secondary">Everyone using SpeakUp, and the code they use to join.</p>
      </header>
      <Members />
      <SignupCode />
    </div>
  );
}

function Members() {
  const [members, setMembers] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api.get('/admin/members').then(({ data }) => setMembers(data.members)).catch((err) => setError(getErrorMessage(err)));
  }, []);
  const update = (id, patch) => setMembers((list) => list.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  return (
    <section className="flex flex-col gap-3" aria-label="Members">
      <h2 className="text-[17px] font-semibold">Members {members && <span className="font-normal text-text-secondary">· {members.length}</span>}</h2>
      {error && <p role="alert" className="text-sm font-medium text-mistake-text">{error}</p>}
      {!members && !error && <div className="h-40 animate-pulse rounded-panel bg-surface-card/70" />}
      {members && (
        <ul className="flex flex-col overflow-hidden rounded-panel border border-border-subtle bg-surface-card">
          {members.map((m) => (
            <li key={m.id} className="border-b border-border-subtle last:border-0" data-member={m.email}>
              <MemberRow m={m} onRemoved={() => setMembers((list) => list.filter((x) => x.id !== m.id))} onReset={() => update(m.id, { mustChangePassword: true })} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MemberRow({ m, onRemoved, onReset }) {
  const [mode, setMode] = useState(null); // null | 'reset-confirm' | 'remove'
  const [temp, setTemp] = useState(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode !== 'reset-confirm') return;
    const t = setTimeout(() => setMode(null), 3000);
    return () => clearTimeout(t);
  }, [mode]);

  async function reset() {
    if (mode !== 'reset-confirm') return setMode('reset-confirm');
    setBusy(true); setError('');
    try {
      const { data } = await api.post(`/admin/members/${m.id}/reset-password`);
      setTemp(data.password); // only ever in this screen's memory
      onReset();
    } catch (err) { setError(getErrorMessage(err)); }
    setMode(null); setBusy(false);
  }

  async function remove() {
    setBusy(true); setError('');
    try {
      await api.delete(`/admin/members/${m.id}`);
      onRemoved();
    } catch (err) { setError(getErrorMessage(err)); setBusy(false); }
  }

  return (
    <div className="flex flex-col gap-3 px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[17px] font-semibold">{m.name}</span>
            {m.isMe && <span className="rounded-tag bg-brand-50 px-2 py-0.5 text-[12px] font-semibold text-brand">You</span>}
            <span className={`rounded-tag px-2 py-0.5 text-[12px] font-semibold ${m.role === 'admin' ? 'bg-surface-inverse text-text-inverse' : 'bg-surface-sunken text-text-secondary'}`}>{m.role === 'admin' ? 'Admin' : 'Member'}</span>
            {m.mustChangePassword && <span className="rounded-tag bg-marker/50 px-2 py-0.5 text-[12px] font-semibold">Password reset</span>}
          </div>
          <div className="truncate text-sm text-text-secondary">{m.email}</div>
          <dl className="mt-1.5 flex flex-wrap gap-x-5 gap-y-0.5 text-[13px]">
            <div className="flex gap-1"><dt className="text-text-secondary">Joined</dt><dd>{when(m.joined)}</dd></div>
            <div className="flex gap-1"><dt className="text-text-secondary">Last active</dt><dd>{when(m.lastActive)}</dd></div>
            <div className="flex gap-1"><dt className="text-text-secondary">This week</dt><dd className="font-semibold tabular-nums" data-minutes>{m.minutesThisWeek} min</dd></div>
          </dl>
        </div>
        {!m.isMe && mode !== 'remove' && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={reset} disabled={busy}
              className="flex min-h-11 items-center gap-1.5 rounded-field border border-border-subtle px-3.5 text-sm font-semibold hover:border-border-strong">
              <KeyIcon size={16} /> {mode === 'reset-confirm' ? 'Tap again to reset' : 'Reset password'}
            </button>
            <button type="button" onClick={() => { setMode('remove'); setTyped(''); setError(''); }}
              className="flex min-h-11 items-center gap-1.5 rounded-field border border-mistake px-3.5 text-sm font-semibold text-mistake-text">
              <TrashIcon size={16} /> Remove
            </button>
          </div>
        )}
      </div>

      {temp && (
        <div className="flex flex-col gap-2 rounded-field border border-brand bg-brand-50 p-4" data-temp-password>
          <p className="text-sm font-semibold">Temporary password for {m.name}</p>
          <CopyBox value={temp} label={`Temporary password for ${m.name}`} />
          <p className="text-[13px] text-text-secondary"><strong>Shown once.</strong> Give it to {m.name}. They'll be asked to choose their own password when they log in.</p>
          <button type="button" onClick={() => setTemp(null)} className="w-fit text-sm font-semibold text-brand hover:text-brand-700">Done, hide it</button>
        </div>
      )}

      {mode === 'remove' && (
        <div className="flex flex-col gap-2.5 rounded-field border border-mistake bg-mistake-tint p-4" data-remove>
          <p className="text-[15px]"><strong>Remove {m.name}?</strong> Their account and all their practice (conversations, writing, reading, grammar, words and people) are deleted for good.</p>
          <label htmlFor={`remove-${m.id}`} className="text-sm font-semibold">Type <span className="font-mono">{m.name}</span> to confirm</label>
          <input id={`remove-${m.id}`} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off"
            className="h-11 max-w-[320px] rounded-field border border-border-strong bg-surface-card px-3 text-base focus:border-mistake" />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={remove} disabled={busy || typed.trim() !== m.name}
              className="flex min-h-11 items-center gap-1.5 rounded-field bg-danger px-4 text-sm font-semibold text-on-brand hover:bg-danger-hover disabled:opacity-40">
              <TrashIcon size={16} /> Remove for good
            </button>
            <button type="button" onClick={() => setMode(null)} className="flex min-h-11 items-center rounded-field border border-border-subtle px-4 text-sm font-semibold">Cancel</button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-sm font-medium text-mistake-text">{error}</p>}
    </div>
  );
}

function SignupCode() {
  const [code, setCode] = useState(null);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    api.get('/admin/signup-code').then(({ data }) => setCode(data.code)).catch((err) => setError(getErrorMessage(err)));
  }, []);
  useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(false), 3000);
    return () => clearTimeout(t);
  }, [confirm]);

  async function regenerate() {
    if (!confirm) return setConfirm(true);
    setBusy(true); setError('');
    try {
      const { data } = await api.post('/admin/signup-code/regenerate');
      setCode(data.code);
      setNote('New code made. The old one no longer works.');
    } catch (err) { setError(getErrorMessage(err)); }
    setConfirm(false); setBusy(false);
  }

  return (
    <section className="flex flex-col gap-3 rounded-panel border border-border-subtle bg-surface-card p-5 md:p-6" aria-label="Signup code">
      <div>
        <h2 className="text-[17px] font-semibold">Signup code</h2>
        <p className="text-sm text-text-secondary">New family members type this when they create an account.</p>
      </div>
      {error && <p role="alert" className="text-sm font-medium text-mistake-text">{error}</p>}
      {code && <CopyBox value={code} label="Signup code" />}
      <button type="button" onClick={regenerate} disabled={busy || !code}
        className="flex min-h-11 w-fit items-center gap-1.5 rounded-field border border-border-subtle px-3.5 text-sm font-semibold hover:border-border-strong disabled:opacity-50">
        <ArrowClockwiseIcon size={16} /> {confirm ? 'Tap again: the old code stops working' : 'Make a new code'}
      </button>
      <p className="min-h-5 text-sm text-success-text" aria-live="polite">{note}</p>
    </section>
  );
}
