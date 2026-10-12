import { Link } from 'react-router-dom';

// The SpeakUp wordmark. "compact" shows only the square mark (for the narrow sidebar).
export default function Logo({ compact = false }) {
  return (
    <Link
      to="/"
      aria-label="SpeakUp home"
      className="inline-flex items-center gap-2.5 rounded-field font-display text-xl font-bold text-brand"
    >
      <span
        aria-hidden="true"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-field bg-brand text-lg text-white"
      >
        S
      </span>
      {!compact && <span>SpeakUp</span>}
    </Link>
  );
}
