import { useEffect, useRef } from 'react';

// Asks before leaving a page with changes that aren't saved: closing or reloading the tab,
// and following any link inside the app.
// shortcut: the browser Back button isn't caught (BrowserRouter has no blocker); use a data router to add it.
export function useUnsavedWarning(dirty, message = "You have changes that aren't saved yet. Leave this page anyway?") {
  const isDirty = useRef(dirty);
  useEffect(() => { isDirty.current = dirty; });

  useEffect(() => {
    const onUnload = (e) => {
      if (!isDirty.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    const onClick = (e) => {
      const link = e.target.closest?.('a[href]');
      if (!isDirty.current || !link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || link.target === '_blank') return;
      if (!window.confirm(message)) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener('beforeunload', onUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [message]);
}
