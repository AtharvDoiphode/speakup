import { Suspense, useEffect, useRef, useState } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { m as motion } from 'motion/react';
import { anim, page } from '../lib/motion';
import { pageName, titleFor } from '../lib/titles';
import Sidebar from './Sidebar';
import MobileTabBar from './MobileTabBar';
import ErrorBoundary from './ErrorBoundary';
import { PageSkeleton } from './Skeleton';

// Moves focus to the new page's heading once it has rendered (pages load their code on demand)
function focusHeading(main) {
  let frames = 0;
  const tryFocus = () => {
    const h1 = main?.querySelector('h1');
    if (h1) {
      h1.setAttribute('tabindex', '-1');
      h1.focus({ preventScroll: true });
    } else if (frames++ < 120) requestAnimationFrame(tryFocus);
    else main?.focus({ preventScroll: true });
  };
  requestAnimationFrame(tryFocus);
}

export default function AppShell() {
  const location = useLocation();
  const outlet = useOutlet();
  const mainRef = useRef(null);
  const lastPath = useRef(location.pathname); // the first page you land on keeps the browser's own focus
  const [announce, setAnnounce] = useState('');

  // Every route: its own tab title. After a route change: focus the page heading and say where you are.
  useEffect(() => {
    document.title = titleFor(location.pathname);
    if (lastPath.current === location.pathname) return;
    lastPath.current = location.pathname;
    focusHeading(mainRef.current);
    setAnnounce(`${pageName(location.pathname)} page`);
  }, [location.pathname]);

  // The live conversation (/practice/<id>) and the flashcards need the room,
  // so the sidebar stays as the narrow icon rail there, even on wide screens
  const isLive = /^\/practice\/[^/]+|^\/vocabulary\/review/.test(location.pathname);

  return (
    // print:block: on paper the sidebar is hidden, so the page must not keep its column
    <div className={`min-h-dvh bg-surface-canvas md:grid md:grid-cols-[72px_1fr] print:block print:bg-print-paper ${isLive ? '' : 'lg:grid-cols-[240px_1fr]'}`}>
      <a href="#main" className="sr-only z-[70] rounded-field bg-brand px-4 py-3 font-semibold text-on-brand focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:flex focus:min-h-11 focus:items-center">
        Skip to content
      </a>
      <aside aria-label="Sidebar" className="sticky top-0 hidden h-dvh md:block print:hidden">
        {isLive ? (
          <Sidebar compact />
        ) : (
          <>
            <div className="hidden h-full lg:block"><Sidebar /></div>
            <div className="h-full lg:hidden"><Sidebar compact /></div>
          </>
        )}
      </aside>

      <main id="main" ref={mainRef} tabIndex={-1} className="relative min-w-0 pb-[96px] outline-none md:pb-0 print:pb-0">
        {/* No initial={false} here: it would be passed down and stop every animation
            on the first page you land on (the dashboard's cards, bars and sparklines).
            The old page is removed at once (keyed, no exit animation): one page mounted at a
            time even with rapid clicks, and a change takes one page duration (under 0.4s). */}
        <motion.div key={location.pathname} {...anim(page)}>
          <ErrorBoundary>
            <Suspense fallback={<PageSkeleton />}>{outlet}</Suspense>
          </ErrorBoundary>
        </motion.div>
      </main>
      <p className="sr-only" aria-live="polite" data-route-announcer>{announce}</p>

      <MobileTabBar />
    </div>
  );
}
