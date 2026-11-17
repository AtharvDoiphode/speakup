import { useEffect, useRef } from 'react';
import { focusablesIn, nextFocusIndex } from '../lib/focusTrap';

// Everything an open dialog, drawer or sheet needs: Escape closes it, Tab stays inside,
// the page behind doesn't scroll, and focus goes back to whatever opened it.
// dismissible: false for destructive confirms (a stray click outside must not answer for you).
export function useModal(open, onClose, { dismissible = true } = {}) {
  const ref = useRef(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; });

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const box = ref.current;
    const first = box && (box.querySelector('[data-autofocus]') ?? focusablesIn(box)[0] ?? box);
    first?.focus({ preventScroll: true });

    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close.current?.(); return; }
      if (e.key !== 'Tab' || !ref.current) return;
      const items = focusablesIn(ref.current);
      const to = nextFocusIndex(items.length, items.indexOf(document.activeElement), e.shiftKey);
      if (to != null) { e.preventDefault(); items[to].focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = overflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open]);

  const backdropProps = { onClick: () => dismissible && close.current?.(), 'aria-hidden': true };
  return { ref, backdropProps };
}
