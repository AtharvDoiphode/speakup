import { useEffect } from 'react';
import { animate, m as motion, useMotionValue, useTransform } from 'motion/react';
import { DURATION, reveal } from '../lib/motion';

// A 0–100 score as a ring that draws in, with the number counting up in the middle.
// Both run once, together, over the chart duration; a re-render with the same score
// doesn't replay them. size is in pixels (88 by default); the ring and the number scale with it.
export default function ScoreRing({ score, size = 88 }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const count = useMotionValue(0);
  const shown = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    const run = animate(count, score, reveal(DURATION.slow));
    return () => run.stop();
  }, [count, score]);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 88 88" className="size-full -rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" strokeWidth="8" className="stroke-surface-sunken" />
        <motion.circle cx="44" cy="44" r={r} fill="none" strokeWidth="8" strokeLinecap="round" className="stroke-brand"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - score / 100) }}
          transition={reveal(DURATION.slow)} />
      </svg>
      {/* The counting number is for the eye; screen readers get the final score once */}
      <motion.span aria-hidden="true" className="absolute inset-0 flex items-center justify-center font-display font-semibold tabular-nums tracking-[-0.03em]"
        style={{ fontSize: Math.round(size * 0.32) }}>{shown}</motion.span>
      <span className="sr-only">{score}</span>
    </div>
  );
}
