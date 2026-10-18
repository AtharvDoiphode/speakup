import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRightIcon, CheckIcon, PlusIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import api, { getErrorMessage } from '../lib/api';
import { STAGES } from '../lib/vocab';
import Segmented from '../components/Segmented';
import DeckTab from '../components/vocab/DeckTab';
import AddWordsTab from '../components/vocab/AddWordsTab';

const TABS = [
  { value: 'today', label: 'Today' },
  { value: 'deck', label: 'My deck' },
  { value: 'add', label: 'Add words' },
];
const ease = [0.2, 0.8, 0.2, 1];

export default function VocabularyPage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'today';
  // The tab lives in the URL, so a reload or the back button returns to it
  const setTab = (t) => setParams(t === 'today' ? {} : { tab: t }, { replace: true });

  return (
    <div className="flex flex-col gap-7 px-4 py-8 md:px-11 md:py-10">
      <header className="flex flex-col gap-5">
        <div>
          <h1 className="text-[clamp(30px,3.4vw,38px)] font-semibold leading-[1.05] tracking-[-0.035em]">Vocabulary</h1>
          <p className="mt-2 text-[15px] text-ink-soft">Words that stick, a few minutes a day. Known words come back less often.</p>
        </div>
        <div className="max-w-[440px]">
          <Segmented label="Vocabulary sections" layoutId="vocab-tab" value={tab} onChange={setTab} options={TABS} />
        </div>
      </header>

      {tab === 'today' && <TodayTab onGoAdd={() => setTab('add')} />}
      {tab === 'deck' && <DeckTab />}
      {tab === 'add' && <AddWordsTab />}
    </div>
  );
}

function TodayTab({ onGoAdd }) {
  const [ov, setOv] = useState(null);
  const [sugs, setSugs] = useState([]);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState('');

  const load = useCallback(() => {
    api.get('/vocab/overview').then(({ data }) => setOv(data)).catch((err) => setError(getErrorMessage(err)));
    api.get('/vocab/suggestions').then(({ data }) => setSugs(data.suggestions)).catch(() => setSugs([]));
  }, []);
  useEffect(load, [load]);

  async function addFive() {
    setAdding(true);
    setNote('');
    try {
      const { data } = await api.post('/vocab/deck', { count: 5 });
      setNote(data.cards.length ? `Added ${data.cards.length}: ${data.cards.map((c) => c.display).join(', ')}.` : "You've added every starter word.");
      load();
    } catch (err) {
      setNote(getErrorMessage(err));
    }
    setAdding(false);
  }

  if (error) return <p role="alert" className="text-sm font-medium text-mistake-ink">{error}</p>;
  if (!ov) return <div className="h-48 animate-pulse rounded-panel bg-surface/70" />;

  const due = ov.dueCount;
  const minutes = Math.max(1, Math.round((due * 8) / 60)); // about 8 seconds a card
  const stats = [
    ['Due now', due],
    ['New to add', ov.newAvailable],
    ['Learned', ov.learned],
    ['Reviewed today', ov.reviewedToday],
  ];

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-5 rounded-panel bg-ink px-7 py-7 text-white md:flex-row md:items-center md:justify-between md:px-10 md:py-9">
        <div className="flex flex-col gap-1.5">
          <h2 className="font-display text-[clamp(26px,2.8vw,34px)] font-semibold tracking-[-0.02em]">
            {due > 0 ? `${due} word${due === 1 ? '' : 's'} to review` : ov.deckSize ? "You're all caught up" : 'Start your deck'}
          </h2>
          <p className="text-[15px] text-white/75">
            {due > 0 ? `About ${minutes} minute${minutes === 1 ? '' : 's'}. Flip, then say how well you knew it.`
              : ov.deckSize ? 'Nothing is due. Add new words, or come back later.' : 'Add 5 easy words to begin. You can add your own later.'}
          </p>
          <p className="min-h-5 text-sm text-marker" aria-live="polite">{note}</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {due > 0 && (
            <Link to="/vocabulary/review"
              className="flex h-13 items-center gap-2 rounded-field bg-brand px-6 font-semibold text-white transition hover:-translate-y-px hover:bg-brand-hover active:scale-[0.97]">
              Review {due} word{due === 1 ? '' : 's'} <ArrowRightIcon size={18} />
            </Link>
          )}
          <button type="button" onClick={addFive} disabled={adding || ov.newAvailable === 0}
            className="flex h-13 items-center gap-2 rounded-field bg-white/12 px-5 font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50">
            {adding ? <SpinnerGapIcon size={18} className="animate-spin" /> : <PlusIcon size={18} />} Add 5 new words
          </button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([label, n], i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i, duration: 0.3, ease }}
            className="rounded-panel border border-line bg-surface px-5 py-4">
            <div className="font-display text-[34px] font-semibold leading-none tracking-[-0.03em] tabular-nums">{n}</div>
            <div className="mt-1.5 text-sm text-ink-soft">{label}</div>
          </motion.div>
        ))}
      </div>

      <StageBar boxes={ov.boxes} total={ov.deckSize} onGoAdd={onGoAdd} />
      {sugs.length > 0 && <FromMistakes suggestions={sugs} onAdded={load} />}
    </div>
  );
}

function StageBar({ boxes, total, onGoAdd }) {
  const counts = STAGES.map((s) => s.boxes.reduce((n, b) => n + (boxes[b] || 0), 0));
  return (
    <section className="flex flex-col gap-4 rounded-panel border border-line bg-surface p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold">Your words by stage</h2>
        <span className="text-sm text-ink-soft">{total} in your deck</span>
      </div>
      {total === 0 ? (
        <p className="text-[15px] text-ink-soft">
          No words yet. <button type="button" onClick={onGoAdd} className="font-semibold text-brand hover:text-brand-hover">Browse the library</button> or add 5 above.
        </p>
      ) : (
        <>
          <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img"
            aria-label={STAGES.map((s, i) => `${s.label} ${counts[i]}`).join(', ')}>
            {STAGES.map((s, i) => counts[i] > 0 && (
              <motion.div key={s.key} className={`h-full ${s.dot}`} initial={{ flexGrow: 0 }} animate={{ flexGrow: counts[i] }}
                transition={{ delay: 0.2, duration: 0.7, ease }} style={{ flexBasis: 0 }} />
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {STAGES.map((s, i) => (
              <li key={s.key} className="flex items-center gap-2 text-sm">
                <span className={`size-2.5 rounded-full ${s.dot}`} aria-hidden="true" />
                <span className="text-ink-soft">{s.label}</span>
                <span className="font-semibold tabular-nums">{counts[i]}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

// Words you reached for wrongly in Practice and Writing. Adding one fills in the meaning with
// the helper; if the AI can't, the mistake's rule is used, so the card is never empty.
function FromMistakes({ suggestions, onAdded }) {
  const [state, setState] = useState({}); // word → 'adding' | 'added'
  const [error, setError] = useState('');

  async function add(s) {
    setState((x) => ({ ...x, [s.word]: 'adding' }));
    setError('');
    let filled = null;
    try {
      filled = (await api.post('/vocab/lookup', { word: s.word })).data;
    } catch {
      filled = null; // fall back to the rule below
    }
    const meaning = (filled?.meaning || s.rule || '').slice(0, 140);
    try {
      if (meaning.trim().length < 3) throw new Error("Couldn't find a meaning. Add it from the Add words tab.");
      await api.post('/vocab/cards', { word: s.word, meaning, example: filled?.example ?? '', pos: filled?.pos ?? '', source: 'mistake' });
      setState((x) => ({ ...x, [s.word]: 'added' }));
      onAdded();
    } catch (err) {
      setState((x) => ({ ...x, [s.word]: undefined }));
      setError(err.response ? getErrorMessage(err) : err.message);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-6">
      <div>
        <h2 className="text-[15px] font-semibold">From your mistakes</h2>
        <p className="text-sm text-ink-soft">The right words for things you said or wrote. Add them to practise.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => {
          const st = state[s.word];
          return (
            <button key={s.word} type="button" onClick={() => add(s)} disabled={!!st}
              aria-label={st === 'added' ? `${s.word}, added` : `Add "${s.word}". You said "${s.wrong}".`}
              className={`flex min-h-11 items-center gap-2 rounded-tag border px-3 py-1.5 text-left transition-colors ${st === 'added' ? 'border-correct bg-correct/10 text-correct-ink' : 'border-line hover:border-ink-faint'}`}>
              {st === 'adding' ? <SpinnerGapIcon size={15} className="animate-spin" /> : st === 'added' ? <CheckIcon size={15} /> : <PlusIcon size={15} className="text-brand" />}
              <span className="flex flex-col leading-tight">
                <span className="text-[15px] font-semibold">{s.word}</span>
                {s.wrong && <span className="text-[12px] text-ink-soft line-through decoration-mistake">{s.wrong}</span>}
              </span>
            </button>
          );
        })}
      </div>
      {error && <p role="alert" className="text-sm text-mistake-ink">{error}</p>}
    </section>
  );
}
