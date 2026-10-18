import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MicrophoneIcon, StopIcon, SpeakerHighIcon, ArrowClockwiseIcon, ArrowRightIcon } from '@phosphor-icons/react';
import api, { getErrorMessage } from '../lib/api';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { speak, stopSpeaking, ttsSupported } from '../lib/speak';
import { tokenize, align, summarise } from '../lib/readAlong';
import ScoreRing from '../components/ScoreRing';
import VoiceOrb from '../components/VoiceOrb';

const LEVELS = [['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']];
const spring = { type: 'spring', stiffness: 520, damping: 42 };
const pace = (wpm) =>
  wpm < 90 ? ['Slow and careful', 'Good for accuracy. Try a little faster next time.']
  : wpm <= 160 ? ['Natural pace', 'This is comfortable conversational speed.']
  : ['Quite fast', 'Slow down a little so every word is clear.'];
const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function ReadAloudPage() {
  const [passages, setPassages] = useState(null);
  const [selId, setSelId] = useState(null);
  const [phase, setPhase] = useState('ready'); // ready | reading | saving | done
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);
  const finishRef = useRef(null);
  const finishingRef = useRef(false); // a finish is already under way (auto and tap can overlap)
  const textRef = useRef(null);

  const voice = useVoiceInput({ lang: 'en-IN', onAutoEnd: (t) => finishRef.current?.(t) });

  useEffect(() => {
    api.get('/reading/passages')
      .then(({ data }) => { setPassages(data.passages); setSelId(data.passages[0]?.id); })
      .catch((err) => setError(getErrorMessage(err)));
    return () => stopSpeaking();
  }, []);

  useEffect(() => {
    if (phase !== 'reading') return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - startRef.current) / 1000)), 500);
    return () => clearInterval(t);
  }, [phase]);

  const passage = passages?.find((p) => p.id === selId);
  const tokens = useMemo(() => (passage ? tokenize(passage.text) : []), [passage]);
  const live = useMemo(
    () => align(tokens, `${voice.transcript} ${voice.interim}`),
    [tokens, voice.transcript, voice.interim]
  );
  const shown = phase === 'done' && result ? result.align : live;

  // Finish automatically when the last word is read
  useEffect(() => {
    if (phase === 'reading' && tokens.length && live.position >= tokens.length) finish();
  }, [live.position]); // eslint-disable-line react-hooks/exhaustive-deps

  // The mic couldn't start or was blocked, and nothing was heard: back to the start
  useEffect(() => {
    if (phase === 'reading' && voice.error && !voice.listening && !finishingRef.current) setPhase('ready');
  }, [phase, voice.error, voice.listening]);

  // Keep the word being read on screen (long passages on a phone)
  useEffect(() => {
    if (phase !== 'reading') return;
    const el = textRef.current?.children[live.position];
    if (!el) return;
    const { top, bottom } = el.getBoundingClientRect();
    if (top < 80 || bottom > window.innerHeight - 120) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [phase, live.position]);

  // finish() is called from the hook when listening ends by itself, so keep the latest one
  useEffect(() => {
    finishRef.current = finish;
  });

  function choose(id) {
    if (phase === 'reading') return;
    stopSpeaking();
    setSelId(id);
    setPhase('ready');
    setResult(null);
    setError('');
    // Below xl the passage list sits under the text, so go back up to it
    if (window.innerWidth < 1280) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function start() {
    stopSpeaking();
    setError('');
    setResult(null);
    setElapsed(0);
    finishingRef.current = false;
    voice.clearError();
    startRef.current = Date.now();
    setPhase('reading');
    voice.start();
  }

  async function finish(autoText) {
    if (phase !== 'reading' || finishingRef.current) return;
    finishingRef.current = true;
    const text = autoText ?? (await voice.stop());
    const durationSec = Math.max(1, Math.round((Date.now() - startRef.current) / 1000));
    const al = align(tokens, text);
    const sum = summarise(tokens, al.status, al.position, durationSec);
    if (sum.wordsReached < 5) {
      finishingRef.current = false;
      setPhase('ready');
      setError("I didn't hear enough of the passage. Tap Start and read a few lines.");
      return;
    }
    // The server only keeps sessions of 5 seconds or more
    if (durationSec < 5) {
      finishingRef.current = false;
      setPhase('ready');
      setError('That was too quick to count. Read at your normal pace, then tap Finish.');
      return;
    }
    setPhase('saving');
    setResult({ ...sum, durationSec, align: al });
    try {
      const { data } = await api.post('/reading/sessions', { passageId: passage.id, durationSec, wordsReached: sum.wordsReached, wordsRead: sum.wordsRead, missed: sum.missed });
      const s = data.session;
      setResult((r) => ({ ...r, accuracy: s.accuracy, wpm: s.wpm }));
      // Best = highest accuracy, then faster, the same rule as the server
      const better = (b) => !b || s.accuracy > b.accuracy || (s.accuracy === b.accuracy && s.wpm > b.wpm);
      setPassages((ps) => ps.map((p) => (p.id === passage.id && better(p.best)
        ? { ...p, best: { accuracy: s.accuracy, wpm: s.wpm } }
        : p)));
    } catch (err) {
      setError(`Your result is shown but wasn't saved: ${getErrorMessage(err)}`);
    }
    setPhase('done');
  }

  if (!voice.supported) {
    return <div className="px-6 py-16"><h1 className="text-3xl font-semibold">Read Aloud</h1><p className="mt-2 text-ink-soft">Read Aloud needs Chrome or Edge, which can listen to your voice.</p></div>;
  }

  return (
    <div className="flex flex-col xl:grid xl:min-h-dvh xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside id="passages" className="flex flex-col gap-6 border-t border-line px-4 py-8 md:px-8 xl:border-t-0 xl:border-r">
        <div className="hidden xl:block"><Intro /></div>
        {!passages && !error && <div className="h-40 animate-pulse rounded-field bg-surface/70" />}
        {passages && LEVELS.map(([lvl, label]) => (
          <section key={lvl} className="flex flex-col">
            <h2 className="mb-1 border-b border-line pb-2 text-sm font-semibold">{label}</h2>
            {passages.filter((p) => p.level === lvl).map((p) => (
              <button key={p.id} type="button" onClick={() => choose(p.id)} aria-pressed={p.id === selId} disabled={phase === 'reading'}
                className="relative -mx-3 mt-0.5 flex flex-col rounded-field px-3 py-2.5 text-left disabled:opacity-60">
                {p.id === selId && <motion.span layoutId="passage-pill" transition={spring} className="absolute inset-0 rounded-field border border-brand bg-surface" />}
                <span className={`relative text-[15px] ${p.id === selId ? 'font-semibold' : 'font-medium'}`}>{p.title}</span>
                <span className="relative text-[13px] text-ink-soft">
                  {p.words} words{p.best ? ` · best ${p.best.accuracy}% at ${p.best.wpm} wpm` : ''}
                </span>
              </button>
            ))}
          </section>
        ))}
      </aside>

      {/* A div, not <main>: the app shell already provides the page's <main>.
          Below xl it comes first, so the text and Start button are at the top. */}
      <div className="order-first flex min-w-0 flex-col gap-6 px-4 py-8 md:px-12 md:py-10 xl:order-none">
        <div className="xl:hidden"><Intro /></div>
        {passage && (
          <>
            <header className="flex flex-wrap items-center gap-4">
              {/* Drawn larger than its box and faded at the edge, so the orb's glow isn't cut off square */}
              <div className="relative size-16 shrink-0">
                <div className="pointer-events-none absolute -inset-5 [mask-image:radial-gradient(closest-side,black_55%,transparent)]">
                  <VoiceOrb state={phase === 'reading' ? 'listening' : 'idle'} />
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-sm text-ink-soft">
                  <span className="capitalize">{passage.level}</span> · {passage.words} words
                  {phase !== 'reading' && <a href="#passages" className="ml-2 text-brand xl:hidden">Other passages</a>}
                </div>
                <h2 className="text-[28px] font-semibold tracking-[-0.03em]">{passage.title}</h2>
              </div>
              <div className="ml-auto flex items-center gap-3">
                {phase === 'reading' && <span className="font-display text-2xl font-semibold tabular-nums" aria-live="off">{clock(elapsed)}</span>}
                {phase === 'ready' && ttsSupported && (
                  <button onClick={() => speak(passage.text, { rate: 0.9 })} className="flex h-11 items-center gap-1.5 rounded-field border border-line bg-surface px-3 text-sm font-medium">
                    <SpeakerHighIcon size={17} /> Hear it first
                  </button>
                )}
                {phase === 'reading' ? (
                  <button onClick={() => finish()} className="flex h-12 items-center gap-2 rounded-field bg-ink px-5 font-semibold text-white active:scale-[0.97]">
                    <StopIcon size={18} /> Finish
                  </button>
                ) : phase !== 'saving' && (
                  <button onClick={start} className="flex h-12 items-center gap-2 rounded-field bg-brand px-5 font-semibold text-white transition hover:-translate-y-px hover:bg-brand-hover active:scale-[0.97]">
                    {phase === 'done' ? <ArrowClockwiseIcon size={18} /> : <MicrophoneIcon size={18} />}
                    {phase === 'done' ? 'Read again' : 'Start reading'}
                  </button>
                )}
              </div>
            </header>

            {(error || voice.error) && <p role="alert" className="text-sm font-medium text-mistake-ink">{error || voice.error}</p>}

            <article className="rounded-panel border border-line bg-surface p-6 md:p-10">
              <p ref={textRef} className="text-[clamp(20px,2.1vw,26px)] leading-[1.9]">
                {tokens.map((tok, i) => {
                  const st = phase === 'ready' ? 'pending' : shown.status[i];
                  const current = phase === 'reading' && i === shown.position;
                  const cls = st === 'read' ? 'text-ink'
                    : st === 'missed' ? 'text-mistake-ink underline decoration-mistake decoration-wavy decoration-[1.5px] underline-offset-4'
                    : phase === 'ready' ? 'text-ink' : 'text-ink-soft/70';
                  return (
                    // The space sits outside the word, so the marker covers only the word
                    <Fragment key={i}>
                      <span className={`relative inline-block transition-colors duration-200 ${cls}`}>
                        {current && <motion.span layoutId="read-cursor" transition={spring} className="absolute -inset-x-1 inset-y-[12%] rounded-[3px_6px_4px_7px] bg-marker" />}
                        <span className="relative">{tok}</span>
                      </span>{' '}
                    </Fragment>
                  );
                })}
              </p>
            </article>

            <AnimatePresence>
              {phase === 'done' && result && (
                <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="grid gap-6 rounded-panel border border-line bg-surface p-6 md:grid-cols-[auto_1fr] md:p-8">
                  <div className="flex items-center gap-5">
                    <ScoreRing score={result.accuracy} />
                    <div>
                      <div className="font-display text-2xl font-semibold">{result.accuracy}% accurate</div>
                      <div className="text-sm text-ink-soft">{result.wordsRead} of {result.wordsReached} words · {clock(result.durationSec)}</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 md:border-l md:border-line md:pl-6">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-[44px] font-semibold leading-none tracking-[-0.04em]">{result.wpm}</span>
                      <span className="text-ink-soft">words per minute · {pace(result.wpm)[0]}</span>
                    </div>
                    <p className="text-[15px] text-ink-soft">{pace(result.wpm)[1]}</p>
                  </div>
                  {result.missed.length > 0 && (
                    <div className="flex flex-col gap-2 md:col-span-2">
                      <span className="text-sm font-semibold">Words to practise</span>
                      <div className="flex flex-wrap gap-1.5">
                        {result.missed.map((w) => (
                          <button key={w} onClick={() => speak(w, { rate: 0.8 })} disabled={!ttsSupported}
                            className="flex h-9 items-center gap-1.5 rounded-tag border border-line px-3 text-[15px]">
                            {ttsSupported && <SpeakerHighIcon size={14} className="text-brand" />}{w}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <NextPassage passages={passages} current={passage} onPick={choose} />
                </motion.section>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}

function Intro() {
  return (
    <>
      <h1 className="text-[clamp(30px,3.4vw,38px)] font-semibold leading-[1.05] tracking-[-0.035em]">Read Aloud</h1>
      <p className="mt-2 text-[15px] text-ink-soft">Read at your own pace. The marker follows your voice.</p>
    </>
  );
}

function NextPassage({ passages, current, onPick }) {
  const i = passages.findIndex((p) => p.id === current.id);
  const next = passages[(i + 1) % passages.length];
  return (
    <button onClick={() => onPick(next.id)} className="flex items-center gap-2 text-[15px] font-semibold text-brand hover:text-brand-hover md:col-span-2">
      Next: {next.title} <ArrowRightIcon size={16} />
    </button>
  );
}