import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowClockwiseIcon, ArrowRightIcon, CheckIcon, FilePdfIcon, QuotesIcon } from '@phosphor-icons/react';
import api, { getErrorMessage } from '../lib/api';
import { againBody, SCORE_TITLE } from '../lib/modes';
import ScoreRing from './ScoreRing';
import MarkerSweep from './MarkerSweep';

const ease = [0.2, 0.8, 0.2, 1];

// The heading takes focus when the scorecard appears, so screen readers start there
const useFocusOnMount = () => useCallback((el) => el?.focus({ preventScroll: true }), []);

/**
 * The scorecard at the top of an interview or debate transcript.
 *  - convo: the conversation (mode, modeConfig, difficulty, scorecard)
 *  - onScorecard(card): called when a retry succeeds
 */
export default function Scorecard({ convo, onScorecard }) {
  const navigate = useNavigate();
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState('');
  const [again, setAgain] = useState(false);
  const focusRef = useFocusOnMount();
  const card = convo.scorecard;
  const title = SCORE_TITLE[convo.mode];

  async function retry() {
    setRetrying(true);
    setError('');
    try {
      const { data } = await api.post(`/conversations/${convo._id}/scorecard`);
      onScorecard(data.scorecard);
    } catch (err) {
      setError(getErrorMessage(err));
    }
    setRetrying(false);
  }

  async function practiseAgain() {
    setAgain(true);
    setError('');
    try {
      const { data } = await api.post('/conversations', againBody(convo));
      navigate(`/practice/${data.conversation._id}`);
    } catch (err) {
      setError(getErrorMessage(err));
      setAgain(false);
    }
  }

  const actions = (
    <div className="flex flex-wrap gap-2.5 print:hidden">
      <button type="button" onClick={practiseAgain} disabled={again}
        className="flex min-h-12 items-center gap-2 rounded-field bg-brand px-5 font-semibold text-white transition hover:bg-brand-hover active:scale-[0.97] disabled:opacity-70">
        <ArrowClockwiseIcon size={18} /> {again ? 'Starting…' : 'Practise again'}
      </button>
      {card && (
        <button type="button" onClick={() => window.print()}
          className="flex min-h-12 items-center gap-2 rounded-field border border-line bg-surface px-5 font-semibold hover:border-ink-faint">
          <FilePdfIcon size={18} /> Save as PDF
        </button>
      )}
    </div>
  );

  if (!card) {
    return (
      <section aria-labelledby="scorecard-title" className="relative flex flex-col items-start gap-3 overflow-hidden rounded-panel border border-line bg-surface p-6 md:p-8 print:hidden" data-scorecard="missing">
        {retrying && <MarkerSweep rows={3} gap={44} top={24} />}
        <h2 id="scorecard-title" ref={focusRef} tabIndex={-1} className="font-display text-[24px] font-semibold tracking-[-0.02em] outline-none">
          {retrying ? 'Marking your answers…' : 'Your scorecard isn\'t ready yet'}
        </h2>
        <p className="text-[15px] text-ink-soft">
          {retrying ? 'This can take up to a minute.' : 'The marking didn\'t finish this time. Your answers are saved, so you can try again.'}
        </p>
        {error && <p role="alert" className="text-sm font-medium text-mistake-ink">{error}</p>}
        <div className="flex flex-wrap gap-2.5">
          <button type="button" onClick={retry} disabled={retrying}
            className="flex min-h-12 items-center gap-2 rounded-field bg-brand px-5 font-semibold text-white transition hover:bg-brand-hover disabled:opacity-70">
            <ArrowClockwiseIcon size={18} /> Try again
          </button>
          {actions}
        </div>
      </section>
    );
  }

  return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease }}
      aria-labelledby="scorecard-title" data-scorecard="ready"
      className="flex flex-col gap-6 rounded-panel border border-line bg-surface p-6 md:p-8 print:gap-3 print:rounded-none print:border-0 print:border-b-2 print:border-black print:p-0 print:pb-4">
      <div className="flex flex-wrap items-center gap-5 print:hidden">
        <ScoreRing score={card.overall} size={112} />
        <div>
          <h2 id="scorecard-title" ref={focusRef} tabIndex={-1} className="font-display text-[clamp(26px,3vw,34px)] font-semibold leading-tight tracking-[-0.025em] outline-none">
            {title} <span className="sr-only">{card.overall} out of 100</span>
          </h2>
          <p className="text-[15px] text-ink-soft">Worked out from your five skill ratings below.</p>
        </div>
      </div>
      {/* On paper: the same, as plain text */}
      <h2 className="hidden text-[14pt] font-bold print:block">{title}: {card.overall} / 100</h2>

      <ul className="flex flex-col gap-3.5 print:gap-1.5" aria-label="Skills">
        {card.categories.map((c, i) => (
          <li key={c.key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 md:grid-cols-[150px_auto_minmax(0,1fr)] md:items-center print:grid-cols-[130px_auto_minmax(0,1fr)] print:items-center">
            <span className="text-[15px] font-semibold">{c.label}</span>
            <span className="flex items-center gap-2.5 md:order-none">
              <span role="meter" aria-valuemin={1} aria-valuemax={5} aria-valuenow={c.score} aria-label={`${c.label}: ${c.score} out of 5`} className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <motion.span key={n} initial={{ scaleY: 0.3, opacity: 0 }} animate={{ scaleY: 1, opacity: 1 }} transition={{ delay: 0.15 + i * 0.06 + n * 0.03, duration: 0.25 }}
                    className={`h-3 w-6 rounded-[3px] ${n <= c.score ? 'bg-brand print:bg-black' : 'bg-canvas print:border print:border-black print:bg-white'}`} />
                ))}
              </span>
              <span className="w-8 text-sm font-semibold tabular-nums" aria-hidden="true">{c.score}/5</span>
            </span>
            <span className="col-span-2 text-sm text-ink-soft md:col-span-1 print:col-span-1">{c.note}</span>
          </li>
        ))}
      </ul>

      <div className="grid gap-4 md:grid-cols-2 print:grid-cols-2 print:gap-3">
        <div className="flex flex-col gap-2 rounded-field bg-correct/8 p-4 print:bg-white print:p-0">
          <h3 className="text-sm font-semibold text-correct-ink print:text-black">Strengths</h3>
          {card.strengths.length ? card.strengths.map((s) => (
            <p key={s} className="flex gap-2 text-[15px] leading-snug"><CheckIcon size={16} className="mt-0.5 shrink-0 text-correct-ink" aria-hidden="true" />{s}</p>
          )) : <p className="text-[15px] text-ink-soft">None listed this time.</p>}
        </div>
        <div className="flex flex-col gap-2 rounded-field bg-mistake/8 p-4 print:bg-white print:p-0">
          <h3 className="text-sm font-semibold text-mistake-ink print:text-black">Improvements</h3>
          {card.improvements.length ? card.improvements.map((s) => (
            <p key={s} className="flex gap-2 text-[15px] leading-snug"><ArrowRightIcon size={16} className="mt-0.5 shrink-0 text-mistake-ink" aria-hidden="true" />{s}</p>
          )) : <p className="text-[15px] text-ink-soft">None listed this time.</p>}
        </div>
      </div>

      {(card.highlight?.title || card.highlight?.why) && (
        <div className="flex flex-col gap-1.5 print:break-inside-avoid">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold"><QuotesIcon size={16} className="text-ink-soft" aria-hidden="true" /> {convo.mode === 'debate' ? 'Your best round' : 'Your best answer'}</h3>
          <p className="font-display text-[19px] font-semibold leading-snug print:text-[11pt]">
            <span className="rounded-[3px_6px_4px_7px] bg-marker px-1.5 print:bg-white print:px-0 print:underline">{card.highlight.title}</span>
          </p>
          {card.highlight.why && <p className="text-[15px] text-ink-soft">{card.highlight.why}</p>}
        </div>
      )}

      {error && <p role="alert" className="text-sm font-medium text-mistake-ink">{error}</p>}
      {actions}
    </motion.section>
  );
}
