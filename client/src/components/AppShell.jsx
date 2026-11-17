import { useEffect, useRef } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { m as motion } from 'motion/react';
import { anim, page } from '../lib/motion';
import Sidebar from './Sidebar';
import MobileTabBar from './MobileTabBar';

export default function AppShell() {
  const location = useLocation();
  const outlet = useOutlet(); // captured so the old page can animate out
  const mainRef = useRef(null);
  const firstRoute = useRef(true);

  // Focus is never lost on a route change: if it was inside the page that is leaving
  // (or already dropped to <body>), it moves to <main>, where the new page arrives.
  useEffect(() => {
    if (firstRoute.current) { firstRoute.current = false; return; }
    const active = document.activeElement;
    if (!active || active === document.body || mainRef.current?.contains(active)) mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  // The live conversation (/practice/<id>) and the flashcards need the room,
  // so the sidebar stays as the narrow icon rail there, even on wide screens
  const isLive = /^\/practice\/[^/]+|^\/vocabulary\/review/.test(location.pathname);

  return (
    // print:block: on paper the sidebar is hidden, so the page must not keep its column
    <div className={`min-h-dvh bg-surface-canvas md:grid md:grid-cols-[72px_1fr] print:block print:bg-print-paper ${isLive ? '' : 'lg:grid-cols-[240px_1fr]'}`}>
      <aside className="sticky top-0 hidden h-dvh md:block print:hidden">
        {isLive ? (
          <Sidebar compact />
        ) : (
          <>
            <div className="hidden h-full lg:block"><Sidebar /></div>
            <div className="h-full lg:hidden"><Sidebar compact /></div>
          </>
        )}
      </aside>

      <main ref={mainRef} tabIndex={-1} className="relative min-w-0 pb-[96px] outline-none md:pb-0 print:pb-0">
        {/* No initial={false} here: it would be passed down and stop every animation
            on the first page you land on (the dashboard's cards, bars and sparklines).
            The old page is removed at once (keyed, no exit animation): one page mounted at a
            time even with rapid clicks, and a change takes one page duration (under 0.4s).
            AnimatePresence would only add a wait before the new page can start. */}
        <motion.div key={location.pathname} {...anim(page)}>
          {outlet}
        </motion.div>
      </main>

      <MobileTabBar />
    </div>
  );
}
