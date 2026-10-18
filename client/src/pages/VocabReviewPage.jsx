import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeftIcon, ArrowClockwiseIcon, CheckCircleIcon, PlusIcon, SpeakerHighIcon, SpinnerGapIcon, WarningIcon } from '@phosphor-icons/react';
import api, { getErrorMessage } from '../lib/api';
import { dueLabel, gapLabel, markWord } from '../lib/vocab';
import { speak, ttsSupported } from '../lib/speak';
import { StageBadge } from '../components/vocab/DeckTab';

const ease = [0.2, 0.8, 0.2, 1];

export default function VocabReviewPage() {
  const [queue, setQueue] = useState(null); // cards still to see; "Again" cards go back on the end
  const [flipped, setFlipped] = useState(false);
  const [error, setError] = useState('');
  const [reviewed, setReviewed] = useState(0);
  const [firstGrades, setFirstGrades] = useState({}); // card id → its first grade this session
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState([]); // grades that didn't save: [{ card, grade }]
  const [summary, setSummary] = useState(null); // { nextLabel, moreDue }
  const [adding, setAdding] = useState(false);
  const [turn, setTurn] = useState(0); // counts cards shown, so a re-queued card animates in fresh
  const cardRef = useRef(null);

  const load = useCallback(() => {
    api.get('/vocab/review', { params: { limit: 50 } })
      .then(({ data }) => setQueue(data.cards))
      .catch((err) => setError(getErrorMessage(err)));
  }, []);
  useEffect(load, [load]);

  const card = queue?.[0];
  const done = queue && queue.length === 0;

  // Send one grade. The screen has already moved on; a failure is kept for a retry.
  const send = useCallback((c, grade) => {
    setPending((n) => n + 1);
    api.post('/vocab/review', { cardId: c.id, grade })
      .catch(() => setFailed((f) => [...f, { card: c, grade }]))
      .finally(() => setPending((n) => n - 1));
  }, []);

  const grade = useCallback((g) => {
    if (!card || !flipped) return;
    send(card, g);
    setReviewed((n) => n + 1);
    setFirstGrades((m) => (card.id in m ? m : { ...m, [card.id]: g }));
    // "Again": back on the end of this session's queue, from the start of the box ladder
    setQueue((q) => (g === 'again' ? [...q.slice(1), { ...q[0], box: 0 }] : q.slice(1)));
    setFlipped(false);
    setTurn((t) => t + 1);
  }, [card, flipped, send]);

  function retry() {
    const list = failed;
    setFailed([]);
    for (const { card: c, grade: g } of list) send(c, g);
  }

  // After grading, the next card takes focus (so Space works straight away)
  useEffect(() => {
    cardRef.current?.focus({ preventScroll: true });
  }, [turn, queue === null]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onKey(e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)) return;
      if (!card) return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault(); // no page scroll, and no second "click" on a focused button
        setFlipped((f) => !f);
      } else if (flipped && ['1', '2', '3'].includes(e.key)) {
        e.preventDefault();
        grade(['again', 'good', 'easy'][Number(e.key) - 1]);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [card, flipped, grade]);

  // When the queue runs out, wait for the last saves, then find when the next review is
  useEffect(() => {
    if (!done || pending > 0 || summary) return;
    api.get('/vocab/cards').then(({ data }) => {
      const now = Date.now();
      const times = data.cards.map((c) => new Date(c.dueAt).getTime());
      const moreDue = times.filter((t) => t <= now).length;
      const nextT = Math.min(...times.filter((t) => t > now));
      setSummary({ moreDue, nextLabel: Number.isFinite(nextT) ? dueLabel(nextT, now) : null, deckSize: data.cards.length });
    }).catch(() => setSummary({ moreDue: 0, nextLabel: null, deckSize: null }));
  }, [done, pending, summary]);

  async function addFive() {
    setAdding(true);
    try {
      await api.post('/vocab/deck', { count: 5 });
      setSummary(null);
      setQueue(null);
      setReviewed(0);
      setFirstGrades({});
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
    setAdding(false);
  }
  function again() {
    setSummary(null);
    setQueue(null);
    setReviewed(0);
    setFirstGrades({});
    load();
  }

  const knew = Object.values(firstGrades).filter((g) => g !== 'again').length;
  const seen = Object.keys(firstGrades).length;
  const left = queue?.length ?? 0;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[760px] flex-col gap-5 px-4 py-6 md:px-8 md:py-8">
      <div className="flex items-center justify-between gap-3">
        <Link to="/vocabulary" className="flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
          <ArrowLeftIcon size={16} /> {card ? 'End session' : 'Vocabulary'}
        </Link>
        {card && <span className="text-sm text-ink-soft tabular-nums">{left} left · {reviewed} reviewed</span>}
      </div>

      {failed.length > 0 && (
        <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-field border border-mistake/40 bg-mistake/10 px-4 py-2.5 text-sm text-mistake-ink">
          <WarningIcon size={16} weight="fill" />
          <span>{failed.length} answer{failed.length === 1 ? '' : 's'} didn't save.</span>
          <button type="button" onClick={retry} className="font-semibold underline underline-offset-2">Retry</button>
        </div>
      )}

      {error && <p role="alert" className="text-sm font-medium text-mistake-ink">{error}</p>}
      {!queue && !error && <div className="h-[360px] animate-pulse rounded-panel bg-surface/70" />}

      {card && (
        <>
          <div className="h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
            <motion.div className="h-full rounded-full bg-brand" animate={{ width: `${(reviewed / (reviewed + left)) * 100}%` }} transition={{ duration: 0.3, ease }} />
          </div>
          <Flashcard key={`${card.id}-${turn}`} card={card} flipped={flipped} onFlip={() => setFlipped((f) => !f)} cardRef={cardRef} />
          <div className="flex items-center justify-between gap-3">
            <StageBadge box={card.box} />
            {ttsSupported && (
              <button type="button" onClick={() => speak(card.display, { rate: 0.85 })}
                className="flex h-10 items-center gap-1.5 rounded-[10px] border border-line bg-surface px-3 text-sm font-medium hover:border-ink-faint">
                <SpeakerHighIcon size={16} /> Hear it
              </button>
            )}
          </div>
          {!flipped ? (
            <button type="button" onClick={() => setFlipped(true)}
              className="flex min-h-13 items-center justify-center rounded-field bg-ink font-semibold text-white transition active:scale-[0.98]">
              Show meaning <span className="ml-2 hidden text-sm font-normal text-white/60 md:inline">Space</span>
            </button>
          ) : (
            <div className="grid grid-cols-3 gap-2.5" role="group" aria-label="How well did you know it?">
              {[
                ['again', 'Again', '10 min', 'border-mistake text-mistake-ink hover:bg-mistake/10'],
                ['good', 'Good', gapLabel(card.box, 1), 'border-line hover:border-ink-faint'],
                ['easy', 'Easy', gapLabel(card.box, 2), 'border-correct text-correct-ink hover:bg-correct/10'],
              ].map(([g, label, hint, cls], i) => (
                <button key={g} type="button" onClick={() => grade(g)}
                  className={`flex min-h-13 flex-col items-center justify-center rounded-field border bg-surface px-2 py-2 transition active:scale-[0.97] ${cls}`}>
                  <span className="font-semibold">{label} <span className="hidden text-[12px] font-normal text-ink-faint md:inline">{i + 1}</span></span>
                  <span className="text-[12px] text-ink-soft">{hint}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {done && reviewed === 0 && (
        <EmptyState adding={adding} onAdd={addFive} />
      )}

      {done && reviewed > 0 && (
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease }}
          className="flex flex-col gap-6 rounded-panel border border-line bg-surface p-6 md:p-10">
          <div className="flex items-center gap-3">
            <CheckCircleIcon size={34} weight="fill" className="text-correct" />
            <h1 className="font-display text-[clamp(26px,3vw,34px)] font-semibold tracking-[-0.02em]">Session done</h1>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-field bg-canvas px-4 py-3">
              <div className="font-display text-[32px] font-semibold leading-none tabular-nums">{reviewed}</div>
              <div className="mt-1 text-sm text-ink-soft">reviews</div>
            </div>
            <div className="rounded-field bg-canvas px-4 py-3">
              <div className="font-display text-[32px] font-semibold leading-none tabular-nums">{knew}<span className="text-[20px] text-ink-soft">/{seen}</span></div>
              <div className="mt-1 text-sm text-ink-soft">words you knew first time</div>
            </div>
          </div>
          <p className="text-[15px]" role="status">
            {pending > 0 || !summary ? 'Saving your answers…'
              : summary.moreDue > 0 ? `${summary.moreDue} more word${summary.moreDue === 1 ? ' is' : 's are'} due now.`
              : summary.nextLabel ? `Next review: ${summary.nextLabel}.` : ''}
          </p>
          <div className="flex flex-wrap gap-2.5">
            {summary?.moreDue > 0 && (
              <button type="button" onClick={again}
                className="flex h-13 items-center gap-2 rounded-field bg-brand px-5 font-semibold text-white hover:bg-brand-hover">
                <ArrowClockwiseIcon size={18} /> Keep going
              </button>
            )}
            <button type="button" onClick={addFive} disabled={adding}
              className="flex h-13 items-center gap-2 rounded-field border border-line px-5 font-semibold hover:border-ink-faint disabled:opacity-60">
              {adding ? <SpinnerGapIcon size={18} className="animate-spin" /> : <PlusIcon size={18} />} Add 5 more words
            </button>
            <Link to="/vocabulary" className="flex h-13 items-center rounded-field px-4 font-semibold text-brand hover:text-brand-hover">Back to Vocabulary</Link>
          </div>
        </motion.section>
      )}
    </div>
  );
}

function EmptyState({ adding, onAdd }) {
  return (
    <section className="flex flex-col items-start gap-4 rounded-panel border border-line bg-surface p-6 md:p-10">
      <CheckCircleIcon size={34} weight="fill" className="text-correct" />
      <h1 className="font-display text-[clamp(26px,3vw,34px)] font-semibold tracking-[-0.02em]">You're all caught up</h1>
      <p className="text-[15px] text-ink-soft">No words are due right now. Add a few new ones, or come back later.</p>
      <div className="flex flex-wrap gap-2.5">
        <button type="button" onClick={onAdd} disabled={adding}
          className="flex h-13 items-center gap-2 rounded-field bg-brand px-5 font-semibold text-white hover:bg-brand-hover disabled:opacity-60">
          {adding ? <SpinnerGapIcon size={18} className="animate-spin" /> : <PlusIcon size={18} />} Add 5 new words
        </button>
        <Link to="/vocabulary?tab=add" className="flex h-13 items-center rounded-field border border-line px-5 font-semibold hover:border-ink-faint">Browse words</Link>
      </div>
    </section>
  );
}

// The card: tap or Space flips it. A short turn over, or a plain crossfade with reduced motion.
function Flashcard({ card, flipped, onFlip, cardRef }) {
  const reduce = useReducedMotion();
  const front = (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <span className="font-display text-[clamp(34px,6vw,56px)] font-semibold leading-[1.05] tracking-[-0.03em] break-words">{card.display}</span>
      {card.pos && <span className="text-[15px] text-ink-soft">{card.pos}</span>}
      <span className="mt-4 text-sm text-ink-faint">Tap the card or press Space</span>
    </div>
  );
  const back = (
    <div className="flex h-full flex-col justify-center gap-4 px-6 py-8 md:px-10">
      <span className="text-sm font-semibold text-ink-soft">{card.display}{card.pos ? ` · ${card.pos}` : ''}</span>
      <p className="font-display text-[clamp(22px,3vw,28px)] font-semibold leading-snug tracking-[-0.015em]">{card.meaning}</p>
      {card.example && (
        <p className="text-[17px] leading-relaxed text-ink">
          {markWord(card.example, card.display).map((p, i) => p.mark
            ? <span key={i} className="rounded-[2px_5px_3px_6px] bg-marker px-1">{p.text}</span>
            : <span key={i}>{p.text}</span>)}
        </p>
      )}
    </div>
  );

  const label = flipped
    ? `${card.display}. Meaning: ${card.meaning}. ${card.example ?? ''}`
    : `${card.display}${card.pos ? `, ${card.pos}` : ''}. Press to show the meaning.`;

  return (
    <>
      <button ref={cardRef} type="button" onClick={onFlip} aria-label={label} aria-pressed={flipped}
        className="relative block w-full rounded-panel text-left outline-offset-4 [perspective:1400px] focus-visible:outline-2 focus-visible:outline-brand">
        {reduce ? (
          <div className="grid min-h-[300px] rounded-panel border border-line bg-surface md:min-h-[360px]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={flipped ? 'back' : 'front'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                {flipped ? back : front}
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          <motion.div className="grid min-h-[300px] [transform-style:preserve-3d] md:min-h-[360px]"
            initial={{ rotateY: 0, opacity: 0, y: 10 }} animate={{ rotateY: flipped ? 180 : 0, opacity: 1, y: 0 }}
            transition={{ rotateY: { duration: 0.45, ease }, opacity: { duration: 0.2 }, y: { duration: 0.25, ease } }}>
            <div className="[grid-area:1/1] rounded-panel border border-line bg-surface [backface-visibility:hidden]">{front}</div>
            <div className="[grid-area:1/1] rounded-panel border border-brand/40 bg-surface [backface-visibility:hidden] [transform:rotateY(180deg)]">{back}</div>
          </motion.div>
        )}
      </button>
      {/* Read out what's on the back when it turns over */}
      <p className="sr-only" aria-live="polite">{flipped ? `Meaning: ${card.meaning}` : ''}</p>
    </>
  );
}
