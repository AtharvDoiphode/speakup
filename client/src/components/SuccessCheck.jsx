import { m as motion } from 'motion/react';
import { DURATION, anim, checkDraw, pop } from '../lib/motion';

// A small confirm: the check draws in with a quick scale. `plain` is the check alone
// (where a plain check icon was); otherwise it sits in a filled circle (where a check-circle was).
// Same footprint as the icon it replaces, so nothing moves around it.
export default function SuccessCheck({ size = 22, label, plain = false, className = '' }) {
  return (
    <motion.svg viewBox="0 0 24 24" width={size} height={size} className={`shrink-0 ${className}`}
      role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}
      {...anim(pop)}>
      {!plain && <circle cx="12" cy="12" r="11" className="fill-current" />}
      <motion.path d={plain ? 'M4.5 12.5l4.8 4.8L19.5 7' : 'M7.2 12.4l3.2 3.2 6.4-6.6'} fill="none" strokeWidth={plain ? 2.2 : 2.4}
        strokeLinecap="round" strokeLinejoin="round" className={plain ? 'stroke-current' : 'stroke-surface-card'}
        {...anim(checkDraw, DURATION.instant)} />
    </motion.svg>
  );
}
