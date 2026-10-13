import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDownIcon, ArrowUpIcon, PaperPlaneRightIcon, SpeakerHighIcon, XIcon } from '@phosphor-icons/react';
import api, { getErrorMessage } from '../lib/api';
import { MISTAKE_LABELS } from '../lib/corrections';
import VoiceOrb from '../components/VoiceOrb';
import CorrectedLine from '../components/CorrectedLine';

const LEVELS = ['friendly', 'neutral', 'tough'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const findLast = (arr, fn) => [...arr].reverse().find(fn);
const fmt = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

function speak(text) {
  if (!canSpeak) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  window.speechSynthesis.speak(u);
}

function useElapsed(startIso, running) {
  const [now, setNow] = useState(() => Date.now()); // the function form runs once, not on every render
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);
  if (!startIso) return 0;
  return Math.max(0, Math.floor((now - new Date(startIso).getTime()) / 1000));
}

export default function LivePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [convo, setConvo] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null); // 'send' | 'difficulty' | 'end' | null
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [showSummary, setShowSummary] = useState(true);

  useEffect(() => {
    api.get(`/conversations/${id}`)
      .then(({ data }) => setConvo(data.conversation))
      .catch((err) => setLoadError(getErrorMessage(err)));
  }, [id]);

  // Put the cursor back in the reply box when a send finishes (or fails), so you can
  // type or press Enter again straight away. It has to happen in an effect: the box
  // is disabled while sending, and can only take focus once React has re-enabled it.
  // Only after a send, so tapping "Make it easier" on a phone doesn't pop the keyboard up.
  const lastBusy = useRef(null);
  useEffect(() => {
    if (lastBusy.current === 'send' && busy === null) inputRef.current?.focus();
    lastBusy.current = busy;
  }, [busy]);

  useEffect(() => {
    if (!confirmEnd) return;
    const t = setTimeout(() => setConfirmEnd(false), 3000);
    return () => clearTimeout(t);
  }, [confirmEnd]);

  const messages = convo?.messages ?? [];
  const ended = convo?.status === 'ended';
  const elapsed = useElapsed(messages[0]?.createdAt, !!convo && !ended);

  if (loadError) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-mistake-ink">{loadError}</p>
        <button onClick={() => navigate('/practice')} className="mt-4 font-semibold text-brand">Back to scenes</button>
      </div>
    );
  }
  if (!convo) return <div className="px-6 py-16 text-ink-soft">Loading conversation…</div>;

  const persona = convo.persona ?? {};
  const name = persona.name ?? 'Your partner';
  const lastAi = findLast(messages, (m) => m.role === 'ai');
  const lastUser = findLast(messages, (m) => m.role === 'user');
  const sending = busy === 'send';
  const orbState = sending ? 'thinking' : 'idle';
  const status = ended ? 'Session ended' : sending ? `${name} is thinking` : 'Your turn';
  const level = LEVELS.indexOf(convo.difficulty);

  async function send(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setBusy('send');
    setPending(text);
    setDraft('');
    setError('');
    try {
      const { data } = await api.post(`/conversations/${id}/messages`, { text });
      setConvo((c) => ({ ...c, messages: [...c.messages, data.userMessage, data.aiMessage] }));
    } catch (err) {
      setError(getErrorMessage(err));
      setDraft(text);
      if (err.response?.status === 409) {
        const { data } = await api.get(`/conversations/${id}`);
        setConvo(data.conversation);
      }
    } finally {
      setBusy(null);
      setPending('');
    }
  }

  async function shiftDifficulty(step) {
    const next = LEVELS[level + step];
    if (!next || busy) return;
    setBusy('difficulty');
    setError('');
    try {
      const { data } = await api.patch(`/conversations/${id}/difficulty`, { difficulty: next });
      setConvo((c) => ({ ...c, difficulty: data.difficulty }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function endSession() {
    if (!confirmEnd) return setConfirmEnd(true);
    setBusy('end');
    setError('');
    try {
      const { data } = await api.post(`/conversations/${id}/end`);
      setConvo((c) => ({ ...c, ...data.conversation, status: 'ended' }));
      setShowSummary(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(null);
      setConfirmEnd(false);
    }
  }

  return (
    <div className="lg:grid lg:h-dvh lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* A div, not <main>: the app shell already provides the page's <main> */}
      <div className="flex min-w-0 flex-col lg:min-h-0">
        <header className="flex h-[68px] flex-none items-center gap-[18px] border-b border-line px-4 md:h-[76px] md:px-12">
          <span className="truncate text-base font-semibold">{convo.title}</span>
          <span className="whitespace-nowrap text-[15px] text-ink-soft">
            {cap(convo.difficulty)} · {fmt(ended ? convo.durationSec ?? elapsed : elapsed)}
          </span>
        </header>

        <section className="flex flex-1 flex-col gap-6 px-4 pt-5 pb-6 md:px-14 lg:min-h-0 lg:overflow-y-auto">
          <div className="flex items-center gap-5 md:gap-9">
            <div className="-ml-3 size-[140px] flex-none md:-ml-6 md:size-[250px]">
              <VoiceOrb state={orbState} />
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <span className="font-display text-[clamp(34px,5vw,60px)] font-semibold leading-[0.95] tracking-[-0.04em]">{name}</span>
              <span className="text-base text-ink-soft md:text-lg">{persona.roleLong ?? persona.role}</span>
              <span className="mt-2.5 flex items-center gap-2 text-[15px] font-semibold text-brand" aria-live="polite">
                <span className={`size-2 rounded-full bg-brand ${sending ? 'animate-pulse' : ''}`} />
                {status}
              </span>
            </div>
          </div>

          {lastAi && (
            <div className="flex max-w-[780px] flex-col gap-1.5">
              <span className="text-sm text-ink-soft">{name}</span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.p key={lastAi._id ?? lastAi.createdAt}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-[clamp(19px,2vw,24px)] leading-[1.4] text-ink-soft text-pretty">
                  {lastAi.text}
                </motion.p>
              </AnimatePresence>
            </div>
          )}

          {sending ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-ink-soft">You</span>
              <p className="text-[clamp(22px,2.4vw,30px)] leading-[1.5] text-ink-soft">
                {pending}
                <span className="ml-1 inline-block h-[0.9em] w-[3px] animate-pulse bg-brand align-[-0.1em]" />
              </p>
            </div>
          ) : (
            lastUser && <CorrectedLine key={lastUser._id ?? lastUser.createdAt} text={lastUser.text} mistakes={lastUser.mistakes} />
          )}
        </section>

        {!ended && (
          <footer className="flex flex-none flex-col gap-3 border-t border-line px-4 py-4 md:px-12 lg:py-5">
            {error && <p role="alert" className="text-sm font-medium text-mistake-ink">{error}</p>}
            <div className="grid items-center gap-3 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-5">
              <div className="order-2 flex gap-1.5 lg:order-1">
                <ControlButton onClick={() => shiftDifficulty(-1)} disabled={level <= 0 || !!busy} icon={<ArrowDownIcon size={17} />}>Make it easier</ControlButton>
                <ControlButton onClick={() => shiftDifficulty(1)} disabled={level >= 2 || !!busy} icon={<ArrowUpIcon size={17} />}>Make it tougher</ControlButton>
              </div>

              <form onSubmit={send} className="order-1 flex gap-2 lg:order-2">
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={1000}
                  placeholder={`Reply to ${name}…`}
                  aria-label={`Reply to ${name}`}
                  disabled={sending}
                  autoFocus
                  className="h-12 min-w-0 flex-1 rounded-field border border-line bg-surface px-4 text-base"
                />
                <button type="submit" disabled={!draft.trim() || !!busy} aria-label="Send"
                  className="flex size-12 flex-none items-center justify-center rounded-field bg-brand text-white transition hover:bg-brand-hover active:scale-[0.94] disabled:opacity-40">
                  <PaperPlaneRightIcon size={20} />
                </button>
              </form>

              <div className="order-3 flex lg:justify-end">
                <button type="button" onClick={endSession} disabled={busy === 'end' || sending}
                  className="flex h-[42px] items-center gap-1.5 rounded-field border border-mistake bg-surface px-4 text-sm font-semibold text-mistake-ink transition hover:-translate-y-px active:scale-[0.96] disabled:opacity-50">
                  <XIcon size={16} />
                  {busy === 'end' ? 'Ending…' : confirmEnd ? 'Tap again to end' : 'End session'}
                </button>
              </div>
            </div>
          </footer>
        )}
      </div>

      <SessionRail messages={messages} lastUser={lastUser} />

      <AnimatePresence>
        {ended && showSummary && (
          <Summary convo={convo} messages={messages} onReview={() => setShowSummary(false)} onNew={() => navigate('/practice')} />
        )}
      </AnimatePresence>
    </div>
  );
}

function ControlButton({ icon, children, ...props }) {
  return (
    <button type="button" {...props}
      className="flex h-[42px] items-center gap-1.5 rounded-field border border-line bg-surface px-3 text-sm font-medium transition hover:-translate-y-px active:scale-[0.96] disabled:opacity-40 disabled:hover:translate-y-0">
      {icon}
      {children}
    </button>
  );
}

function groupMistakes(messages) {
  const groups = {};
  messages.filter((m) => m.role === 'user').forEach((m) =>
    m.mistakes.forEach((x) => {
      const g = (groups[x.type] ??= { type: x.type, n: 0 });
      g.n += 1;
      g.example = x; // latest example wins
    })
  );
  return Object.values(groups).sort((a, b) => b.n - a.n);
}

function SessionRail({ messages, lastUser }) {
  const answers = messages.filter((m) => m.role === 'user');
  const clean = answers.filter((m) => m.mistakes.length === 0).length;
  const groups = groupMistakes(messages);
  const total = groups.reduce((n, g) => n + g.n, 0);
  const natural = lastUser?.natural && lastUser.natural !== lastUser.text ? lastUser.natural : null;

  return (
    <aside className="flex flex-col gap-6 border-t border-line bg-surface px-4 py-7 md:px-[30px] lg:min-h-0 lg:overflow-y-auto lg:border-t-0 lg:border-l">
      <div className="flex flex-col gap-3.5">
        <span className="text-[15px] font-semibold">This session</span>
        <div className="grid grid-cols-2 gap-3.5">
          <Stat label="Answers" value={answers.length} />
          <Stat label="Clean answers" value={clean} accent={clean > 0} />
        </div>
      </div>

      <div className="flex flex-col border-t border-line pt-[22px]">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-[15px] font-semibold">Mistakes this session</span>
          <span className="text-sm text-ink-soft">{total}</span>
        </div>
        {groups.length === 0 && <p className="py-2.5 text-sm text-ink-soft">None yet. Keep talking.</p>}
        <AnimatePresence initial={false}>
          {groups.map((g) => (
            <motion.div key={g.type} layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-1 border-b border-line py-[11px]">
              <div className="flex justify-between text-[15px]">
                <span className="font-medium">{MISTAKE_LABELS[g.type] ?? 'Other'}</span>
                <span className="text-ink-soft">{g.n}</span>
              </div>
              <div className="text-sm">
                <span className="text-mistake-ink line-through decoration-mistake decoration-[1.5px]">{g.example.wrong}</span>{' '}
                <span className="rounded-[2px_4px_3px_5px] bg-marker px-1">{g.example.right}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {natural && (
        <div className="mt-auto flex flex-col gap-3 rounded-panel border border-line bg-canvas p-5">
          <span className="text-[15px] font-semibold">More natural way to say it</span>
          <p className="font-display text-[21px] font-medium leading-[1.3] tracking-[-0.015em] text-pretty">"{natural}"</p>
          {canSpeak && (
            <div className="flex gap-2">
              <button type="button" onClick={() => speak(natural)}
                className="flex h-[38px] items-center gap-1.5 rounded-[10px] border border-line bg-surface px-3 text-sm font-medium active:scale-[0.96]">
                <SpeakerHighIcon size={16} />
                Hear it
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

function Stat({ label, value, accent = false }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[15px] text-ink-soft">{label}</span>
      <span className={`font-display text-[52px] font-semibold leading-[0.9] tracking-[-0.04em] ${accent ? 'text-correct-ink' : ''}`}>{value}</span>
    </div>
  );
}

function Summary({ convo, messages, onReview, onNew }) {
  const groups = groupMistakes(messages).slice(0, 3);
  const minutes = Math.max(1, Math.round((convo.durationSec ?? 0) / 60));
  return (
    <>
      <motion.div className="fixed inset-0 z-40 bg-ink/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div role="dialog" aria-modal="true" aria-labelledby="summary-title"
        className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-[460px] -translate-y-1/2 rounded-panel border border-line bg-surface p-7"
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}>
        <span className="text-sm text-ink-soft">{convo.title} · {minutes} min</span>
        <h2 id="summary-title" className="mt-1 text-[30px] font-semibold tracking-[-0.03em]">Session complete</h2>
        <div className="mt-5 flex items-end gap-3">
          <span className="font-display text-[72px] font-semibold leading-[0.85] tracking-[-0.05em]">
            {convo.score == null ? '–' : `${convo.score}%`}
          </span>
          <span className="pb-1.5 text-sm text-ink-soft">
            {convo.score == null ? 'No answers this time' : 'of your answers had no mistakes'}
          </span>
        </div>
        {groups.length > 0 && (
          <div className="mt-6 flex flex-col gap-2">
            <span className="text-sm font-semibold">Work on next</span>
            {groups.map((g) => (
              <div key={g.type} className="flex justify-between text-[15px]">
                <span>{MISTAKE_LABELS[g.type] ?? 'Other'}</span>
                <span className="text-ink-soft">{g.n}×</span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-7 grid grid-cols-2 gap-2">
          <button onClick={onReview} className="h-12 rounded-field border border-line font-semibold">Review</button>
          <button onClick={onNew} autoFocus className="h-12 rounded-field bg-brand font-semibold text-white hover:bg-brand-hover">New scene</button>
        </div>
      </motion.div>
    </>
  );
}