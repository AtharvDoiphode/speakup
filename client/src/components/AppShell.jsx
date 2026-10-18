import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import Sidebar from './Sidebar';
import MobileTabBar from './MobileTabBar';

export default function AppShell() {
  const location = useLocation();
  const outlet = useOutlet(); // captured so the old page can animate out

  // The live conversation (/practice/<id>) and the flashcards need the room,
  // so the sidebar stays as the narrow icon rail there, even on wide screens
  const isLive = /^\/practice\/[^/]+|^\/vocabulary\/review/.test(location.pathname);

  return (
    // print:block: on paper the sidebar is hidden, so the page must not keep its column
    <div className={`min-h-dvh bg-canvas md:grid md:grid-cols-[72px_1fr] print:block print:bg-white ${isLive ? '' : 'lg:grid-cols-[240px_1fr]'}`}>
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

      <main className="min-w-0 pb-[96px] md:pb-0 print:pb-0">
        {/* No initial={false} here: it would be passed down and stop every animation
            on the first page you land on (the dashboard's cards, bars and sparklines) */}
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {outlet}
          </motion.div>
        </AnimatePresence>
      </main>

      <MobileTabBar />
    </div>
  );
}
