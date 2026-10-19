import { motion } from 'motion/react';

// A 0–100 score as a ring that fills in, with the number in the middle.
// size is in pixels (88 by default); the ring and the number scale with it.
export default function ScoreRing({ score, size = 88 }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 88 88" className="size-full -rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" strokeWidth="8" className="stroke-canvas" />
        <motion.circle cx="44" cy="44" r={r} fill="none" strokeWidth="8" strokeLinecap="round" className="stroke-brand"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - score / 100) }}
          transition={{ delay: 0.3, duration: 1, ease: [0.2, 0.8, 0.2, 1] }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display font-semibold tracking-[-0.03em]"
        style={{ fontSize: Math.round(size * 0.32) }}>{score}</span>
    </div>
  );
}
