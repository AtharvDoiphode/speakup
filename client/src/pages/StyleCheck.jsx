import { motion } from 'motion/react';

const swatches = [
  ['bg-cloud', 'cloud'],
  ['bg-ink', 'ink'],
  ['bg-brand', 'brand'],
  ['bg-mistake', 'mistake'],
  ['bg-correct', 'correct'],
  ['bg-marker', 'marker'],
];

export default function StyleCheck() {
  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-5xl font-extrabold">Say it clearly.</h1>
      <p className="mt-3 max-w-prose text-ink-soft">
        Body text in Hanken Grotesk. Headings use Bricolage Grotesque. If both
        look different from the default browser font, the fonts are working.
      </p>

      <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {swatches.map(([cls, name]) => (
          <div key={name}>
            <div className={`${cls} h-16 rounded-lg border border-line`} />
            <p className="mt-1 text-xs">{name}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-lg">
        I work <span className="text-mistake-deep line-through">since</span>{' '}
        <span className="rounded bg-marker px-1 font-semibold">for</span> two
        years.
      </p>

      <div className="mt-10 flex items-center gap-8">
        {/* Spring button: bounces on hover and press */}
        <motion.button
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.93 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          className="rounded-full bg-brand px-6 py-3 font-semibold text-white"
        >
          Press me
        </motion.button>

        {/* Looping pulse: proves continuous animation works */}
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="h-14 w-14 rounded-full bg-brand"
        />
      </div>
    </div>
  );
}