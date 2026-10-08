import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

const EXAMPLES = [
  {
    wrong: 'I am agree',
    right: 'I agree',
    note: 'Agree is already a verb, so it does not need "am".',
  },
  {
    wrong: "She don't like coffee",
    right: "She doesn't like coffee",
    note: 'After she, he or it, use "doesn\'t".',
  },
  {
    wrong: 'I work here since two years',
    right: 'I have worked here for two years',
    note: 'Use "for" with a length of time, and "since" with a start point.',
  },
];

export default function CorrectionDemo() {
  const reduce = useReducedMotion();
  // Pick one example when the page loads
  const [example] = useState(
    () => EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)]
  );
  // With "reduce motion" on, skip all the waiting and show the end result
  const d = (seconds) => (reduce ? 0 : seconds);

  return (
    <div
      role="img"
      aria-label={`Example correction: "${example.wrong}" becomes "${example.right}". ${example.note}`}
      className="relative z-10 w-full max-w-sm rounded-2xl border border-line bg-surface p-5"
    >
      {/* 1. The wrong sentence fades in, gets struck out, then dims */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0.45] }}
        transition={{ delay: d(0.9), duration: d(1.4), times: [0, 0.21, 0.71, 1] }}
        className="relative inline-block text-lg font-medium text-ink-soft"
      >
        {example.wrong}
        <motion.span
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: d(1.0), duration: 0.4, ease: 'easeOut' }}
          className="absolute left-0 right-0 top-1/2 h-[3px] origin-left bg-mistake"
        />
      </motion.p>

      {/* 2. The fixed sentence arrives with a yellow marker swipe */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: d(2.5), duration: 0.4 }}
        className="mt-3 text-lg"
      >
        <span className="relative inline-block">
          <motion.span
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: d(2.8), duration: 0.45, ease: 'easeOut' }}
            className="absolute inset-x-0 bottom-0.5 h-[0.55em] origin-left bg-marker"
          />
          <span className="relative font-semibold text-ink">{example.right}</span>
        </span>
      </motion.p>

      {/* 3. The reason */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: d(3.5), duration: 0.5 }}
        className="mt-3 text-sm text-ink-soft"
      >
        {example.note}
      </motion.p>
    </div>
  );
}