import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, m as motion } from 'motion/react';
import { anim, backdrop, drawer } from '../lib/motion';
import { DotsThreeOutlineIcon, SignOutIcon, XIcon } from '@phosphor-icons/react';
import { useAuth } from '../context/useAuth';
import { useModal } from '../hooks/useModal';
import { PRIMARY_NAV, MORE_NAV, visibleTo } from '../lib/nav';

const tabClass = (active) =>
  `flex h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-field text-[11px] font-semibold ${
    active ? 'text-brand' : 'text-text-secondary'
  }`;

// The bottom navigation on phones (hidden from medium screens up, where the sidebar takes over).
// Four main tabs, plus "More" which opens a sheet with the remaining pages and Log out.
export default function MobileTabBar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  // While the sheet is open: Escape closes it, focus stays inside, the page behind doesn't scroll
  const { ref: sheetRef } = useModal(open, () => setOpen(false));

  // "More" looks active while you're on one of the pages inside it
  const onMorePage = MORE_NAV.some((item) => pathname.startsWith(item.to));

  return (
    <div className="md:hidden print:hidden">
      <AnimatePresence>
        {open && (
          <>
            {/* Dim the page; tapping it closes the sheet */}
            <motion.button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              {...anim(backdrop)}
              className="fixed inset-0 z-30 bg-surface-overlay"
            />
            <motion.div
              id="more-menu"
              ref={sheetRef}
              aria-modal="true"
              role="dialog"
              aria-label="More pages"
              // Slides up from behind the tab bar
              {...anim(drawer)}
              className="fixed inset-x-3 bottom-22 z-40 rounded-panel border border-border-subtle bg-surface-card p-2"
            >
              {MORE_NAV.filter(visibleTo(user)).map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `flex h-12 items-center gap-3 rounded-field px-3 text-sm font-semibold ${
                        isActive ? 'bg-brand-50 text-brand' : 'text-text-primary'
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
                className="mt-1 flex h-12 w-full items-center gap-3 rounded-field border-t border-border-subtle px-3 text-sm font-semibold text-text-secondary"
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
        className="fixed inset-x-3 bottom-3 z-40 flex gap-1 rounded-panel border border-border-subtle bg-surface-card p-1.5"
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
