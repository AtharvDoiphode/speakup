import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRightIcon, CheckCircleIcon, XCircleIcon } from '@phosphor-icons/react';
import ScoreRing from './ScoreRing';

const BLANK = '___';
const isNone = (o) => /^no article$/i.test(o);

/**
 * One question at a time. Each item: { key, prompt, options, answer, why, tag? }.
 * A "___" in the prompt is a blank that fills with the right answer once you've chosen.
 * Answers lock after the first tap. Keys 1–4 choose, Enter moves on.
 * onDone(results) runs after the last question, with [{ item, picked, right }].
 * Nothing is saved here: the page saves once, when the quiz is done.
 */
export function Quiz({ items, onDone }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [results, setResults] = useState([]);
  const rootRef = useRef(null);
  const nextRef = useRef(null);
  const item = items[i];
  const last = i === items.length - 1;
  const score = results.filter((r) => r.right).length;

  // Each new question's heading takes focus when it appears, so screen readers read it
  const focusOnMount = useCallback((el) => el?.focus({ preventScroll: true }), []);

  const pick = useCallback(
    (k) => {
      if (picked != null) return;
      setPicked(k);
      setResults((r) => [...r, { item, picked: k, right: k === item.answer }]);
    },
    [picked, item]
  );

  const next = useCallback(() => {
    if (picked == null) return;
    if (last) onDone(results);
    else {
      setI((n) => n + 1);
      setPicked(null);
    }
  }, [picked, last, results, onDone]);

  // After answering, the Next button gets focus
  useEffect(() => {
    if (picked != null) nextRef.current?.focus({ preventScroll: true });
  }, [picked]);

  useEffect(() => {
    function onKey(e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const el = document.activeElement;
      const inQuiz = !el || el === document.body || rootRef.current?.contains(el);
      if (!inQuiz) return;
      if (picked == null && /^[1-9]$/.test(e.key)) {
        const k = Number(e.key) - 1;
        if (k < item.options.length) {
          e.preventDefault();
          pick(k);
        }
      } else if (picked != null && e.key === 'Enter' && el !== nextRef.current) {
        e.preventDefault(); // on the Next button itself, Enter already presses it
        next();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [picked, item, pick, next]);

  const answered = picked != null;
  const gotIt = answered && picked === item.answer;
  const rightText = item.options[item.answer];

  return (
    <div ref={rootRef} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between text-sm text-ink-soft">
          <span>Question {i + 1} of {items.length}</span>
          <span>{score} right</span>
        </div>
        <div className="flex gap-1.5" aria-hidden="true">
          {items.map((it, k) => (
            <span key={it.key} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              k < results.length ? (results[k].right ? 'bg-correct' : 'bg-mistake') : k === i ? 'bg-ink' : 'bg-line'
            }`} />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={item.key} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}
          transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }} className="flex flex-col gap-6">
          <h2 ref={focusOnMount} tabIndex={-1}
            className="font-display text-[clamp(24px,2.6vw,32px)] font-semibold leading-[1.3] tracking-[-0.02em] outline-none text-pretty">
            {item.prompt.includes(BLANK) ? (
              <>
                {item.prompt.split(BLANK)[0]}
                <Blank filled={answered ? rightText : null} />
                {item.prompt.split(BLANK).slice(1).join(BLANK)}
              </>
            ) : item.prompt}
          </h2>

          <div role="group" aria-label="Choose an answer" className={`grid gap-2.5 ${item.options.length > 2 ? 'sm:grid-cols-2' : ''}`}>
            {item.options.map((o, k) => {
              const isRight = k === item.answer;
              const isPicked = k === picked;
              const tone = !answered ? 'border-line bg-surface hover:border-ink-faint'
                : isRight ? 'border-correct bg-correct/10 text-correct-ink'
                : isPicked ? 'border-mistake bg-mistake/10 text-mistake-ink'
                : 'border-line bg-surface opacity-55';
              return (
                <button key={k} type="button" onClick={() => pick(k)} disabled={answered} aria-pressed={isPicked}
                  className={`flex min-h-13 items-center gap-3 rounded-field border px-4 py-3 text-left text-[17px] font-medium transition-colors duration-200 disabled:cursor-default ${tone}`}>
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-[8px] border border-current/25 text-[13px] font-semibold" aria-hidden="true">{k + 1}</span>
                  <span className="min-w-0 flex-1">{o}</span>
                  {answered && isRight && <CheckCircleIcon size={22} weight="fill" className="shrink-0" aria-label="Right answer" />}
                  {answered && isPicked && !isRight && <XCircleIcon size={22} weight="fill" className="shrink-0" aria-label="Your answer" />}
                </button>
              );
            })}
          </div>

          {/* Always in the page, so screen readers announce what appears in it */}
          <div aria-live="polite" className="min-h-6">
            {answered && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                className="flex flex-col gap-1.5">
                <p className={`text-[15px] font-semibold ${gotIt ? 'text-correct-ink' : 'text-mistake-ink'}`}>
                  {gotIt ? 'Right.' : `Not quite. The answer is "${rightText}".`}
                  {item.tag && <span className="ml-2 rounded-tag bg-canvas px-2 py-0.5 text-[13px] font-medium text-ink-soft">{item.tag}</span>}
                </p>
                {item.why && <p className="text-[15px] leading-relaxed text-ink">{item.why}</p>}
              </motion.div>
            )}
          </div>

          {answered && (
            <div className="flex items-center gap-3">
              <button ref={nextRef} type="button" onClick={next}
                className="flex h-12 items-center gap-2 rounded-field bg-brand px-5 font-semibold text-white transition hover:bg-brand-hover active:scale-[0.97]">
                {last ? 'See my score' : 'Next question'} <ArrowRightIcon size={18} />
              </button>
              <span className="hidden text-sm text-ink-faint md:inline">or press Enter</span>
            </div>
          )}
          {!answered && <p className="hidden text-sm text-ink-faint md:block">Tip: press 1 to {item.options.length} to answer</p>}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// The blank in a "___" question. Once answered, the right word slides in on a yellow marker.
function Blank({ filled }) {
  if (filled == null) return <span className="mx-1 inline-block w-[3.2em] border-b-[3px] border-ink-faint align-[-0.1em]" aria-label="blank" />;
  return (
    <span className="relative mx-1 inline-block px-1">
      <motion.span aria-hidden="true" className="absolute inset-x-0 bottom-[6%] top-[14%] origin-left rounded-[3px_6px_4px_7px] bg-marker"
        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.38, ease: [0.2, 0.8, 0.2, 1] }} />
      <span className={`relative ${isNone(filled) ? 'text-[0.7em] font-medium italic text-ink-soft' : ''}`}>{filled}</span>
    </span>
  );
}

const band = (p) => (p === 100 ? 'Perfect' : p >= 80 ? 'Great work' : p >= 50 ? 'Getting there' : 'Worth another go');

/**
 * The finish screen: score ring, what to review, and the page's buttons.
 * saving / saveError come from the page, which saves once when the quiz ends.
 */
export function QuizResult({ results, saving, saveError, children }) {
  const total = results.length;
  const correct = results.filter((r) => r.right).length;
  const pct = Math.round((correct / total) * 100);
  const missed = results.filter((r) => !r.right);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="flex flex-col gap-6 rounded-panel border border-line bg-surface p-6 md:p-10">
      <div className="flex flex-wrap items-center gap-5">
        <ScoreRing score={pct} />
        <div>
          <h2 className="font-display text-[28px] font-semibold tracking-[-0.02em]">{band(pct)}</h2>
          <p className="text-ink-soft">{correct} of {total} right</p>
          <p className="mt-1 min-h-5 text-[13px] text-ink-soft" role="status">
            {saving ? 'Saving your score…' : saveError ? `Your score wasn't saved: ${saveError}` : ''}
          </p>
        </div>
      </div>

      {missed.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-line pt-5">
          <h3 className="text-sm font-semibold">To review</h3>
          {missed.map(({ item }) => {
            const answer = item.options[item.answer];
            return (
              <div key={item.key} className="flex flex-col gap-0.5">
                <p className="text-[15px]">
                  {item.prompt.includes(BLANK) ? (
                    <ReviewLine prompt={item.prompt} answer={answer} />
                  ) : (
                    <span className="rounded-[2px_4px_3px_5px] bg-marker px-1">{answer}</span>
                  )}
                </p>
                {item.why && <p className="text-[13px] leading-snug text-ink-soft">{item.why}</p>}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2.5">{children}</div>
    </motion.div>
  );
}

function ReviewLine({ prompt, answer }) {
  const [before, ...rest] = prompt.split(BLANK);
  const after = rest.join(BLANK);
  if (isNone(answer)) return <>{`${before}${after}`.replace(/\s{2,}/g, ' ').replace(/^\s+/, '')}</>;
  return (
    <>
      {before}
      <span className="rounded-[2px_4px_3px_5px] bg-marker px-1">{answer}</span>
      {after}
    </>
  );
}
