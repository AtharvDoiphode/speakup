import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CaretDownIcon, MagnifyingGlassIcon, SpeakerHighIcon, TrashIcon } from '@phosphor-icons/react';
import api, { getErrorMessage } from '../../lib/api';
import { dueLabel, stageOf } from '../../lib/vocab';
import { speak, ttsSupported } from '../../lib/speak';
import Segmented from '../Segmented';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'due', label: 'Due' },
  { value: 'learned', label: 'Learned' },
];

export default function DeckTab() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [cards, setCards] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  // Search waits for a pause in typing; an older answer never replaces a newer one
  useEffect(() => {
    let current = true;
    const t = setTimeout(() => {
      api.get('/vocab/cards', { params: { status, ...(q.trim() && { q: q.trim() }) } })
        .then(({ data }) => { if (current) { setCards(data.cards); setNow(Date.now()); setError(''); } })
        .catch((err) => current && setError(getErrorMessage(err)));
    }, q ? 250 : 0);
    return () => { current = false; clearTimeout(t); };
  }, [q, status]);

  const update = (card) => setCards((cs) => cs.map((c) => (c.id === card.id ? card : c)));
  const remove = (id) => { setCards((cs) => cs.filter((c) => c.id !== id)); setOpen(null); };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative flex-1 md:max-w-[380px]">
          <span className="sr-only">Search your deck</span>
          <MagnifyingGlassIcon size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} maxLength={40} placeholder="Search words or meanings"
            className="h-11 w-full rounded-field border border-line bg-surface pr-3 pl-10 text-[15px] outline-none placeholder:text-ink-faint focus:border-brand" />
        </label>
        <div className="w-full md:w-[300px]">
          <Segmented label="Show" layoutId="deck-filter" value={status} onChange={setStatus} options={FILTERS} size="sm" />
        </div>
      </div>

      {error && <p role="alert" className="text-sm font-medium text-mistake-ink">{error}</p>}
      {!cards && !error && <div className="h-48 animate-pulse rounded-panel bg-surface/70" />}

      {cards && (
        <>
          <p className="text-sm text-ink-soft" aria-live="polite">
            {cards.length} word{cards.length === 1 ? '' : 's'}{q.trim() ? ` matching "${q.trim()}"` : ''}
          </p>
          {cards.length === 0 ? (
            <p className="rounded-panel border border-line bg-surface p-6 text-[15px] text-ink-soft">
              {q.trim() ? 'No words match that search.' : status === 'due' ? 'Nothing is due right now.' : status === 'learned' ? 'No learned words yet. Words count as learned after a few good reviews.' : 'Your deck is empty. Add words from the Today or Add words tab.'}
            </p>
          ) : (
            <ul className="flex flex-col overflow-hidden rounded-panel border border-line bg-surface">
              {cards.map((c) => (
                <li key={c.id} className="border-b border-line last:border-0">
                  <button type="button" onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id}
                    className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 text-left hover:bg-canvas/50 md:grid-cols-[minmax(0,1fr)_96px_110px_20px]">
                    <span className="flex min-w-0 flex-col">
                      <span className="flex items-baseline gap-2">
                        <span className="truncate text-[16px] font-semibold">{c.display}</span>
                        {c.pos && <span className="shrink-0 text-[13px] text-ink-faint">{c.pos}</span>}
                      </span>
                      <span className="truncate text-sm text-ink-soft">{c.meaning}</span>
                    </span>
                    <StageBadge box={c.box} />
                    <span className={`hidden text-sm md:block ${new Date(c.dueAt) <= now ? 'font-semibold text-brand' : 'text-ink-soft'}`}>{dueLabel(c.dueAt, now)}</span>
                    <CaretDownIcon size={16} className={`hidden text-ink-soft transition-transform md:block ${open === c.id ? 'rotate-180' : ''}`} aria-hidden="true" />
                  </button>
                  <AnimatePresence initial={false}>
                    {open === c.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }} className="overflow-hidden">
                        <CardEditor card={c} now={now} onSaved={update} onDeleted={remove} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export function StageBadge({ box }) {
  const s = stageOf(box);
  return <span className={`w-fit rounded-tag px-2 py-0.5 text-[12px] font-semibold ${s.badge}`}>{s.label}</span>;
}

function CardEditor({ card, now, onSaved, onDeleted }) {
  const [meaning, setMeaning] = useState(card.meaning);
  const [example, setExample] = useState(card.example ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // The two-tap delete resets itself after 3 seconds, as in Writing
  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 3000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  const changed = meaning.trim() !== card.meaning || example.trim() !== (card.example ?? '');

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      const { data } = await api.patch(`/vocab/cards/${card.id}`, { meaning, example });
      onSaved(data.card);
      setMsg('Saved.');
    } catch (err) {
      setMsg(getErrorMessage(err));
    }
    setBusy(false);
  }

  async function remove() {
    if (!confirmDelete) return setConfirmDelete(true);
    setBusy(true);
    try {
      await api.delete(`/vocab/cards/${card.id}`);
      onDeleted(card.id);
    } catch (err) {
      setMsg(getErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3 border-t border-line bg-canvas/40 px-5 py-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
        <span>Next review: {dueLabel(card.dueAt, now)}</span>
        <span>Reviewed {card.reps} time{card.reps === 1 ? '' : 's'}</span>
        {ttsSupported && (
          <button type="button" onClick={() => speak(card.display, { rate: 0.85 })} className="flex items-center gap-1 font-medium text-brand hover:text-brand-hover">
            <SpeakerHighIcon size={15} /> Hear it
          </button>
        )}
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">Meaning</span>
        <textarea value={meaning} onChange={(e) => setMeaning(e.target.value)} rows={2} maxLength={140} required minLength={3}
          className="resize-none rounded-field border border-line bg-surface px-3 py-2 text-[15px] outline-none focus:border-brand" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">Example <span className="font-normal text-ink-soft">(optional)</span></span>
        <textarea value={example} onChange={(e) => setExample(e.target.value)} rows={2} maxLength={200}
          className="resize-none rounded-field border border-line bg-surface px-3 py-2 text-[15px] outline-none focus:border-brand" />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={busy || !changed || meaning.trim().length < 3}
          className="flex h-11 items-center rounded-field bg-brand px-5 font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
          Save
        </button>
        <button type="button" onClick={remove} disabled={busy}
          className="flex h-11 items-center gap-1.5 rounded-field border border-mistake px-4 text-sm font-semibold text-mistake-ink">
          <TrashIcon size={16} /> {confirmDelete ? 'Tap again' : 'Delete'}
        </button>
        <span className="text-sm text-ink-soft" role="status">{msg}</span>
      </div>
    </form>
  );
}
