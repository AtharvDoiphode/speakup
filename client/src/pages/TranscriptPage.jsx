import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon, FilePdfIcon, TrashIcon } from '@phosphor-icons/react';
import api, { getErrorMessage } from '../lib/api';
import { useAuth } from '../context/useAuth';
import { buildSegments, MISTAKE_LABELS } from '../lib/corrections';
import { longDate } from '../lib/dates';
import { Fix } from '../components/CorrectedLine';
import ScoreRing from '../components/ScoreRing';

const mins = (sec) => Math.max(1, Math.round((sec || 0) / 60));

// Each AI line with the replies that follow it, so they print together on one page
function exchanges(messages) {
  const groups = [];
  for (const m of messages) {
    if (m.role === 'ai' || !groups.length) groups.push([]);
    groups.at(-1).push(m);
  }
  return groups;
}

export default function TranscriptPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [c, setC] = useState(null);
  const [error, setError] = useState(null);
  const [showFixes, setShowFixes] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/conversations/${id}`)
      .then(({ data }) => setC(data.conversation))
      .catch((err) => setError({ status: err.response?.status, message: getErrorMessage(err) }));
  }, [id]);

  useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(false), 3000);
    return () => clearTimeout(t);
  }, [confirm]);

  // While printing (the button or Ctrl+P), the title becomes the PDF's file name
  useEffect(() => {
    if (!c) return;
    const original = document.title;
    const named = `SpeakUp - ${c.title} - ${longDate(c.endedAt ?? c.createdAt)}`;
    const before = () => { document.title = named; };
    const after = () => { document.title = original; };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => { window.removeEventListener('beforeprint', before); window.removeEventListener('afterprint', after); document.title = original; };
  }, [c]);

  async function remove() {
    if (!confirm) return setConfirm(true);
    setBusy(true);
    try {
      await api.delete(`/conversations/${id}`);
      navigate('/history', { replace: true });
    } catch (err) {
      setError({ message: getErrorMessage(err) });
      setBusy(false);
    }
  }

  if (error?.status === 404) {
    return (
      <div className="flex flex-col items-start gap-3 px-4 py-16 md:px-11">
        <h1 className="text-[clamp(28px,3.4vw,38px)] font-semibold tracking-[-0.03em]">Session not found</h1>
        <p className="text-ink-soft">It may have been deleted.</p>
        <Link to="/history" className="font-semibold text-brand hover:text-brand-hover">Back to History</Link>
      </div>
    );
  }
  if (error && !c) return <div className="px-4 py-16 md:px-11"><p role="alert" className="text-mistake-ink">{error.message}</p></div>;
  if (!c) return <div className="px-4 py-16 text-ink-soft md:px-11">Loading…</div>;

  const persona = c.persona ?? {};
  const mine = c.messages.filter((m) => m.role === 'user');
  const allMistakes = mine.flatMap((m) => m.mistakes ?? []);
  const types = [...new Set(allMistakes.map((m) => m.type).filter(Boolean))];
  const when = longDate(c.endedAt ?? c.createdAt);

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-11 md:py-10 print:gap-4 print:p-0">
      {/* Only on paper */}
      <div className="hidden border-b-2 border-ink pb-3 print:block" data-print-header>
        <div className="text-[16pt] font-bold">SpeakUp</div>
        <div className="text-[11pt]">{user?.name} · {c.title} · {when} · Score {c.score ?? '–'}{c.score != null ? '%' : ''}</div>
      </div>

      <Link to="/history" className="flex w-fit items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink print:hidden"><ArrowLeftIcon size={16} /> History</Link>

      <header className="flex flex-wrap items-center gap-5 print:hidden">
        {c.score != null && <ScoreRing score={c.score} />}
        <div className="min-w-0 flex-1">
          <div className="text-sm text-ink-soft">{when}{c.status !== 'ended' ? ' · not finished' : ''}</div>
          <h1 className="mt-1 text-[clamp(26px,3.2vw,36px)] font-semibold leading-[1.1] tracking-[-0.03em]">{c.title}</h1>
          <p className="mt-1 text-[15px] text-ink-soft">
            with {[persona.name, persona.roleLong || persona.role].filter(Boolean).join(', ')} · {mins(c.durationSec)} min · {allMistakes.length} mistake{allMistakes.length === 1 ? '' : 's'} · {mine.length} repl{mine.length === 1 ? 'y' : 'ies'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => window.print()}
            className="flex h-11 items-center gap-1.5 rounded-field border border-line bg-surface px-4 text-sm font-semibold hover:border-ink-faint">
            <FilePdfIcon size={17} /> Save as PDF
          </button>
          <button type="button" onClick={remove} disabled={busy}
            className="flex h-11 items-center gap-1.5 rounded-field border border-mistake px-4 text-sm font-semibold text-mistake-ink">
            <TrashIcon size={16} /> {confirm ? 'Tap again' : 'Delete'}
          </button>
        </div>
      </header>
      {error && <p role="alert" className="text-sm text-mistake-ink print:hidden">{error.message}</p>}

      <div className="flex items-center gap-3 print:hidden">
        <button type="button" role="switch" aria-checked={showFixes} onClick={() => setShowFixes((v) => !v)}
          className="flex items-center gap-2.5 text-[15px] font-medium">
          <span className={`relative h-6 w-10 rounded-full transition-colors ${showFixes ? 'bg-brand' : 'bg-line'}`}>
            <span className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${showFixes ? 'left-[18px]' : 'left-0.5'}`} />
          </span>
          Show corrections
        </button>
      </div>

      <article className="flex max-w-[820px] flex-col gap-4 print:max-w-none print:gap-3 print:text-[11pt]">
        {exchanges(c.messages).map((group, gi) => (
          <div key={gi} className="flex flex-col gap-3 rounded-panel border border-line bg-surface p-5 md:p-6 print:break-inside-avoid print:rounded-none print:border-0 print:border-b print:p-0 print:pb-3" data-exchange={gi}>
            {group.map((m, mi) => (m.role === 'ai' ? (
              <div key={mi} className="flex flex-col gap-0.5">
                <span className="text-[13px] font-semibold text-ink-soft print:text-[9pt]">{persona.name || 'Partner'}</span>
                <p className="text-[16px] leading-relaxed print:text-[11pt]">{m.text}</p>
              </div>
            ) : (
              <UserLine key={mi} m={m} showFixes={showFixes} />
            )))}
          </div>
        ))}
      </article>

      {types.length > 0 && (
        <section className="flex flex-col gap-2 print:break-inside-avoid">
          <h2 className="text-[15px] font-semibold">What to practise</h2>
          <div className="flex flex-wrap gap-2">
            {types.map((t) => (
              <Link key={t} to={`/grammar/${t}`} className="flex h-10 items-center rounded-tag border border-line bg-surface px-3 text-sm font-semibold hover:border-brand hover:text-brand print:h-auto print:border-0 print:p-0">
                {MISTAKE_LABELS[t] ?? 'Other'} · {allMistakes.filter((m) => m.type === t).length}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function UserLine({ m, showFixes }) {
  const fixes = m.mistakes ?? [];
  const segs = buildSegments(m.text, fixes);
  return (
    <div className="flex flex-col gap-1 border-l-2 border-brand pl-3 print:border-ink" data-user-line>
      <span className="text-[13px] font-semibold text-brand print:text-[9pt] print:text-ink">You</span>
      <p className="text-[16px] leading-[1.7] print:text-[11pt] print:leading-normal">
        {showFixes && fixes.length
          ? segs.map((s, i) => (s.type === 'text' ? <span key={i}>{s.text}</span> : <Fix key={i} seg={s} delay={0.1} />))
          : m.text}
      </p>
      {showFixes && fixes.length > 0 && (
        <ol className="flex flex-col gap-0.5 text-[13px] text-ink-soft print:text-[9pt]">
          {fixes.map((f, i) => <li key={i}><span className="font-semibold text-ink">{i + 1}.</span> {f.rule}</li>)}
        </ol>
      )}
      {showFixes && !fixes.length && <span className="text-[13px] text-correct-ink print:text-[9pt]">No mistakes.</span>}
    </div>
  );
}
