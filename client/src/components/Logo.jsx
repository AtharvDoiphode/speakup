import { Link } from 'react-router-dom';

// The SpeakUp logo, linking home. "compact" shows only the mark (the narrow sidebar rail).
// The files are built by scripts/make-icons.mjs from scripts/brand-colors.mjs.
export default function Logo({ compact = false }) {
  return (
    <Link to="/" aria-label="SpeakUp home" className="inline-flex shrink-0 rounded-field">
      {compact ? (
        <img src="/brand/logo-mark.svg" alt="" width={40} height={40} className="size-10 [color-scheme:light]" />
      ) : (
        <img src="/brand/logo-horizontal.svg" alt="" width={132} height={32} className="h-8 w-auto" />
      )}
    </Link>
  );
}
