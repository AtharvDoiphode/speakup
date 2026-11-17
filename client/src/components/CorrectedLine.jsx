import { useState } from 'react';
import { m as motion } from 'motion/react';
import { ArrowCounterClockwiseIcon, CheckIcon } from '@phosphor-icons/react';
import { buildSegments } from '../lib/corrections';
import { CORRECTION as T, afterStrike, anim, enter, fadeUp, markerSweep, strike } from '../lib/motion';

export default function CorrectedLine({ text, mistakes = [] }) {
  const [run, setRun] = useState(0);
  const segments = buildSegments(text, mistakes);

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px] md:gap-9">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-3.5 text-sm text-text-secondary">
          <span>Your last answer</span>
          {mistakes.length > 0 && (
            <button type="button" onClick={() => setRun((r) => r + 1)}
              className="flex items-center gap-1.5 text-[13px] font-medium text-brand hover:text-brand-700">
              <ArrowCounterClockwiseIcon size={14} />
              Replay correction
            </button>
          )}
        </div>
        <p key={run} className="text-[clamp(22px,2.4vw,30px)] leading-[1.5] tracking-[-0.01em] text-pretty">
          {segments.map((seg, i) => (seg.type === 'text' ? <span key={i}>{seg.text}</span> : <Fix key={i} seg={seg} />))}
        </p>
      </div>

      <motion.ol
        key={run}
        {...anim(fadeUp, mistakes.length ? T.notes : T.strike)}
        className="flex flex-col gap-4 md:gap-[22px] md:border-l md:border-border-subtle md:pl-[18px] md:pt-[34px]"
      >
        {mistakes.length ? (
          mistakes.map((m, i) => (
            <li key={i} className="flex gap-2 text-[13px] leading-[1.45] text-text-secondary">
              <span className="font-semibold text-text-primary">{i + 1}</span>
              <span>{m.rule}</span>
            </li>
          ))
        ) : (
          <li className="flex gap-2 text-[13px] leading-[1.45] text-success-text">
            <CheckIcon size={15} className="mt-0.5 shrink-0" />
            No mistakes in that one. Nice.
          </li>
        )}
      </motion.ol>
    </div>
  );
}

/**
 * One correction: the wrong words struck through, then the fix on a yellow marker.
 * All props after seg are optional; the live screen passes none of them.
 *  - delay: when the strike starts (seconds). The marker follows once the strike has drawn, as on the live screen.
 *  - n: sets data-fix={n} on the element, so a page can find or scroll to it
 *  - onSelect / active: makes the fix a button; active shows a 2px brand outline
 */
export function Fix({ seg, delay = T.strike, n, active = false, onSelect }) {
  const markAt = afterStrike(delay);
  const body = (
    <>
      <del className="relative text-mistake-text no-underline">
        {seg.wrong}
        <motion.span aria-hidden="true"
          className="absolute inset-x-0 top-[58%] h-[3px] origin-left bg-mistake"
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={strike(delay)} />
      </del>
      {seg.right && (
        <>
          {' '}
          <ins className="relative inline-block px-1 no-underline">
            <motion.span aria-hidden="true"
              className="absolute inset-x-0 bottom-[8%] top-[18%] origin-left rounded-[3px_6px_4px_7px] bg-marker"
              initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
              transition={markerSweep(markAt)} />
            <motion.span className="relative" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={enter('fast', { delay: markAt })}>
              {seg.right}
            </motion.span>
            <sup className="relative ml-0.5 text-[0.45em] font-semibold text-text-secondary">{seg.n}</sup>
          </ins>
        </>
      )}
    </>
  );

  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} aria-pressed={active} data-fix={n}
        className={`inline rounded-tag text-left align-baseline ${active ? 'outline-2 outline-offset-2 outline-brand' : ''}`}>
        {body}
      </button>
    );
  }
  if (n != null) return <span data-fix={n}>{body}</span>;
  return body; // exactly as before
}