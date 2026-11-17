import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, m as motion } from 'motion/react';
import { CheckCircleIcon, InfoIcon, WarningCircleIcon, XIcon } from '@phosphor-icons/react';
import { createTimer } from '../lib/timer';
import { anim, drawer } from '../lib/motion';
import { ToastContext } from './useToast';

const LIFE_MS = 5000;
const MAX = 3;
const TONE = {
  success: { Icon: CheckCircleIcon, cls: 'text-success-text' },
  error: { Icon: WarningCircleIcon, cls: 'text-mistake-text' },
  info: { Icon: InfoIcon, cls: 'text-info-text' },
};

// One toast area for the whole app: stacks (newest last), closes itself after 5s,
// waits while you hover or focus it, and closes with Escape or the × button.
// Text is always rendered as text, never HTML.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);
  const show = useCallback((message, tone) => {
    const id = crypto.randomUUID?.() ?? String(Math.random());
    setToasts((list) => [...list, { id, message: String(message), tone }].slice(-MAX));
    return id;
  }, []);
  const [api] = useState(() => ({ success: (m) => show(m, 'success'), error: (m) => show(m, 'error'), info: (m) => show(m, 'info'), dismiss }));

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-3 md:bottom-6 md:items-end md:px-6" data-toasts>
        <AnimatePresence initial={false}>
          {toasts.map((t) => <Toast key={t.id} toast={t} onClose={() => dismiss(t.id)} />)}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ toast, onClose }) {
  const timer = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });
  useEffect(() => {
    timer.current = createTimer(LIFE_MS, () => closeRef.current());
    return () => timer.current.cancel();
  }, []);
  const pause = () => timer.current?.pause();
  const resume = (e) => { if (!e?.currentTarget?.contains(e.relatedTarget)) timer.current?.resume(); };
  const { Icon, cls } = TONE[toast.tone] ?? TONE.info;
  const error = toast.tone === 'error';
  return (
    <motion.div {...anim(drawer)} role={error ? 'alert' : 'status'} aria-live={error ? 'assertive' : 'polite'}
      onMouseEnter={pause} onMouseLeave={resume} onFocus={pause} onBlur={resume}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      className="pointer-events-auto flex w-full max-w-[420px] items-start gap-3 rounded-panel border border-border-subtle bg-surface-card py-1.5 pr-1.5 pl-4" data-toast={toast.tone}>
      <Icon size={20} weight="fill" className={`mt-3 shrink-0 ${cls}`} aria-hidden="true" />
      <p className="flex-1 py-2.5 text-[15px] font-medium">{toast.message}</p>
      <button type="button" onClick={onClose} aria-label="Close message" className="flex size-11 shrink-0 items-center justify-center rounded-field text-text-secondary hover:text-text-primary">
        <XIcon size={18} />
      </button>
    </motion.div>
  );
}
