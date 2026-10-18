import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRightIcon } from '@phosphor-icons/react';
import api, { getErrorMessage } from '../lib/api';
import { MISTAKE_LABELS } from '../lib/corrections';
import { mistakePhrase } from '../lib/grammar';

const ease = [0.2, 0.8, 0.2, 1];
const rise = (i) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.04 * i, duration: 0.3, ease } });

export default function GrammarPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/grammar/overview'), api.get('/grammar/quiz')])
      .then(([o, q]) => setData({ ...o.data, quiz: q.data }))
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  // Most mistakes first; ties keep the lesson order (sort is stable)
  const lessons = data ? [...data.lessons].sort((a, b) => b.mistakeCount - a.mistakeCount) : [];
  const ready = data && data.quiz.items.length > 0;

  return (
    <div className="flex flex-col gap-8 px-4 py-8 md:px-11 md:py-10">
      <header>
        <h1 className="text-[clamp(30px,3.4vw,38px)] font-semibold leading-[1.05] tracking-[-0.035em]">Grammar</h1>
        <p className="mt-2 text-[15px] text-ink-soft">Short lessons built around the mistakes you actually make.</p>
      </header>

      {error && <p role="alert" className="text-sm font-medium text-mistake-ink">{error}</p>}
      {!data && !error && <div className="h-40 animate-pulse rounded-panel bg-surface/70" />}

      {data && (
        <>
          <motion.section {...rise(0)}
            className="flex flex-col gap-5 rounded-panel bg-ink px-7 py-7 text-white md:flex-row md:items-center md:justify-between md:px-10 md:py-9">
            <div className="flex max-w-[560px] flex-col gap-1.5">
              <span className="text-sm text-white/60">From your Practice and Writing</span>
              <h2 className="font-display text-[clamp(24px,2.6vw,30px)] font-semibold tracking-[-0.02em]">Practise your mistakes</h2>
              <p className="text-[15px] leading-relaxed text-white/75">
                {ready
                  ? `${data.quiz.have} of your real mistakes are ready. Pick the right version, then see the rule.`
                  : `Do a few more practice sessions first (you have ${data.quiz.have} of ${data.quiz.needed}).`}
              </p>
            </div>
            {ready ? (
              <Link to="/grammar/mine"
                className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-field bg-brand px-6 font-semibold text-white transition hover:-translate-y-px hover:bg-brand-hover active:scale-[0.97]">
                Start <ArrowRightIcon size={18} />
              </Link>
            ) : (
              <button type="button" disabled
                className="flex h-12 shrink-0 cursor-not-allowed items-center justify-center gap-2 rounded-field bg-white/15 px-6 font-semibold text-white/60">
                Start <ArrowRightIcon size={18} />
              </button>
            )}
          </motion.section>

          <section aria-label="Lessons" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {lessons.map((l, i) => {
              const focus = l.type === data.focusType;
              return (
                <motion.div key={l.type} {...rise(i + 1)} className={focus ? 'md:col-span-2' : ''}>
                  <Link to={`/grammar/${l.type}`}
                    className={`flex h-full flex-col gap-3 rounded-panel border bg-surface p-6 transition-colors ${focus ? 'border-brand' : 'border-line hover:border-ink-faint'}`}>
                    {focus && (
                      <span className="w-fit rounded-tag bg-brand px-2.5 py-1 text-[13px] font-semibold text-white">Start here</span>
                    )}
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5">
                      <h2 className="font-display text-[22px] font-semibold tracking-[-0.02em]">{MISTAKE_LABELS[l.type] ?? l.title}</h2>
                      {l.mistakeCount > 0 && (
                        <span className="rounded-tag bg-mistake/10 px-2 py-0.5 text-[13px] font-medium text-mistake-ink">
                          {l.mistakeCount} recent mistake{l.mistakeCount === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                    {focus && <p className="text-[15px] font-medium">You made {mistakePhrase(l.type, l.mistakeCount)} recently.</p>}
                    <p className="text-[15px] leading-snug text-ink-soft">{l.summary}</p>
                    <div className="mt-auto pt-2">
                      {l.mastery == null ? (
                        <span className="text-sm text-ink-faint">Not tried yet</span>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"
                            role="progressbar" aria-label="Mastery" aria-valuenow={l.mastery} aria-valuemin={0} aria-valuemax={100}>
                            <motion.div className="h-full origin-left rounded-full bg-correct"
                              initial={{ scaleX: 0 }} animate={{ scaleX: l.mastery / 100 }} transition={{ delay: 0.3 + 0.04 * i, duration: 0.7, ease }} />
                          </div>
                          <span className="text-sm font-medium text-correct-ink tabular-nums">{l.mastery}%</span>
                        </div>
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}
