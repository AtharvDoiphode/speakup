import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowCounterClockwiseIcon, CheckIcon } from '@phosphor-icons/react';
import { buildSegments } from '../lib/corrections';

// The correction rewrite moment
const T = { strike: 0.5, mark: 0.82, notes: 1.3 };

export default function CorrectedLine({ text, mistakes = [] }) {
  const [run, setRun] = useState(0);
  const segments = buildSegments(text, mistakes);

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px] md:gap-9">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-3.5 text-sm text-ink-soft">
          <span>Your last answer</span>
          {mistakes.length > 0 && (
            <button type="button" onClick={() => setRun((r) => r + 1)}
              className="flex items-center gap-1.5 text-[13px] font-medium text-brand hover:text-brand-hover">
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
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: mistakes.length ? T.notes : 0.2, duration: 0.24 }}
        className="flex flex-col gap-4 md:gap-[22px] md:border-l md:border-line md:pl-[18px] md:pt-[34px]"
      >
        {mistakes.length ? (
          mistakes.map((m, i) => (
            <li key={i} className="flex gap-2 text-[13px] leading-[1.45] text-ink-soft">
              <span className="font-semibold text-ink">{i + 1}</span>
              <span>{m.rule}</span>
            </li>
          ))
        ) : (
          <li className="flex gap-2 text-[13px] leading-[1.45] text-correct-ink">
            <CheckIcon size={15} className="mt-0.5 shrink-0" />
            No mistakes in that one. Nice.
          </li>
        )}
      </motion.ol>
    </div>
  );
}

function Fix({ seg }) {
  return (
    <>
      <del className="relative text-mistake-ink no-underline">
        {seg.wrong}
        <motion.span aria-hidden="true"
          className="absolute inset-x-0 top-[58%] h-[3px] origin-left bg-mistake"
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ delay: T.strike, duration: 0.26, ease: [0.3, 0.7, 0.3, 1] }} />
      </del>
      {seg.right && (
        <>
          {' '}
          <ins className="relative inline-block px-1 no-underline">
            <motion.span aria-hidden="true"
              className="absolute inset-x-0 bottom-[8%] top-[18%] origin-left rounded-[3px_6px_4px_7px] bg-marker"
              initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
              transition={{ delay: T.mark, duration: 0.38, ease: [0.2, 0.8, 0.2, 1] }} />
            <motion.span className="relative" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: T.mark, duration: 0.16 }}>
              {seg.right}
            </motion.span>
            <sup className="relative ml-0.5 text-[0.45em] font-semibold text-ink-soft">{seg.n}</sup>
          </ins>
        </>
      )}
    </>
  );
}