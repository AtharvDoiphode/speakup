import { useEffect, useState } from 'react';
import { CheckIcon, PlusIcon, SparkleIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import api, { getErrorMessage } from '../../lib/api';
import { CATEGORIES, lookupError } from '../../lib/vocab';
import Segmented from '../Segmented';

const LEVEL_TAG = { easy: 'bg-correct/12 text-correct-ink', medium: 'bg-marker/45 text-ink', hard: 'bg-mistake/10 text-mistake-ink' };

export default function AddWordsTab() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
      <Library />
      <AddYourOwn />
    </div>
  );
}

function Library() {
  const [category, setCategory] = useState('everyday');
  const [words, setWords] = useState(null);
  const [state, setState] = useState({}); // id → 'adding'
  const [error, setError] = useState('');

  useEffect(() => {
    let current = true;
    api.get('/vocab/library', { params: { category } })
      .then(({ data }) => current && setWords(data.words))
      .catch((err) => current && setError(getErrorMessage(err)));
    return () => { current = false; };
  }, [category]);

  function pick(c) {
    if (c === category) return;
    setWords(null);
    setError('');
    setCategory(c);
  }

  async function add(w) {
    setState((s) => ({ ...s, [w.id]: 'adding' }));
    setError('');
    try {
      await api.post('/vocab/deck', { starterId: w.id });
      setWords((ws) => ws.map((x) => (x.id === w.id ? { ...x, inDeck: true } : x)));
    } catch (err) {
      if (err.response?.status === 409) setWords((ws) => ws.map((x) => (x.id === w.id ? { ...x, inDeck: true } : x)));
      else setError(getErrorMessage(err));
    }
    setState((s) => ({ ...s, [w.id]: undefined }));
  }

  const added = words?.filter((w) => w.inDeck).length ?? 0;

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-[15px] font-semibold">Starter library</h2>
        <p className="text-sm text-ink-soft">120 useful words and phrases, 30 in each group.</p>
      </div>
      <Segmented label="Category" layoutId="library-cat" value={category} onChange={pick} options={CATEGORIES} size="sm" />
      {error && <p role="alert" className="text-sm text-mistake-ink">{error}</p>}
      {!words && !error && <div className="h-64 animate-pulse rounded-panel bg-surface/70" />}
      {words && (
        <>
          <p className="text-sm text-ink-soft">{added} of {words.length} in your deck</p>
          <ul className="flex flex-col overflow-hidden rounded-panel border border-line bg-surface">
            {words.map((w) => (
              <li key={w.id} className="flex items-start gap-4 border-b border-line px-5 py-3.5 last:border-0">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-[16px] font-semibold">{w.word}</span>
                    <span className="text-[13px] text-ink-faint">{w.pos}</span>
                    <span className={`rounded-tag px-1.5 py-px text-[11px] font-semibold capitalize ${LEVEL_TAG[w.level]}`}>{w.level}</span>
                  </div>
                  <p className="text-sm text-ink">{w.meaning}</p>
                  <p className="text-[13px] text-ink-soft italic">{w.example}</p>
                </div>
                {w.inDeck ? (
                  <span className="flex h-10 shrink-0 items-center gap-1 px-1 text-sm font-semibold text-correct-ink"><CheckIcon size={16} /> In deck</span>
                ) : (
                  <button type="button" onClick={() => add(w)} disabled={state[w.id] === 'adding'} aria-label={`Add ${w.word}`}
                    className="flex h-10 shrink-0 items-center gap-1 rounded-[10px] border border-line px-3 text-sm font-semibold hover:border-ink-faint disabled:opacity-60">
                    {state[w.id] === 'adding' ? <SpinnerGapIcon size={15} className="animate-spin" /> : <PlusIcon size={15} />} Add
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

// Type a word; the helper can fill in a meaning and example, but you can always type them yourself.
// Nothing typed is ever thrown away: the helper only fills empty boxes.
function AddYourOwn() {
  const [word, setWord] = useState('');
  const [meaning, setMeaning] = useState('');
  const [example, setExample] = useState('');
  const [pos, setPos] = useState('');
  const [looking, setLooking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null); // { tone: 'error' | 'ok' | 'info', text }
  const [suggested, setSuggested] = useState(null); // the helper's text when you'd already typed your own

  async function fill() {
    if (!word.trim()) return;
    setLooking(true);
    setMsg(null);
    setSuggested(null);
    try {
      const { data } = await api.post('/vocab/lookup', { word });
      setPos(data.pos || '');
      const keepMeaning = meaning.trim().length > 0;
      const keepExample = example.trim().length > 0;
      if (!keepMeaning) setMeaning(data.meaning);
      if (!keepExample) setExample(data.example);
      if (keepMeaning || keepExample) {
        setSuggested(data);
        setMsg({ tone: 'info', text: 'Kept what you typed. The helper suggests:' });
      } else {
        setMsg({ tone: 'ok', text: 'Filled in. Change anything you like, then add it.' });
      }
    } catch (err) {
      setMsg({ tone: 'error', text: lookupError(err, getErrorMessage(err)) });
    }
    setLooking(false);
  }

  async function add(e) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const { data } = await api.post('/vocab/cards', { word, meaning, example, ...(pos && { pos }) });
      setMsg({ tone: 'ok', text: `Added "${data.card.display}" to your deck.` });
      setWord(''); setMeaning(''); setExample(''); setPos(''); setSuggested(null);
    } catch (err) {
      setMsg({ tone: 'error', text: err.response?.status === 409 ? `"${word.trim()}" is already in your deck.` : getErrorMessage(err) });
    }
    setSaving(false);
  }

  const tone = { error: 'text-mistake-ink', ok: 'text-correct-ink', info: 'text-ink-soft' };

  return (
    // Below xl it comes first: on a phone it would otherwise sit under all 30 library words
    <section className="order-first flex flex-col gap-4 rounded-panel border border-line bg-surface p-6 xl:sticky xl:top-8 xl:order-none">
      <div>
        <h2 className="font-display text-[22px] font-semibold tracking-[-0.02em]">Add your own</h2>
        <p className="mt-1 text-sm text-ink-soft">Met a new word? Save it here.</p>
      </div>
      <form onSubmit={add} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Word or phrase</span>
          <input value={word} onChange={(e) => { setWord(e.target.value); setPos(''); }} maxLength={40} required
            placeholder="e.g. serendipity" autoComplete="off" autoCapitalize="none"
            className="h-11 rounded-field border border-line bg-surface px-3 text-[15px] outline-none placeholder:text-ink-faint focus:border-brand" />
        </label>
        <button type="button" onClick={fill} disabled={!word.trim() || looking}
          className="flex h-11 w-fit items-center gap-2 rounded-field border border-line px-4 text-sm font-semibold hover:border-ink-faint disabled:opacity-50">
          {looking ? <SpinnerGapIcon size={16} className="animate-spin" /> : <SparkleIcon size={16} className="text-brand" />}
          {looking ? 'Filling in…' : 'Fill it in for me'}
        </button>
        <div aria-live="polite" className="flex flex-col gap-1.5">
          {msg && <p role={msg.tone === 'error' ? 'alert' : undefined} className={`text-sm ${tone[msg.tone]}`}>{msg.text}</p>}
          {suggested && (
            <div className="flex flex-col gap-1 rounded-field bg-canvas px-3 py-2 text-sm">
              <span>{suggested.meaning}</span>
              {suggested.example && <span className="text-ink-soft italic">{suggested.example}</span>}
              <button type="button" onClick={() => { setMeaning(suggested.meaning); setExample(suggested.example); setSuggested(null); setMsg(null); }}
                className="w-fit font-semibold text-brand hover:text-brand-hover">Use this instead</button>
            </div>
          )}
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Meaning</span>
          <textarea value={meaning} onChange={(e) => setMeaning(e.target.value)} rows={2} maxLength={140} required minLength={3}
            placeholder="What it means, in simple words"
            className="resize-none rounded-field border border-line bg-surface px-3 py-2 text-[15px] outline-none placeholder:text-ink-faint focus:border-brand" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Example <span className="font-normal text-ink-soft">(optional)</span></span>
          <textarea value={example} onChange={(e) => setExample(e.target.value)} rows={2} maxLength={200}
            placeholder="A sentence that uses it"
            className="resize-none rounded-field border border-line bg-surface px-3 py-2 text-[15px] outline-none placeholder:text-ink-faint focus:border-brand" />
        </label>
        <button type="submit" disabled={saving || !word.trim() || meaning.trim().length < 3}
          className="flex h-12 items-center justify-center gap-2 rounded-field bg-brand font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50">
          {saving ? <SpinnerGapIcon size={18} className="animate-spin" /> : <PlusIcon size={18} />} Add to my deck
        </button>
      </form>
    </section>
  );
}
