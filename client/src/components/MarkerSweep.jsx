import { motion } from 'motion/react';

// A marker sweeping across the page while the AI reads (Writing, and marking a scorecard)
export default function MarkerSweep({ rows = 5, gap = 64, top = 34 }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-panel bg-surface/40">
      {Array.from({ length: rows }, (_, row) => (
        <motion.div key={row}
          className="absolute left-6 h-[18px] origin-left rounded-[3px_6px_4px_7px] bg-marker/60"
          style={{ top: top + row * gap, width: '70%' }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: [0, 1, 1], opacity: [0, 1, 0] }}
          transition={{ duration: 1.6, delay: row * 0.32, repeat: Infinity, repeatDelay: 0.6, ease: [0.2, 0.8, 0.2, 1] }} />
      ))}
    </div>
  );
}
