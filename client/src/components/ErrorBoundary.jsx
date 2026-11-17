import { Component } from 'react';
import { WarningCircleIcon } from '@phosphor-icons/react';

// If a page crashes, show a way out instead of a white screen (no technical details on screen)
export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.error('Page crashed:', error?.name); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="flex flex-col items-start gap-3 px-4 py-16 md:px-11" data-crash>
        <WarningCircleIcon size={36} className="text-mistake-text" aria-hidden="true" />
        <h1 className="text-[clamp(28px,3.4vw,38px)] font-semibold tracking-[-0.03em]">Something went wrong on this page</h1>
        <p className="max-w-[52ch] text-[15px] text-text-secondary">It's not you. Reload the page to try again. Your saved practice is safe.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-field bg-brand px-5 font-semibold text-on-brand hover:bg-brand-700">Reload the page</button>
          <a href="/" className="flex min-h-11 items-center rounded-field border border-border-strong bg-surface-card px-5 font-semibold">Go to Home</a>
        </div>
      </div>
    );
  }
}
