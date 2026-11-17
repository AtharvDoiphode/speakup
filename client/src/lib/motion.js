// SpeakUp motion tokens: the ONLY place durations, easings and springs are defined.
// Calm, quick and confident: nothing bouncy, nothing a returning user has to wait for.
// Components import variants and helpers from here; CSS reads the same values as
// custom properties (cssVars, applied once in main.jsx).
// Rules: only transform and opacity move (plus SVG stroke-dashoffset / pathLength);
// exits take ~65% of their enter; reduced motion leaves opacity fades of 0.1s at most.

/** Durations in seconds */
export const DURATION = {
  instant: 0.1, // press and hover feedback
  fast: 0.15, // toggles, tooltips, small state changes
  base: 0.22, // cards, dropdowns, toasts
  slow: 0.32, // page and modal transitions
  chart: 0.6, // data and score reveals, once only
};

/** Cubic-bezier easings */
export const EASE = {
  out: [0.22, 1, 0.36, 1], // enter: decelerate
  in: [0.4, 0, 1, 1], // exit: accelerate
  inOut: [0.65, 0, 0.35, 1], // move from one place to another
};

/** Springs: critically damped, so they settle without overshooting */
export const SPRING = {
  snappy: { type: 'spring', stiffness: 520, damping: 46, mass: 1 }, // layout changes, tab indicators
  gentle: { type: 'spring', stiffness: 140, damping: 24, mass: 1 }, // the orb and score ring
};

/** Periods of the few looping animations, in seconds (each loop is slower than 3 flashes a second) */
export const LOOP = {
  breathe: 4.2, // the orb at rest: scale 1 to 1.04 and back
  pulse: 1.2, // the orb while speaking: a steady pulse
  spin: 9, // the orb while thinking: one slow turn
  sweep: 1.6, // the marker loader
  sweepRest: 0.6, // pause between sweeps
};

const EXIT_RATIO = 0.65;
const round = (n) => Math.round(n * 1000) / 1000;

/** Transition for something arriving: decelerates */
export const enter = (size = 'base', extra = {}) => ({ duration: DURATION[size], ease: EASE.out, ...extra });
/** Transition for something leaving: accelerates, ~65% of the enter */
export const exit = (size = 'base', extra = {}) => ({ duration: round(DURATION[size] * EXIT_RATIO), ease: EASE.in, ...extra });
/** Transition for something moving from A to B */
export const move = (size = 'base', extra = {}) => ({ duration: DURATION[size], ease: EASE.inOut, ...extra });

/** Delay for the nth item of a list: 30ms each, never more than 300ms in total */
export const STAGGER = { step: 0.03, max: 0.3, items: 12 };
export const stagger = (n) => round(Math.min(Math.max(0, n) * STAGGER.step, STAGGER.max));

// A variant set: hidden -> show (enter, with an optional delay as `custom`) -> exit (faster).
// Anything leaving stops taking clicks at once, so a fading panel never catches a tap; anything
// shown takes them again (an exit interrupted by a quick return must not leave it dead).
const variant = (hidden, shown, size, gone = hidden) => ({
  hidden,
  show: (delay = 0) => ({ ...shown, pointerEvents: 'auto', transition: enter(size, { delay }) }),
  exit: { ...gone, pointerEvents: 'none', transition: exit(size) },
});

export const fade = variant({ opacity: 0 }, { opacity: 1 }, 'base');
export const fadeUp = variant({ opacity: 0, y: 8 }, { opacity: 1, y: 0 }, 'base', { opacity: 0 });
export const scaleIn = variant({ opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1 }, 'base', { opacity: 0, scale: 0.98 });
export const slideIn = variant({ opacity: 0, x: 12 }, { opacity: 1, x: 0 }, 'base', { opacity: 0, x: -8 });
export const sheet = variant({ y: '100%' }, { y: 0 }, 'slow');
export const drawer = variant({ opacity: 0, y: 24 }, { opacity: 1, y: 0 }, 'base');
export const backdrop = variant({ opacity: 0 }, { opacity: 1 }, 'base');
// Route change: fade plus an 8px rise. The old page is removed at once (no exit animation), so
// only one page is ever mounted, rapid clicks can't stack pages, and a change takes one page duration.
export const page = {
  ...variant({ opacity: 0, y: 8 }, { opacity: 1, y: 0 }, 'slow'),
  exit: { opacity: 0, pointerEvents: 'none', transition: { duration: 0 } },
};

/** The reduced-motion version of any variant: opacity only, 0.1s at most */
export const reduce = () => ({
  hidden: { opacity: 0 },
  show: () => ({ opacity: 1, transition: { duration: DURATION.instant, ease: EASE.out } }),
  exit: { opacity: 0, transition: { duration: round(DURATION.instant * EXIT_RATIO), ease: EASE.in } },
});

/** True when the device asks for reduced motion */
export const prefersReduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Props for an element that animates in (and out, inside AnimatePresence) */
export const anim = (v = fadeUp, delay = 0) => ({
  variants: prefersReduced() ? reduce(v) : v,
  initial: 'hidden',
  animate: 'show',
  exit: 'exit',
  custom: delay,
});

/** Props for the nth item of a list: staggered fade-up for the first 12, nothing after that */
export const listItem = (n) => (n < STAGGER.items ? anim(fadeUp, stagger(n)) : {});

/** One-off reveals (score ring, counts, bars): drawn once over the chart duration */
export const reveal = (delay = 0) => enter('chart', { delay });
/** A strike line drawing across a mistake, then the marker sweeping in behind the fix */
export const strike = (delay = 0) => enter('base', { delay });
export const markerSweep = (delay = 0) => enter('slow', { delay });
/** When the marker starts after a strike that began at `delay` */
export const afterStrike = (delay = 0) => round(delay + DURATION.base);
/** The correction moment on the live screen: the answer settles, the strike draws, the marker sweeps, then the notes */
export const CORRECTION = {
  strike: DURATION.slow,
  mark: afterStrike(DURATION.slow),
  notes: round(afterStrike(DURATION.slow) + DURATION.slow),
};

/** Slow breathing for things at rest (the orb's idle state): scale 1 to 1.04 and back */
export const breathe = {
  animate: { scale: [1, 1.04, 1] },
  transition: { duration: LOOP.breathe, repeat: Infinity, ease: EASE.inOut },
};

/** No animation at all (jump straight to the end state) */
export const NONE = { duration: 0 };

/** The marker loader: the same sweep as a correction, looping row by row, slower than 3 flashes a second */
export const sweepLoop = {
  animate: { scaleX: [0, 1, 1], opacity: [0, 1, 0] },
  transition: (row = 0) => ({ duration: LOOP.sweep, delay: stagger(row * 10), repeat: Infinity, repeatDelay: LOOP.sweepRest, ease: EASE.out }),
};

/** Press feedback for motion components (CSS buttons use the same 0.97 in index.css) */
export const press = { scale: 0.97 };
export const pressTransition = enter('instant');

/** Success: a check that draws in with a quick scale */
export const checkDraw = {
  hidden: { pathLength: 0, opacity: 0 },
  show: (delay = 0) => ({ pathLength: 1, opacity: 1, transition: enter('base', { delay }) }),
};
export const pop = {
  hidden: { scale: 0.85, opacity: 0 },
  show: (delay = 0) => ({ scale: 1, opacity: 1, transition: { ...SPRING.snappy, delay } }),
};
/** Mistake: one calm shake, 4px at most, never repeated */
export const shake = { x: [0, -4, 4, -3, 2, 0], transition: move('slow') };

/** CSS custom properties for the same tokens (transitions, keyframes in index.css) */
export const cssVars = () => ({
  ...Object.fromEntries(Object.entries(DURATION).map(([k, v]) => [`--motion-${k}`, `${v}s`])),
  ...Object.fromEntries(Object.entries(EASE).map(([k, v]) => [`--motion-ease-${k.toLowerCase()}`, `cubic-bezier(${v.join(', ')})`])),
  '--motion-exit-ratio': String(EXIT_RATIO),
});
export function applyMotionCss(root = document.documentElement) {
  for (const [k, v] of Object.entries(cssVars())) root.style.setProperty(k, v);
}
