import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeftIcon, ArrowClockwiseIcon } from '@phosphor-icons/react';
import api, { getErrorMessage } from '../lib/api';
import { MISTAKE_LABELS } from '../lib/corrections';
import { isGrammarType, mistakePhrase, shuffle } from '../lib/grammar';
import Segmented from '../components/Segmented';
import { Quiz, QuizResult } from '../components/Quiz';

// "Which is correct?" from your own saved mistakes: the wrong and right versions, shuffled
const toQuestion = (m) => {
  const options = shuffle([m.wrong, m.right]);
  return {
    key: m.id,
    prompt: 'Which is correct?',
    options,
    answer: options.indexOf(m.right),
    why: m.rule || `The right version is "${m.right}".`,
    tag: MISTAKE_LABELS[m.type] ?? 'Other',
  };
};

export default function GrammarMinePage() {
  const [params] = useSearchParams();
  const from = isGrammarType(params.get('type')) ? params.get('type') : null; // arrived from this lesson
  const [filter, setFilter] = useState(from ?? 'all');
  const [quiz, setQuiz] = useState(null); // { items, have, needed }
  const [error, setError] = useState('');
  const [run, setRun] = useState(0);
  const [results, setResults] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Every fetch is a fresh round: the questions and both options come in a new random order
  const fetchRound = useCallback((f) => {
    api.get('/grammar/quiz', { params: f === 'all' ? {} : { type: f } })
      .then(({ data }) => {
        setQuiz({ ...data, items: shuffle(data.items).map(toQuestion) });
        setRun((r) => r + 1);
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  useEffect(() => {
    fetchRound(filter);
  }, [filter, fetchRound]);

  function reset() {
    setQuiz(null);
    setResults(null);
    setError('');
  }
  function changeFilter(f) {
    if (f === filter) return;
    reset();
    setFilter(f); // the effect fetches the new set
  }
  function again() {
    reset();
    fetchRound(filter);
  }

  async function finish(res) {
    setResults(res);
    setSaving(true);
    setSaveError('');
    try {
      await api.post('/grammar/attempts', {
        kind: 'mine',
        ...(filter !== 'all' && { type: filter }),
        correct: res.filter((r) => r.right).length,
        total: res.length,
      });
    } catch (err) {
      setSaveError(getErrorMessage(err));
    }
    setSaving(false);
  }

  const onlyLabel = from && `Only ${MISTAKE_LABELS[from].toLowerCase()}`;

  return (
    <div className="flex flex-col gap-7 px-4 py-8 md:px-11 md:py-10">
      <Link to={from ? `/grammar/${from}` : '/grammar'} className="flex w-fit items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
        <ArrowLeftIcon size={16} /> {from ? MISTAKE_LABELS[from] : 'Grammar'}
      </Link>
      <header className="max-w-[760px]">
        <h1 className="text-[clamp(28px,3.4vw,38px)] font-semibold leading-[1.05] tracking-[-0.03em]">Practise your mistakes</h1>
        <p className="mt-2 text-[15px] text-ink-soft">Real mistakes from your Practice and Writing. Pick the right version.</p>
      </header>

      {from && (
        <div className="max-w-[420px]">
          <Segmented label="Mistakes" layoutId="mine-filter" value={filter} onChange={changeFilter}
            options={[{ value: 'all', label: 'All my mistakes' }, { value: from, label: onlyLabel }]} />
        </div>
      )}

      <div className="max-w-[760px]">
        {error && <p role="alert" className="text-sm font-medium text-mistake-ink">{error}</p>}
        {!quiz && !error && <div className="h-48 animate-pulse rounded-panel bg-surface/70" />}

        {quiz && quiz.items.length === 0 && (
          <div className="flex flex-col items-start gap-3 rounded-panel border border-line bg-surface p-6 md:p-8">
            <h2 className="font-display text-[22px] font-semibold tracking-[-0.02em]">Not enough mistakes yet</h2>
            <p className="text-[15px] text-ink-soft">
              {filter === 'all'
                ? `Do a few more practice sessions first (you have ${quiz.have} of ${quiz.needed}).`
                : `You have ${mistakePhrase(filter, quiz.have)} saved, and this needs ${quiz.needed}. Try all your mistakes instead.`}
            </p>
            {filter === 'all'
              ? <Link to="/practice" className="font-semibold text-brand hover:text-brand-hover">Go to Practice</Link>
              : <button type="button" onClick={() => changeFilter('all')} className="font-semibold text-brand hover:text-brand-hover">Use all my mistakes</button>}
          </div>
        )}

        {quiz && quiz.items.length > 0 && !results && <Quiz key={run} items={quiz.items} onDone={finish} />}

        {results && (
          <QuizResult results={results} saving={saving} saveError={saveError}>
            <button type="button" onClick={again}
              className="flex h-12 items-center gap-2 rounded-field bg-brand px-5 font-semibold text-white transition hover:bg-brand-hover active:scale-[0.97]">
              <ArrowClockwiseIcon size={18} /> Try again
            </button>
            <Link to={from ? `/grammar/${from}` : '/grammar'}
              className="flex h-12 items-center gap-2 rounded-field border border-line px-5 font-semibold hover:border-ink-faint">
              {from ? `Back to ${MISTAKE_LABELS[from]}` : 'Back to Grammar'}
            </Link>
          </QuizResult>
        )}
      </div>
    </div>
  );
}
