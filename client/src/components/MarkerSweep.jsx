import { m as motion, useReducedMotion } from 'motion/react';
import { NONE, sweepLoop } from '../lib/motion';
import { usePageVisible } from '../hooks/usePageVisible';

// A marker sweeping across the page while the AI reads (Writing, and marking a scorecard).
// The same sweep as the correction marker; it loops only while the tab is visible,
// and stands still (a faint row of markers) under reduced motion.
export default function MarkerSweep({ rows = 5, gap = 64, top = 34 }) {
  const reduce = useReducedMotion();
  const visible = usePageVisible();
  const still = reduce || !visible;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-panel bg-surface-card/40">
      {Array.from({ length: rows }, (_, row) => (
        <motion.div key={row}
          className="absolute left-6 h-[18px] w-[70%] origin-left rounded-[3px_6px_4px_7px] bg-marker/60"
          style={{ top: top + row * gap }}
          initial={still ? { scaleX: 1, opacity: 0.5 } : { scaleX: 0, opacity: 0 }}
          animate={still ? { scaleX: 1, opacity: 0.5 } : sweepLoop.animate}
          transition={still ? NONE : sweepLoop.transition(row)} />
      ))}
    </div>
  );
}
