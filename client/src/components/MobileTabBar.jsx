import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { DotsThreeOutlineIcon, SignOutIcon, XIcon } from '@phosphor-icons/react';
import { useAuth } from '../context/useAuth';
import { PRIMARY_NAV, MORE_NAV } from '../lib/nav';

const tabClass = (active) =>
  `flex h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-field text-[11px] font-semibold ${
    active ? 'text-brand' : 'text-ink-soft'
  }`;

// The bottom navigation on phones (hidden from medium screens up, where the sidebar takes over).
// Four main tabs, plus "More" which opens a sheet with the remaining pages and Log out.
export default function MobileTabBar() {
  const { logout } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  // While the sheet is open, the Escape key closes it
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // "More" looks active while you're on one of the pages inside it
  const onMorePage = MORE_NAV.some((item) => pathname.startsWith(item.to));

  return (
    <div className="md:hidden">
      <AnimatePresence>
        {open && (
          <>
            {/* Dim the page; tapping it closes the sheet */}
            <motion.button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-ink/30"
            />
            <motion.div
              id="more-menu"
              role="dialog"
              aria-label="More pages"
              // Slides up from behind the tab bar
              initial={{ opacity: 0, y: 48 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 48 }}
              transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
              className="fixed inset-x-3 bottom-22 z-40 rounded-panel border border-line bg-surface p-2"
            >
              {MORE_NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `flex h-12 items-center gap-3 rounded-field px-3 text-sm font-semibold ${
                        isActive ? 'bg-brand/10 text-brand' : 'text-ink'
                      }`
                    }
                  >
                    <Icon size={22} aria-hidden="true" />
                    {item.label}
                  </NavLink>
                );
              })}
              <button
                type="button"
                onClick={logout}
                className="mt-1 flex h-12 w-full items-center gap-3 rounded-field border-t border-line px-3 text-sm font-semibold text-ink-soft"
              >
                <SignOutIcon size={22} aria-hidden="true" />
                Log out
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav
        aria-label="Main"
        className="fixed inset-x-3 bottom-3 z-40 flex gap-1 rounded-panel border border-line bg-surface p-1.5"
      >
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) => tabClass(isActive && !open)}
            >
              {({ isActive }) => (
                <>
                  <Icon size={24} weight={isActive && !open ? 'fill' : 'regular'} aria-hidden="true" />
                  {item.label}
                </>
              )}
            </NavLink>
          );
        })}

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="more-menu"
          className={tabClass(open || onMorePage)}
        >
          {open ? <XIcon size={24} aria-hidden="true" /> : <DotsThreeOutlineIcon size={24} weight={onMorePage ? 'fill' : 'regular'} aria-hidden="true" />}
          More
        </button>
      </nav>
    </div>
  );
}
