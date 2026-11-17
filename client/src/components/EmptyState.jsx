import { Link } from 'react-router-dom';

// Nothing here yet: what this place is for, and the one thing to do next
export default function EmptyState({ icon: Icon, title, text, action, className = '' }) {
  const btn = 'flex min-h-11 w-fit items-center gap-2 rounded-field bg-brand px-5 font-semibold text-on-brand transition hover:bg-brand-700';
  return (
    <section aria-label={title} className={`flex flex-col items-start gap-3 rounded-panel border border-dashed border-border-strong bg-surface-card p-6 md:p-8 ${className}`}>
      {Icon && <Icon size={30} className="text-text-muted" aria-hidden="true" />}
      <h2 className="text-[19px] font-semibold tracking-[-0.01em]">{title}</h2>
      {text && <p className="max-w-[52ch] text-[15px] text-text-secondary">{text}</p>}
      {action?.to && <Link to={action.to} className={`press ${btn}`}>{action.label}</Link>}
      {action?.onClick && <button type="button" onClick={action.onClick} disabled={action.busy} className={`${btn} disabled:opacity-60`}>{action.label}</button>}
    </section>
  );
}
