import { motion } from 'motion/react';

const spring = { type: 'spring', stiffness: 500, damping: 40 };

/**
 * A row of options where exactly one is chosen, with a white pill that slides to it.
 *  - label: what the group is called, for screen readers
 *  - options: [{ value, label }]
 *  - layoutId: unique per group on the page, so each pill slides on its own
 *  - size: 'md' (default) or 'sm'
 */
export default function Segmented({ label, options, value, onChange, layoutId, size = 'md' }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-1 rounded-field border border-line bg-canvas p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)}
            className={`relative rounded-[9px] ${size === 'sm' ? 'h-8 text-sm' : 'h-[38px] text-[15px]'} ${
              on ? 'font-semibold text-ink' : 'font-medium text-ink-soft hover:text-ink'
            }`}>
            {on && <motion.span layoutId={layoutId} transition={spring} className="absolute inset-0 rounded-[9px] border border-line bg-surface" />}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
