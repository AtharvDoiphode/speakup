import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeftIcon, CheckIcon, ArrowRightIcon, CopySimpleIcon, SpeakerHighIcon, TrashIcon } from '@phosphor-icons/react';
import api, { getErrorMessage } from '../lib/api';
import { buildSegments, MISTAKE_LABELS } from '../lib/corrections';
import { Fix } from '../components/CorrectedLine';
import Segmented from '../components/Segmented';
import { speak, ttsSupported } from '../lib/speak';
import { titleOf, kindLabel } from '../lib/writing';

const band = (s) => (s >= 90 ? 'Excellent' : s >= 70 ? 'Good' : s >= 50 ? 'Getting there' : 'Needs work');
const longDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

export default function WritingResultPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [check, setCheck] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('marked');
  const [active, setActive] = useState(null);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    api.get(`/writing/${id}`).then(({ data }) => setCheck(data.check)).catch((err) => setError(getErrorMessage(err)));
  }, [id]);

  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 3000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  if (error) return <div className="px-6 py-16 text-center"><p className="text-mistake-ink">{error}</p><Link to="/writing" className="mt-4 inline-block font-semibold text-brand">Back to Writing</Link></div>;
  if (!check) return <div className="px-6 py-16 text-ink-soft">Loading…</div>;

  const segments = buildSegments(check.text, check.mistakes);

  function select(n, scroll) {
    setActive(n);
    setTab('marked');
    if (scroll) requestAnimationFrame(() => document.querySelector(`[data-fix="${n}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  }

  // The clipboard API only exists on https or localhost. Opened over plain http
  // (for example a phone at http://192.168.x.x), fall back to the older copy command,
  // and say so if even that fails, rather than doing nothing.
  async function copyRewrite() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(check.rewritten);
      ok = true;
    } catch {
      const box = document.createElement('textarea');
      box.value = check.rewritten;
      box.setAttribute('readonly', '');
      box.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(box);
      box.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      box.remove();
    }
    setCopied(ok ? 'done' : 'failed');
    setTimeout(() => setCopied(false), 1500);
  }

  async function remove() {
    if (!confirmDelete) return setConfirmDelete(true);
    try { await api.delete(`/writing/${id}`); navigate('/writing'); } catch (err) { setError(getErrorMessage(err)); }
  }

  return (
    <div className="xl:grid xl:min-h-dvh xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-6 px-4 py-8 md:px-11 md:py-10">
        <Link to="/writing" className="flex w-fit items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"><ArrowLeftIcon size={16} /> Writing</Link>
        <header>
          <div className="text-sm text-ink-soft">{kindLabel(check.kind)} · {check.wordCount} words · {longDate(check.createdAt)}</div>
          <h1 className="mt-1.5 text-[clamp(28px,3.4vw,38px)] font-semibold leading-[1.05] tracking-[-0.03em]">{titleOf(check)}</h1>
        </header>

        <div className="max-w-[360px]">
          <Segmented label="Show" layoutId="writing-tab" value={tab} onChange={setTab}
            options={[{ value: 'marked', label: `Marked (${check.mistakes.length})` }, { value: 'rewritten', label: 'Rewritten' }]} />
        </div>

        <article className="rounded-panel border border-line bg-surface p-6 md:p-9">
          {tab === 'marked' ? (
            <p className="whitespace-pre-wrap text-[18px] leading-[2] text-pretty">
              {segments.map((s, i) => s.type === 'text'
                ? <span key={i}>{s.text}</span>
                : <Fix key={i} seg={s} n={s.n} delay={Math.min(0.3 + (s.n - 1) * 0.09, 2.2)}
                    active={active === s.n} onSelect={() => select(s.n, false)} />)}
            </p>
          ) : (
            <>
              <p className="whitespace-pre-wrap text-[18px] leading-[1.9]">{check.rewritten}</p>
              <div className="mt-6 flex gap-2 border-t border-line pt-4">
                <button onClick={copyRewrite} className="flex h-10 items-center gap-1.5 rounded-[10px] border border-line px-3 text-sm font-medium">
                  <CopySimpleIcon size={16} /> {copied === 'done' ? 'Copied' : copied === 'failed' ? 'Copy failed: select the text instead' : 'Copy'}
                </button>
                {ttsSupported && (
                  <button onClick={() => speak(check.rewritten)} className="flex h-10 items-center gap-1.5 rounded-[10px] border border-line px-3 text-sm font-medium">
                    <SpeakerHighIcon size={16} /> Hear it
                  </button>
                )}
              </div>
            </>
          )}
        </article>
      </div>

      <aside className="flex flex-col gap-6 border-t border-line bg-surface px-4 py-8 md:px-8 xl:sticky xl:top-0 xl:h-dvh xl:overflow-y-auto xl:border-t-0 xl:border-l">
        <div className="flex items-center gap-5">
          <ScoreRing score={check.score} />
          <div>
            <div className="font-display text-2xl font-semibold tracking-[-0.02em]">{band(check.score)}</div>
            <div className="text-sm text-ink-soft">{check.errorsPer100} mistakes per 100 words</div>
          </div>
        </div>
        <p className="text-[15px] leading-relaxed">{check.summary}</p>

        <div className="flex flex-col gap-3 border-t border-line pt-5">
          {[['Structure', check.feedback.structure], ['Tone', check.feedback.tone], ['Vocabulary', check.feedback.vocabulary]].map(([k, v]) => (
            <div key={k}><div className="text-sm font-semibold">{k}</div><p className="text-[15px] leading-snug text-ink-soft">{v}</p></div>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-line pt-5">
          <div className="text-sm font-semibold">What worked</div>
          {check.strengths.map((s) => <p key={s} className="flex gap-2 text-[15px] leading-snug"><CheckIcon size={16} className="mt-0.5 shrink-0 text-correct-ink" />{s}</p>)}
          <div className="mt-2 text-sm font-semibold">Next time</div>
          {check.improvements.map((s) => <p key={s} className="flex gap-2 text-[15px] leading-snug"><ArrowRightIcon size={16} className="mt-0.5 shrink-0 text-brand" />{s}</p>)}
        </div>

        {check.mistakes.length > 0 && (
          <div className="flex flex-col border-t border-line pt-5">
            <div className="mb-1 text-sm font-semibold">Mistakes</div>
            {check.mistakes.map((m, i) => (
              <button key={i} type="button" onClick={() => select(i + 1, true)} aria-pressed={active === i + 1}
                className={`-mx-2 flex flex-col gap-1 rounded-field px-2 py-2.5 text-left transition-colors ${active === i + 1 ? 'bg-canvas' : 'hover:bg-canvas/60'}`}>
                <span className="flex items-baseline gap-2 text-[15px]">
                  <span className="font-semibold">{i + 1}</span>
                  <span className="text-mistake-ink line-through decoration-mistake decoration-[1.5px]">{m.wrong}</span>
                  {m.right && <span className="rounded-[2px_4px_3px_5px] bg-marker px-1">{m.right}</span>}
                  <span className="ml-auto text-xs text-ink-soft">{MISTAKE_LABELS[m.type] ?? 'Other'}</span>
                </span>
                <span className="text-[13px] leading-snug text-ink-soft">{m.rule}</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-auto flex gap-2 pt-2">
          <Link to="/writing" className="flex h-11 flex-1 items-center justify-center rounded-field bg-brand font-semibold text-white hover:bg-brand-hover">Check another</Link>
          <button onClick={remove} className="flex h-11 items-center gap-1.5 rounded-field border border-mistake px-3 text-sm font-semibold text-mistake-ink">
            <TrashIcon size={16} /> {confirmDelete ? 'Tap again' : 'Delete'}
          </button>
        </div>
      </aside>
    </div>
  );
}

function ScoreRing({ score }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-[88px] shrink-0">
      <svg viewBox="0 0 88 88" className="size-full -rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" strokeWidth="8" className="stroke-canvas" />
        <motion.circle cx="44" cy="44" r={r} fill="none" strokeWidth="8" strokeLinecap="round" className="stroke-brand"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - score / 100) }}
          transition={{ delay: 0.3, duration: 1, ease: [0.2, 0.8, 0.2, 1] }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-[28px] font-semibold tracking-[-0.03em]">{score}</span>
    </div>
  );
}