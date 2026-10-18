import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeftIcon, ArrowRightIcon, ArrowClockwiseIcon, SpeakerHighIcon, LightbulbIcon, PlayIcon } from '@phosphor-icons/react';
import api, { getErrorMessage } from '../lib/api';
import { MISTAKE_LABELS } from '../lib/corrections';
import { nextType, ownMistakesLabel } from '../lib/grammar';
import { speak, ttsSupported } from '../lib/speak';
import { Fix } from '../components/CorrectedLine';
import { Quiz, QuizResult } from '../components/Quiz';

// A new :type is a new lesson: keying on it starts everything fresh
export default function GrammarLessonPage() {
  const { type } = useParams();
  return <Lesson key={type} type={type} />;
}

function Lesson({ type }) {
  const [lesson, setLesson] = useState(null);
  const [error, setError] = useState(null); // { status, message }
  const [phase, setPhase] = useState('learn'); // learn | practice | done
  const [run, setRun] = useState(0);
  const [results, setResults] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    api.get(`/grammar/lessons/${encodeURIComponent(type)}`)
      .then(({ data }) => setLesson(data.lesson))
      .catch((err) => setError({ status: err.response?.status, message: getErrorMessage(err) }));
  }, [type]);

  if (error?.status === 404) {
    return (
      <div className="flex flex-col items-start gap-3 px-4 py-16 md:px-11">
        <h1 className="text-[clamp(28px,3.4vw,38px)] font-semibold tracking-[-0.03em]">Lesson not found</h1>
        <p className="text-ink-soft">There's no grammar lesson called "{type}".</p>
        <Link to="/grammar" className="font-semibold text-brand hover:text-brand-hover">Back to Grammar</Link>
      </div>
    );
  }
  if (error) return <div className="px-4 py-16 md:px-11"><p role="alert" className="text-mistake-ink">{error.message}</p></div>;
  if (!lesson) return <div className="px-4 py-16 text-ink-soft md:px-11">Loading…</div>;

  const label = MISTAKE_LABELS[type] ?? lesson.title;
  const next = nextType(type);
  const items = lesson.questions.map((q, i) => ({ ...q, key: `${type}-${i}` }));

  function start() {
    setResults(null);
    setSaveError('');
    setRun((r) => r + 1);
    setPhase('practice');
    window.scrollTo({ top: 0 });
  }

  // Saved once, at the end. Leaving mid-quiz saves nothing.
  async function finish(res) {
    setResults(res);
    setPhase('done');
    setSaving(true);
    setSaveError('');
    try {
      await api.post('/grammar/attempts', { kind: 'lesson', type, correct: res.filter((r) => r.right).length, total: res.length });
    } catch (err) {
      setSaveError(getErrorMessage(err));
    }
    setSaving(false);
  }

  const mineLink = (
    <Link to={`/grammar/mine?type=${type}`} className="text-[15px] font-semibold text-brand hover:text-brand-hover">
      {ownMistakesLabel(type)}
    </Link>
  );

  return (
    <div className="flex flex-col gap-7 px-4 py-8 md:px-11 md:py-10">
      <Link to="/grammar" className="flex w-fit items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"><ArrowLeftIcon size={16} /> Grammar</Link>
      <header className="max-w-[760px]">
        <div className="text-sm text-ink-soft">{label} · {lesson.questions.length} practice questions</div>
        <h1 className="mt-1.5 text-[clamp(28px,3.4vw,38px)] font-semibold leading-[1.05] tracking-[-0.03em]">{lesson.title}</h1>
        <p className="mt-2 text-[17px] text-ink-soft">{lesson.summary}</p>
      </header>

      {phase === 'learn' && (
        <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <div className="flex min-w-0 max-w-[760px] flex-col gap-7">
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold">The rule</h2>
              <ul className="flex flex-col gap-2.5">
                {lesson.rule.map((r) => (
                  <li key={r} className="flex gap-3 text-[17px] leading-relaxed">
                    <span className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold">Examples</h2>
              <div className="flex flex-col rounded-panel border border-line bg-surface">
                {lesson.examples.map((ex, i) => (
                  <div key={ex.wrong} className="flex flex-col gap-2 border-b border-line px-5 py-4 last:border-0 md:flex-row md:items-start md:gap-4 md:px-6">
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      {/* Fix's struck-out wrong words and marked right words, on two lines */}
                      <p className="flex flex-col items-start gap-1 text-[18px] leading-snug">
                        <Fix seg={{ wrong: ex.wrong, right: ex.right }} delay={0.3 + i * 0.28} />
                      </p>
                      <p className="text-sm text-ink-soft">{ex.note}</p>
                    </div>
                    {ttsSupported && (
                      <button type="button" onClick={() => speak(ex.right, { rate: 0.9 })} aria-label={`Hear it: ${ex.right}`}
                        className="flex h-10 w-fit shrink-0 items-center gap-1.5 rounded-[10px] border border-line px-3 text-sm font-medium hover:border-ink-faint">
                        <SpeakerHighIcon size={16} /> Hear it
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold">Tips</h2>
              {lesson.tips.map((t) => (
                <p key={t} className="flex gap-2.5 text-[15px] leading-relaxed">
                  <LightbulbIcon size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />{t}
                </p>
              ))}
            </section>
          </div>

          <aside className="flex flex-col gap-4 rounded-panel border border-line bg-surface p-6 xl:sticky xl:top-8">
            <div>
              <h2 className="font-display text-[22px] font-semibold tracking-[-0.02em]">Practice</h2>
              <p className="mt-1 text-[15px] text-ink-soft">{lesson.questions.length} quick questions. You'll see why after each one.</p>
            </div>
            <button type="button" onClick={start}
              className="flex h-12 items-center justify-center gap-2 rounded-field bg-brand px-5 font-semibold text-white transition hover:-translate-y-px hover:bg-brand-hover active:scale-[0.97]">
              <PlayIcon size={18} weight="fill" /> Start practice
            </button>
            {mineLink}
          </aside>
        </div>
      )}

      {phase === 'practice' && (
        <div className="max-w-[760px]">
          <Quiz key={run} items={items} onDone={finish} />
        </div>
      )}

      {phase === 'done' && results && (
        <div className="flex max-w-[760px] flex-col gap-4">
          <QuizResult results={results} saving={saving} saveError={saveError}>
            <button type="button" onClick={start}
              className="flex h-12 items-center gap-2 rounded-field border border-line px-5 font-semibold hover:border-ink-faint">
              <ArrowClockwiseIcon size={18} /> Try again
            </button>
            <Link to={`/grammar/${next}`}
              className="flex h-12 items-center gap-2 rounded-field bg-brand px-5 font-semibold text-white transition hover:bg-brand-hover active:scale-[0.97]">
              Next lesson: {MISTAKE_LABELS[next]} <ArrowRightIcon size={18} />
            </Link>
          </QuizResult>
          {mineLink}
        </div>
      )}

      {phase !== 'learn' && (
        <motion.button type="button" onClick={() => setPhase('learn')} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="w-fit text-sm font-medium text-ink-soft hover:text-ink">
          Back to the lesson
        </motion.button>
      )}
    </div>
  );
}
