// Placeholders shaped like the content they stand in for, so nothing jumps when it arrives.
// Each one says "Loading" to screen readers once (aria-busy + a polite status).
const Block = ({ className = '' }) => <div aria-hidden="true" className={`animate-pulse rounded-field bg-surface-card/70 ${className}`} />;

function Busy({ label = 'Loading', className = '', children }) {
  return (
    <div aria-busy="true" className={className}>
      <span role="status" className="sr-only">{label}…</span>
      {children}
    </div>
  );
}

/** Rows in a card: history, the vocabulary deck, family members */
export function ListSkeleton({ rows = 6, label }) {
  return (
    <Busy label={label} className="flex flex-col overflow-hidden rounded-panel border border-border-subtle bg-surface-card">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} aria-hidden="true" className="flex items-center gap-3 border-b border-border-subtle px-4 py-3 last:border-0 md:px-5">
          <div className="size-10 shrink-0 animate-pulse rounded-field bg-surface-sunken" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-3.5 w-2/5 animate-pulse rounded-tag bg-surface-sunken" />
            <div className="h-3 w-3/5 animate-pulse rounded-tag bg-surface-sunken" />
          </div>
        </div>
      ))}
    </Busy>
  );
}

/** A grid of cards: grammar lessons, vocabulary stats */
export function CardsSkeleton({ count = 4, label, className = 'grid gap-4 md:grid-cols-2' }) {
  return (
    <Busy label={label} className={className}>
      {Array.from({ length: count }, (_, i) => <Block key={i} className="h-40 rounded-panel" />)}
    </Busy>
  );
}

/** The summary line and two chart cards: progress */
export function ChartsSkeleton({ label }) {
  return (
    <Busy label={label} className="flex flex-col gap-5">
      <Block className="h-5 w-3/4 max-w-[70ch] rounded-tag" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Block className="h-72 rounded-panel" />
        <Block className="h-72 rounded-panel" />
      </div>
    </Busy>
  );
}

/** Sections with labelled fields: settings */
export function FormSkeleton({ sections = 3, label }) {
  return (
    <Busy label={label} className="flex flex-col gap-5">
      {Array.from({ length: sections }, (_, i) => (
        <div key={i} aria-hidden="true" className="flex flex-col gap-4 rounded-panel border border-border-subtle bg-surface-card p-5 md:p-6">
          <div className="h-4 w-32 animate-pulse rounded-tag bg-surface-sunken" />
          <div className="h-12 animate-pulse rounded-field bg-surface-sunken" />
        </div>
      ))}
    </Busy>
  );
}

/** A whole page while its code loads: a title and a list */
export function PageSkeleton({ label = 'Loading the page' }) {
  return (
    <Busy label={label} className="flex flex-col gap-6 px-4 py-8 md:px-11 md:py-10">
      <Block className="h-10 w-64 rounded-tag" />
      <Block className="h-4 w-80 max-w-full rounded-tag" />
      <CardsSkeleton count={2} label="" />
    </Busy>
  );
}
