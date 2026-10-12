import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import Sidebar from './Sidebar';
import MobileTabBar from './MobileTabBar';

export default function AppShell() {
  const location = useLocation();
  const outlet = useOutlet(); // captured so the old page can animate out

  return (
    <div className="min-h-dvh bg-canvas md:grid md:grid-cols-[72px_1fr] lg:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-dvh md:block">
        <div className="hidden h-full lg:block"><Sidebar /></div>
        <div className="h-full lg:hidden"><Sidebar compact /></div>
      </aside>

      <main className="min-w-0 pb-[96px] md:pb-0">
        <AnimatePresence mode="wait" initial={false}>
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