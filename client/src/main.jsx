import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LazyMotion, MotionConfig, MotionGlobalConfig } from 'motion/react';

import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { applyMotionCss } from './lib/motion';

// The CSS reads the same durations and easings as the motion components
applyMotionCss();

// The animation features load as their own chunk, with one retry. If they still can't load
// (offline, a stale deploy), motion is switched off and index.css shows everything that was
// waiting to animate in, so the app is never left blank.
const importFeatures = () => import('./lib/motionFeatures').then((mod) => mod.default);
const loadFeatures = () => importFeatures().catch(importFeatures).catch(() => {
  document.documentElement.setAttribute('data-motion-off', '');
  return {};
});

// "Reduce motion" on the device: every motion animation jumps straight to its end
// (nothing moves, scales or loops). Follows the setting live if it changes.
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const syncReduced = () => { MotionGlobalConfig.skipAnimations = reduced.matches; };
syncReduced();
reduced.addEventListener?.('change', syncReduced);

// Looping CSS animations rest while the tab is in the background (see index.css)
const syncHidden = () => document.documentElement.toggleAttribute('data-page-hidden', document.hidden);
syncHidden();
document.addEventListener('visibilitychange', syncHidden);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      {/* If the user's device says "reduce motion", transforms are dropped too */}
      {/* m components with only the features the app uses. domMax, not domAnimation:
          the sliding tab indicators need layout animations (layoutId). */}
      <LazyMotion features={loadFeatures} strict>
        <MotionConfig reducedMotion="user">
          <AuthProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </AuthProvider>
        </MotionConfig>
      </LazyMotion>
    </BrowserRouter>
  </StrictMode>
);
