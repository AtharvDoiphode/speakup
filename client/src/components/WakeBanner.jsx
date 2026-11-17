import { useEffect, useState } from 'react';
import { SpinnerGapIcon } from '@phosphor-icons/react';
import { SERVER_WAKING } from '../lib/api';

// The free server sleeps when nobody has used it for a while; the first visit can take a minute
export default function WakeBanner() {
  const [waking, setWaking] = useState(false);
  useEffect(() => {
    const on = (e) => setWaking(Boolean(e.detail));
    window.addEventListener(SERVER_WAKING, on);
    return () => window.removeEventListener(SERVER_WAKING, on);
  }, []);
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center px-3">
      {waking && (
        <p className="flex items-center gap-2.5 rounded-panel border border-border-subtle bg-surface-card px-4 py-3 text-[15px] font-medium" data-waking>
          <SpinnerGapIcon size={18} className="animate-spin text-brand" aria-hidden="true" />
          Waking the server up… The first visit can take up to a minute.
        </p>
      )}
    </div>
  );
}
