import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { UploadSimpleIcon, CheckCircleIcon } from '@phosphor-icons/react';
import api, { getErrorMessage, checkWriting } from '../lib/api';
import Segmented from '../components/Segmented';
import { readTextFile } from '../lib/readTextFile';
import { titleOf, kindLabel } from '../lib/writing';

const KINDS = [
  { value: 'essay', label: 'Essay' },
  { value: 'email', label: 'Email' },
  { value: 'message', label: 'Message' },
  { value: 'other', label: 'Other' },
];
const MAX = 6000;
const DRAFT_KEY = 'speakup.writingDraft';

const readDraft = () => { try { return localStorage.getItem(DRAFT_KEY) ?? ''; } catch { return ''; } };
const shortDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

export default function WritingPage() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [kind, setKind] = useState('essay');
  const [title, setTitle] = useState('');
  const [text, setText] = useState(readDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [past, setPast] = useState(null);

  useEffect(() => {
    api.get('/writing', { params: { limit: 10 } })
      .then(({ data }) => setPast(data.checks ?? []))
      .catch(() => setPast([]));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { try { localStorage.setItem(DRAFT_KEY, text); } catch { /* ignore */ } }, 400);
    return () => clearTimeout(t);
  }, [text]);

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const nearLimit = text.length > MAX - 300;

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    try {
      const t = await readTextFile(file);
      if (t.length > MAX) setError(`That file has ${t.length.toLocaleString()} characters. The first 6,000 are loaded.`);
      setText(t.slice(0, MAX));
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, '').slice(0, 100));
    } catch (err) {
      setError(err.message);
    }
  }

  // Typing or pasting past the limit keeps the first 6,000 characters and says so
  function onType(e) {
    const v = e.target.value;
    if (v.length > MAX) setError(`That's ${v.length.toLocaleString()} characters. Only the first 6,000 are kept.`);
    else if (error.startsWith("That's ")) setError('');
    setText(v.slice(0, MAX));
  }

  async function check() {
    setBusy(true);
    setError('');
    try {
      const { data } = await checkWriting({ text, kind, title: title.trim() || undefined }); // waits up to 70s
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      navigate(`/writing/${data.check.id}`); // the server answers 201 { check }
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-8 px-4 py-8 md:px-11 md:py-10">
      <header>
        <h1 className="text-[clamp(32px,4vw,42px)] font-semibold leading-[1.05] tracking-[-0.035em]">Write it. We'll mark it like a teacher.</h1>
        <p className="mt-2 text-base text-ink-soft">Essays, emails, messages. Every fix comes with the rule behind it.</p>
      </header>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-full max-w-[420px]">
              <Segmented label="Kind of writing" layoutId="writing-kind" value={kind} onChange={setKind} options={KINDS} />
            </div>
            <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 100))} placeholder="Title (optional)"
              aria-label="Title" disabled={busy}
              className="h-[46px] min-w-0 flex-1 rounded-field border border-line bg-surface px-3.5 text-base" />
          </div>

          <div className="relative">
            <textarea value={text} onChange={onType} readOnly={busy}
              aria-label="Your writing"
              placeholder={kind === 'email' ? 'Dear Mr. Shah,\n\nI am writing to…' : 'Start writing, or paste your text here…'}
              className="min-h-[380px] w-full resize-y rounded-panel border border-line bg-surface p-5 text-[18px] leading-[1.8] md:p-7" />
            {busy && <MarkerSweep />}
          </div>

          {error && <p role="alert" className="text-sm font-medium text-mistake-ink">{error}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-ink-soft">
              {words} words · <span className={nearLimit ? 'font-semibold text-mistake-ink' : ''}>{text.length.toLocaleString()}</span> / 6,000
            </span>
            <span className="text-sm text-ink-faint">{text ? 'Draft saved on this device' : ''}</span>
            <div className="ml-auto flex gap-2">
              <input ref={fileRef} type="file" accept=".txt,.md,.docx" onChange={onFile} hidden />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
                className="flex h-12 items-center gap-2 rounded-field border border-line bg-surface px-4 text-[15px] font-medium transition hover:-translate-y-px active:scale-[0.97] disabled:opacity-50">
                <UploadSimpleIcon size={18} /> Upload
              </button>
              <button type="button" onClick={check} disabled={busy || text.trim().length < 20}
                className="flex h-12 items-center gap-2 rounded-field bg-brand px-5 text-[15px] font-semibold text-white transition hover:-translate-y-px hover:bg-brand-hover active:scale-[0.97] disabled:opacity-50 disabled:hover:translate-y-0">
                <CheckCircleIcon size={18} /> {busy ? 'Reading like a teacher…' : 'Check my writing'}
              </button>
            </div>
          </div>
          {busy && <p className="text-sm text-ink-soft" aria-live="polite">Long essays can take up to a minute.</p>}
        </section>

        <aside className="flex flex-col">
          <div className="mb-1 flex items-baseline justify-between border-b border-line pb-2.5">
            <h2 className="text-[22px] font-semibold tracking-[-0.02em]">Past checks</h2>
          </div>
          {past === null && <div className="mt-3 h-24 animate-pulse rounded-field bg-surface/70" />}
          {past?.length === 0 && <p className="py-3 text-[15px] text-ink-soft">Your checked writing will be listed here.</p>}
          {past?.map((c) => (
            <Link key={c.id} to={`/writing/${c.id}`}
              className="-mx-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-field px-3 py-3 transition-colors hover:bg-surface/70">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{titleOf(c)}</span>
                <span className="block text-sm text-ink-soft">{kindLabel(c.kind)} · {c.wordCount} words · {shortDate(c.createdAt)}</span>
              </span>
              <span className="font-display text-xl font-semibold">{c.score}</span>
            </Link>
          ))}
        </aside>
      </div>
    </div>
  );
}

// A marker sweeping across the page while the AI reads
function MarkerSweep() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-panel bg-surface/40">
      {[0, 1, 2, 3, 4].map((row) => (
        <motion.div key={row}
          className="absolute left-6 h-[18px] origin-left rounded-[3px_6px_4px_7px] bg-marker/60"
          style={{ top: 34 + row * 64, width: '70%' }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: [0, 1, 1], opacity: [0, 1, 0] }}
          transition={{ duration: 1.6, delay: row * 0.32, repeat: Infinity, repeatDelay: 0.6, ease: [0.2, 0.8, 0.2, 1] }} />
      ))}
    </div>
  );
}