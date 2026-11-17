import { m as motion } from 'motion/react';
import { breathe, press, pressTransition } from '../lib/motion';

const swatches = [
  ['bg-surface-sunken', 'canvas'],
  ['bg-surface-inverse', 'ink'],
  ['bg-brand', 'brand'],
  ['bg-mistake', 'mistake'],
  ['bg-success', 'correct'],
  ['bg-marker', 'marker'],
];

export default function StyleCheck() {
  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-5xl font-extrabold">Say it clearly.</h1>
      <p className="mt-3 max-w-prose text-text-secondary">
        Body text in Hanken Grotesk. Headings use Bricolage Grotesque. If both
        look different from the default browser font, the fonts are working.
      </p>

      <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {swatches.map(([cls, name]) => (
          <div key={name}>
            <div className={`${cls} h-16 rounded-lg border border-border-subtle`} />
            <p className="mt-1 text-xs">{name}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-lg">
        I work <span className="text-mistake-text line-through">since</span>{' '}
        <span className="rounded bg-marker px-1 font-semibold">for</span> two
        years.
      </p>

      <div className="mt-10 flex items-center gap-8">
        {/* Press feedback from the motion tokens */}
        <motion.button
          whileTap={press}
          transition={pressTransition}
          className="rounded-full bg-brand px-6 py-3 font-semibold text-on-brand"
        >
          Press me
        </motion.button>

        {/* Slow breathing loop, as on the orb at rest */}
        <motion.div
          animate={breathe.animate}
          transition={breathe.transition}
          className="h-14 w-14 rounded-full bg-brand"
        />
      </div>
    </div>
  );
}