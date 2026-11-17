import { AnimatePresence, m as motion } from 'motion/react';
import { useModal } from '../hooks/useModal';
import { anim, backdrop, scaleIn } from '../lib/motion';

// "Delete “Ordering coffee”?" Destructive, so a click outside doesn't answer; Escape or Cancel do.
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', busy = false, onConfirm, onCancel }) {
  const { ref, backdropProps } = useModal(open, onCancel, { dismissible: false });
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-50 bg-surface-overlay" {...backdropProps} {...anim(backdrop)} />
          <motion.div ref={ref} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-text" tabIndex={-1}
            className="fixed inset-x-4 top-1/2 z-50 mx-auto flex max-w-[420px] -translate-y-1/2 flex-col gap-4 rounded-panel border border-border-subtle bg-surface-card p-6" {...anim(scaleIn)}>
            <h2 id="confirm-title" className="text-[20px] font-semibold tracking-[-0.01em]">{title}</h2>
            <p id="confirm-text" className="text-[15px] text-text-secondary">{message}</p>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={onCancel} data-autofocus className="min-h-11 rounded-field border border-border-strong px-4 font-semibold">Cancel</button>
              <button type="button" onClick={onConfirm} disabled={busy} aria-busy={busy}
                className="min-h-11 min-w-28 rounded-field bg-danger px-4 font-semibold text-on-brand hover:bg-danger-hover disabled:opacity-60">
                {busy ? 'Working…' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
