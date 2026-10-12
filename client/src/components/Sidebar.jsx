import { NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import { SignOutIcon } from '@phosphor-icons/react';
import { useAuth } from '../context/useAuth';
import { NAV } from '../lib/nav';
import Logo from './Logo';

const rowClass = (compact) =>
  `relative flex h-11 items-center rounded-field text-sm font-semibold transition-colors ${
    compact ? 'justify-center' : 'gap-3 px-3'
  }`;

// The small label that appears beside an icon in the compact rail
function Tooltip({ children }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-full z-50 ml-4 hidden whitespace-nowrap rounded-tag bg-ink px-2.5 py-1.5 text-xs font-semibold text-white group-hover:block group-focus-visible:block"
    >
      {children}
    </span>
  );
}

/**
 * The desktop navigation.
 *  - compact: icons only (the 72px rail shown on medium screens)
 */
export default function Sidebar({ compact = false }) {
  const { user, logout } = useAuth();

  return (
    <div className={`flex h-full flex-col border-r border-line bg-canvas ${compact ? 'px-3' : 'px-4'} py-5`}>
      <div className={compact ? 'flex justify-center' : 'px-1'}>
        <Logo compact={compact} />
      </div>

      {/* The compact rail must not clip its tooltips, so only the full sidebar scrolls */}
      <nav aria-label="Main" className={`mt-8 flex flex-1 flex-col gap-1 ${compact ? '' : 'overflow-y-auto'}`}>
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'} // "/" should only be active on the home page itself
              aria-label={compact ? item.label : undefined}
              className={({ isActive }) =>
                `group ${rowClass(compact)} ${isActive ? 'text-brand' : 'text-ink-soft hover:text-ink'}`
              }
            >
              {({ isActive }) => (
                <>
                  {/* One shared white pill. Because every item uses the same layoutId,
                      motion slides it from the old item to the new one. */}
                  {isActive && (
                    <motion.span
                      layoutId={compact ? 'nav-pill-compact' : 'nav-pill-full'}
                      aria-hidden="true"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-field border border-line bg-surface"
                    />
                  )}
                  <Icon size={22} weight={isActive ? 'fill' : 'regular'} aria-hidden="true" className="relative" />
                  {!compact && <span className="relative">{item.label}</span>}
                  {compact && <Tooltip>{item.label}</Tooltip>}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-line pt-4">
        {!compact && (
          <div className="mb-2 px-3">
            <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
            <p className="truncate text-xs capitalize text-ink-faint">{user.role}</p>
          </div>
        )}
        <button
          type="button"
          onClick={logout}
          aria-label={compact ? 'Log out' : undefined}
          className={`group ${rowClass(compact)} w-full text-ink-soft hover:bg-surface hover:text-ink`}
        >
          <SignOutIcon size={22} aria-hidden="true" />
          {!compact && <span>Log out</span>}
          {compact && <Tooltip>Log out</Tooltip>}
        </button>
      </div>
    </div>
  );
}
