import { Fragment, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { AnimatePresence, motion } from 'motion/react';
import {
  CalendarBlankIcon, CaretRightIcon, ChatsCircleIcon, MagnifyingGlassIcon, MicrophoneIcon,
  PencilSimpleLineIcon, SpeakerHighIcon, SpinnerGapIcon, TrashIcon, XIcon,
} from '@phosphor-icons/react';
import api, { getErrorMessage } from '../lib/api';
import { dayHeading, istKey, timeOf } from '../lib/dates';
import { speak, ttsSupported } from '../lib/speak';
import Segmented from '../components/Segmented';

const TYPES = [
  { value: 'all', label: 'All' },
  { value: 'conversation', label: 'Conversations' },
  { value: 'writing', label: 'Writing' },
  { value: 'reading', label: 'Reading' },
];
const ICON = { conversation: ChatsCircleIcon, writing: PencilSimpleLineIcon, reading: MicrophoneIcon };
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The search term on the yellow marker, as plain text (never as a pattern)
export function Highlight({ text, q }) {
  if (!q || !text) return text ?? null;
  const parts = text.split(new RegExp(`(${escapeRegex(q)})`, 'ig'));
  return parts.map((p, i) => (i % 2 ? <mark key={i} className="rounded-[2px_4px_3px_5px] bg-marker px-0.5 text-ink">{p}</mark> : <Fragment key={i}>{p}</Fragment>));
}

export default function HistoryPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const type = TYPES.some((t) => t.value === params.get('type')) ? params.get('type') : 'all';
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const [text, setText] = useState(q);
  const [showDates, setShowDates] = useState(Boolean(from || to));
  const [items, setItems] = useState(null);
  const [next, setNext] = useState(null);
  const [error, setError] = useState('');
  const [moreError, setMoreError] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [open, setOpen] = useState(null); // expanded reading row
  const [now] = useState(() => Date.now());
  const controller = useRef(null);

  // Change one or more filters in the URL; empty ones are left out
  const setFilters = (patch) => {
    const nextParams = { q, type, from, to, ...patch };
    setParams(Object.fromEntries(Object.entries(nextParams).filter(([k, v]) => v && !(k === 'type' && v === 'all'))), { replace: true });
  };

  // Typing waits 300 ms before it searches
  useEffect(() => {
    if (text.trim() === q) return;
    const t = setTimeout(() => setFilters({ q: text.trim() }), 300);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load page 1 whenever the filters change. A newer request cancels the older one,
  // so old results can never replace new ones.
  const query = { ...(q && { q }), ...(type !== 'all' && { type }), ...(from && { from }), ...(to && { to }) };
  const key = JSON.stringify(query);
  useEffect(() => {
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    api.get('/history', { params: JSON.parse(key), signal: c.signal })
      .then(({ data }) => { setItems(data.items); setNext(data.nextBefore); setError(''); setMoreError(''); })
      .catch((err) => { if (!axios.isCancel(err)) setError(getErrorMessage(err)); });
    return () => c.abort();
  }, [key]);

  function changeType(t) { setItems(null); setFilters({ type: t }); }
  function changeDate(field, v) { setItems(null); setFilters({ [field]: v }); }
  function clearAll() { setItems(null); setText(''); setShowDates(false); setParams({}, { replace: true }); }

  async function loadMore() {
    setLoadingMore(true);
    setMoreError('');
    try {
      const { data } = await api.get('/history', { params: { ...query, before: next } });
      setItems((list) => [...list, ...data.items]); // the rows already shown stay
      setNext(data.nextBefore);
    } catch (err) {
      setMoreError(`Couldn't load more. ${getErrorMessage(err)}`);
    }
    setLoadingMore(false);
  }

  const filtered = Boolean(q || from || to || type !== 'all');
  const groups = [];
  for (const it of items ?? []) {
    const k = istKey(it.date);
    if (groups.at(-1)?.key !== k) groups.push({ key: k, items: [] });
    groups.at(-1).items.push(it);
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-11 md:py-10">
      <header>
        <h1 className="text-[clamp(30px,3.4vw,38px)] font-semibold leading-[1.05] tracking-[-0.035em]">History</h1>
        <p className="mt-2 text-[15px] text-ink-soft">Everything you've done. Search finds your own words too.</p>
      </header>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative flex-1 lg:max-w-[420px]">
            <span className="sr-only">Search your history</span>
            <MagnifyingGlassIcon size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
            <input type="search" value={text} onChange={(e) => setText(e.target.value)} maxLength={40}
              placeholder='Try "salary" or a scene'
              className="h-11 w-full rounded-field border border-line bg-surface pr-3 pl-10 text-[15px] outline-none placeholder:text-ink-faint focus:border-brand" />
          </label>
          <div className="w-full lg:w-[420px]">
            <Segmented label="Show" layoutId="history-type" value={type} onChange={changeType} options={TYPES} size="sm" />
          </div>
          <button type="button" onClick={() => setShowDates((v) => !v)} aria-expanded={showDates} aria-controls="history-dates"
            className={`flex h-10 w-fit items-center gap-1.5 rounded-field border px-3 text-sm font-medium ${from || to ? 'border-brand text-brand' : 'border-line text-ink-soft hover:text-ink'}`}>
            <CalendarBlankIcon size={16} /> Dates{from || to ? ': on' : ''}
          </button>
        </div>
        <AnimatePresence initial={false}>
          {showDates && (
            <motion.div id="history-dates" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden">
              <div className="flex flex-wrap items-end gap-3 pt-1">
                <label className="flex flex-col gap-1 text-sm font-medium">From
                  <input type="date" value={from} max={to || undefined} onChange={(e) => changeDate('from', e.target.value)}
                    className="h-10 rounded-field border border-line bg-surface px-3 text-[15px] outline-none focus:border-brand" />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium">To
                  <input type="date" value={to} min={from || undefined} onChange={(e) => changeDate('to', e.target.value)}
                    className="h-10 rounded-field border border-line bg-surface px-3 text-[15px] outline-none focus:border-brand" />
                </label>
                {(from || to) && (
                  <button type="button" onClick={() => { setItems(null); setFilters({ from: '', to: '' }); }} className="flex h-10 items-center gap-1 text-sm font-semibold text-brand hover:text-brand-hover">
                    <XIcon size={14} /> Clear dates
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error && <p role="alert" className="text-sm font-medium text-mistake-ink">{error}</p>}
      {!items && !error && <div className="h-64 animate-pulse rounded-panel bg-surface/70" />}

      {items && items.length === 0 && (
        <div className="flex flex-col items-start gap-3 rounded-panel border border-line bg-surface p-6 md:p-8">
          {filtered ? (
            <>
              <h2 className="font-display text-[22px] font-semibold tracking-[-0.02em]">No sessions match</h2>
              <p className="text-[15px] text-ink-soft">Try a different word, or widen the dates.</p>
              <button type="button" onClick={clearAll} className="flex h-11 items-center rounded-field border border-line px-5 font-semibold hover:border-ink-faint">Clear filters</button>
            </>
          ) : (
            <>
              <h2 className="font-display text-[22px] font-semibold tracking-[-0.02em]">Nothing here yet</h2>
              <p className="text-[15px] text-ink-soft">Your conversations, writing checks and read-alouds will be listed here.</p>
              <Link to="/practice" className="flex h-11 items-center rounded-field bg-brand px-5 font-semibold text-white hover:bg-brand-hover">Start a conversation</Link>
            </>
          )}
        </div>
      )}

      {items && items.length > 0 && (
        <div className="flex flex-col gap-5">
          {groups.map((g) => (
            <section key={g.key} aria-label={dayHeading(g.key, now)} className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-ink-soft">{dayHeading(g.key, now)}</h2>
              <ul className="flex flex-col overflow-hidden rounded-panel border border-line bg-surface">
                {g.items.map((it) => (
                  <li key={it.id} className="border-b border-line last:border-0" data-type={it.type}>
                    <Row item={it} q={q} open={open === it.id} onToggle={() => setOpen(open === it.id ? null : it.id)}
                      onDeleted={() => setItems((list) => list.filter((x) => x.id !== it.id))} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {next && (
            <div className="flex flex-col items-start gap-2">
              <button type="button" onClick={loadMore} disabled={loadingMore}
                className="flex h-11 items-center gap-2 rounded-field border border-line bg-surface px-5 font-semibold hover:border-ink-faint disabled:opacity-60">
                {loadingMore && <SpinnerGapIcon size={16} className="animate-spin" />} Load more
              </button>
              {moreError && <p role="alert" className="text-sm text-mistake-ink">{moreError}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function scoreTag(it) {
  if (it.score == null) return null;
  return it.unit === 'wpm' ? `${it.score} wpm` : it.unit === '%' ? `${it.score}%` : `${it.score}/100`;
}

function Row({ item, q, open, onToggle, onDeleted }) {
  const Icon = ICON[item.type] ?? ChatsCircleIcon;
  const inText = (s) => q && s?.toLowerCase().includes(q.toLowerCase());
  const saidIt = item.type === 'conversation' && q && !inText(item.title) && !inText(item.subtitle);
  const body = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-field bg-canvas text-ink-soft"><Icon size={20} aria-hidden="true" /></span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[16px] font-semibold"><Highlight text={item.title} q={q} /></span>
        <span className="truncate text-sm text-ink-soft">
          <Highlight text={item.subtitle} q={q} />
          {saidIt && <span className="ml-1.5 text-ink">· found in what you said</span>}
        </span>
      </span>
      <span className="hidden w-20 text-sm text-ink-soft md:block">{timeOf(item.date)}</span>
      <span className="hidden w-16 text-sm text-ink-soft md:block">{item.minutes != null ? `${item.minutes} min` : ''}</span>
      {scoreTag(item) && <span className="shrink-0 rounded-tag bg-canvas px-2 py-0.5 text-[13px] font-semibold tabular-nums">{scoreTag(item)}</span>}
      <CaretRightIcon size={16} aria-hidden="true" className={`shrink-0 text-ink-faint transition-transform ${open ? 'rotate-90' : ''}`} />
    </>
  );
  const cls = 'flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-canvas/50 md:px-5';

  if (item.type === 'conversation') return <Link to={`/history/${item.id}`} className={cls}>{body}</Link>;
  if (item.type === 'writing') return <Link to={`/writing/${item.id}`} className={cls}>{body}</Link>;
  return (
    <>
      <button type="button" onClick={onToggle} aria-expanded={open} className={cls}>{body}</button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <ReadingDetail id={item.id} onDeleted={onDeleted} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ReadingDetail({ id, onDeleted }) {
  const [s, setS] = useState(null);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/reading/sessions/${id}`).then(({ data }) => setS(data.session)).catch((err) => setError(getErrorMessage(err)));
  }, [id]);
  useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(false), 3000);
    return () => clearTimeout(t);
  }, [confirm]);

  async function remove() {
    if (!confirm) return setConfirm(true);
    setBusy(true);
    try {
      await api.delete(`/reading/sessions/${id}`);
      onDeleted();
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-line bg-canvas/40 px-4 py-4 md:px-5 md:pl-[72px]">
      {error && <p role="alert" className="text-sm text-mistake-ink">{error}</p>}
      {!s && !error && <p className="text-sm text-ink-soft">Loading…</p>}
      {s && (
        <>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[15px]">
            <span><strong className="font-semibold tabular-nums">{s.accuracy}%</strong> accurate</span>
            <span><strong className="font-semibold tabular-nums">{s.wpm}</strong> words per minute</span>
            <span className="text-ink-soft">{s.wordsRead} of {s.wordsReached} words read clearly</span>
          </div>
          {s.missed.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">Words to practise</span>
              <div className="flex flex-wrap gap-1.5">
                {s.missed.map((w) => (
                  <button key={w} type="button" onClick={() => speak(w, { rate: 0.8 })} disabled={!ttsSupported}
                    className="flex h-8 items-center gap-1 rounded-tag border border-line bg-surface px-2.5 text-sm">
                    {ttsSupported && <SpeakerHighIcon size={13} className="text-brand" />}{w}
                  </button>
                ))}
              </div>
            </div>
          ) : <p className="text-sm text-correct-ink">Every word came through clearly.</p>}
          <div className="flex flex-wrap gap-2">
            <Link to="/read-aloud" className="flex h-10 items-center rounded-field border border-line bg-surface px-4 text-sm font-semibold hover:border-ink-faint">Read again</Link>
            <button type="button" onClick={remove} disabled={busy}
              className="flex h-10 items-center gap-1.5 rounded-field border border-mistake px-3 text-sm font-semibold text-mistake-ink">
              <TrashIcon size={15} /> {confirm ? 'Tap again' : 'Delete'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
