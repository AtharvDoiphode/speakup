import { Link } from 'react-router-dom';
import { CompassIcon } from '@phosphor-icons/react';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-start gap-3 px-4 py-16 md:px-11">
      <CompassIcon size={36} className="text-text-secondary" aria-hidden="true" />
      <h1 className="text-[clamp(28px,3.4vw,38px)] font-semibold tracking-[-0.03em]">We couldn't find that page</h1>
      <p className="max-w-[48ch] text-[15px] text-text-secondary">The link may be old or mistyped. Everything you've saved is still here.</p>
      <Link to="/" className="press flex min-h-11 items-center rounded-field bg-brand px-5 font-semibold text-on-brand hover:bg-brand-700">Go to Home</Link>
    </div>
  );
}
