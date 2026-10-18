import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from '@phosphor-icons/react';
import api, { getErrorMessage } from '../lib/api';
import { MISTAKE_LABELS } from '../lib/corrections';
import { progressSummary } from '../lib/progressSummary';
import { dayLabel, shortDay, weekday, istKey } from '../lib/dates';
import Segmented from '../components/Segmented';
import { BarChart, ChartCard, LineChart } from '../components/charts';

const RANGES = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
];
const ease = [0.2, 0.8, 0.2, 1];
const s = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export default function ProgressPage() {
  const [params, setParams] = useSearchParams();
  const days = RANGES.some((r) => r.value === params.get('days')) ? params.get('days') : '30';
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [goal, setGoal] = useState(null);

  useEffect(() => {
    let current = true;
    api.get('/progress', { params: { days } })
      .then(({ data }) => current && (setData(data), setError('')))
      .catch((err) => current && setError(getErrorMessage(err)));
    return () => { current = false; };
  }, [days]);

  // The daily goal comes from the Dashboard's numbers, so it follows the goal setting later
  useEffect(() => {
    api.get('/stats/dashboard').then(({ data }) => setGoal(data.goalMin)).catch(() => setGoal(null));
  }, []);

  const pickRange = (v) => { setData(null); setParams(v === '30' ? {} : { days: v }, { replace: true }); };
  const shown = data && String(data.days) === days ? data : null;

  return (
    <div className="flex flex-col gap-6 px-4 py-8 md:px-11 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(30px,3.4vw,38px)] font-semibold leading-[1.05] tracking-[-0.035em]">Progress</h1>
          <p className="mt-2 text-[15px] text-ink-soft">How your practice is going, day by day.</p>
        </div>
        <div className="w-full max-w-[340px]">
          <Segmented label="Time range" layoutId="progress-range" value={days} onChange={pickRange} options={RANGES} />
        </div>
      </header>

      {error && <p role="alert" className="text-sm font-medium text-mistake-ink">{error}</p>}
      {!shown && !error && <div className="h-96 animate-pulse rounded-panel bg-surface/70" />}
      {shown && <ProgressBody data={shown} goal={goal} />}
    </div>
  );
}

function ProgressBody({ data, goal }) {
  const { totals, series, mistakesByType, writing, reading } = data;
  const n = series.length;
  const tick = (key) => (n <= 7 ? weekday(key) : shortDay(key));
  const empty = progressSummary(data).startsWith('Nothing in the last');

  const tiles = [
    ['Minutes', totals.minutes, `in ${data.days} days`],
    ['Conversations', totals.conversations, `${s(totals.writingChecks, 'writing check')}, ${s(totals.readingSessions, 'read-aloud', 'read-alouds')}`],
    ['Day streak', totals.streak, `best ${totals.bestStreak}`],
    ['Words learned', totals.wordsLearned, 'in Vocabulary'],
  ];

  // ---- minutes per day ----
  const minutes = series.map((d, i) => ({ key: d.date, label: dayLabel(d.date), tick: tick(d.date), value: d.minutes, sessions: d.sessions, highlight: i === n - 1 }));
  const busiest = minutes.reduce((a, b) => (b.value > a.value ? b : a), minutes[0]);
  const goalDays = goal ? minutes.filter((d) => d.value >= goal).length : 0;
  const minutesSummary = `Minutes per day over the last ${data.days} days. ${s(totals.minutes, 'minute')} in all` +
    (busiest.value ? `; most on ${busiest.label} with ${s(busiest.value, 'minute')}` : '') +
    (goal ? `. Daily goal ${goal} minutes, reached on ${s(goalDays, 'day')}.` : '.');

  // ---- average score per day (gaps on quiet days) ----
  const scores = series.map((d) => ({ key: d.date, label: dayLabel(d.date), tick: tick(d.date), value: d.avgScore }));
  const scored = scores.filter((p) => p.value != null);
  const scoreSummary = scored.length
    ? `Average score on ${s(scored.length, 'day')} with scored sessions, from ${Math.min(...scored.map((p) => p.value))} to ${Math.max(...scored.map((p) => p.value))}. Latest ${scored.at(-1).value} on ${scored.at(-1).label}.`
    : 'No scored sessions in this period.';

  // ---- writing and reading, one point per session ----
  const wPoints = writing.map((w, i) => ({ key: `${w.date}-${i}`, label: dayLabel(istKey(w.date)), tick: shortDay(istKey(w.date)), value: w.score, extra: w.errorsPer100 }));
  const rPoints = reading.map((r, i) => ({ key: `${r.date}-${i}`, label: dayLabel(istKey(r.date)), tick: shortDay(istKey(r.date)), value: r.wpm, extra: r.accuracy }));

  return (
    <>
      <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease }}
        className="max-w-[70ch] text-[17px] leading-relaxed text-pretty" data-summary>
        {progressSummary(data)}
      </motion.p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(([label, value, sub]) => (
          <div key={label} className="rounded-panel border border-line bg-surface px-5 py-4" data-tile={label}>
            <div className="font-display text-[34px] font-semibold leading-none tracking-[-0.03em] tabular-nums">{value}</div>
            <div className="mt-1.5 text-sm font-medium">{label}</div>
            <div className="text-[13px] text-ink-soft">{sub}</div>
          </div>
        ))}
      </div>

      {empty ? (
        <div className="flex flex-col items-start gap-3 rounded-panel border border-line bg-surface p-6 md:p-8">
          <h2 className="font-display text-[22px] font-semibold tracking-[-0.02em]">Your charts will appear here</h2>
          <p className="text-[15px] text-ink-soft">Have a conversation, check some writing or read a passage aloud, and come back.</p>
          <Link to="/practice" className="flex h-11 items-center rounded-field bg-brand px-5 font-semibold text-white hover:bg-brand-hover">Start practising</Link>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <ChartCard title="Minutes per day" note={goal ? `Dashed line: your ${goal}-minute daily goal` : undefined} className="xl:col-span-2"
            table={{ columns: ['Day', 'Minutes', 'Sessions'], rows: minutes.map((d) => [d.label, d.value, d.sessions]) }}>
            <BarChart points={minutes} goal={goal} summary={minutesSummary} height={210}
              readout={(d) => `${d.label}: ${s(d.value, 'minute')}, ${s(d.sessions, 'session')}${d.highlight ? ' (today)' : ''}`} />
          </ChartCard>

          <ChartCard title="Average score" note="Conversations and writing. Gaps are days without a scored session."
            empty={!scored.length && 'No scored sessions in this period yet.'}
            table={{ columns: ['Day', 'Average score'], rows: scores.map((d) => [d.label, d.value ?? '–']) }}>
            <LineChart points={scores} domain={[0, 100]} summary={scoreSummary}
              readout={(d) => (d.value == null ? `${d.label}: no scored sessions` : `${d.label}: average score ${d.value}`)} />
          </ChartCard>

          <MistakesCard items={mistakesByType} days={data.days} />

          <ChartCard title="Writing scores" note="One point per writing check"
            empty={!wPoints.length && <><span>No writing checks in this period.</span><Link to="/writing" className="font-semibold text-brand hover:text-brand-hover">Check an email or essay</Link></>}
            table={{ columns: ['Day', 'Score', 'Mistakes per 100 words'], rows: wPoints.map((p) => [p.label, p.value, p.extra]) }}>
            <LineChart points={wPoints} domain={[0, 100]}
              summary={`${s(wPoints.length, 'writing check')}, scores from ${Math.min(...wPoints.map((p) => p.value))} to ${Math.max(...wPoints.map((p) => p.value))}. Latest ${wPoints.at(-1)?.value}.`}
              readout={(p) => `${p.label}: score ${p.value}, ${p.extra} mistakes per 100 words`} />
          </ChartCard>

          <ChartCard title="Reading speed" note="Words per minute, one point per read-aloud"
            empty={!rPoints.length && <><span>No read-alouds in this period.</span><Link to="/read-aloud" className="font-semibold text-brand hover:text-brand-hover">Read a passage aloud</Link></>}
            table={{ columns: ['Day', 'Words per minute', 'Accuracy'], rows: rPoints.map((p) => [p.label, p.value, `${p.extra}%`]) }}>
            <LineChart points={rPoints} unit="" summary={`${s(rPoints.length, 'read-aloud', 'read-alouds')}, from ${Math.min(...rPoints.map((p) => p.value))} to ${Math.max(...rPoints.map((p) => p.value))} words per minute.`}
              readout={(p) => `${p.label}: ${p.value} words per minute, ${p.extra}% accurate`} />
          </ChartCard>
        </div>
      )}
    </>
  );
}

// Horizontal bars, each linking to its grammar lesson, with the change against the period before
function MistakesCard({ items, days }) {
  const max = Math.max(1, ...items.map((m) => m.count));
  const changeText = (c) => (c < 0 ? `down ${-c}` : c > 0 ? `up ${c}` : 'no change');
  return (
    <ChartCard title="Mistakes by type" note={`Compared with the ${days} days before. Tap one for its lesson.`}
      empty={!items.length && 'No mistakes in this period. Nice.'}
      table={{ columns: ['Type', 'This period', 'Before', 'Change'], rows: items.map((m) => [MISTAKE_LABELS[m.type] ?? 'Other', m.count, m.previous, m.change > 0 ? `+${m.change}` : m.change]) }}>
      <ul className="flex flex-col gap-1" aria-label="Mistakes by type">
        {items.map((m, i) => (
          <li key={m.type}>
            <Link to={`/grammar/${m.type}`} aria-label={`${MISTAKE_LABELS[m.type] ?? 'Other'}: ${m.count}, ${changeText(m.change)}. Open the lesson.`}
              className="group grid grid-cols-[110px_minmax(0,1fr)_auto] items-center gap-3 rounded-field px-2 py-2 hover:bg-canvas md:grid-cols-[130px_minmax(0,1fr)_auto]">
              <span className="truncate text-[15px] font-medium group-hover:text-brand">{MISTAKE_LABELS[m.type] ?? 'Other'}</span>
              <span className="flex items-center gap-2">
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-canvas">
                  <motion.span className="block h-full origin-left rounded-full bg-brand" style={{ width: `${(m.count / max) * 100}%` }}
                    initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.3, ease, delay: i * 0.04 }} />
                </span>
                <span className="w-6 text-right text-sm font-semibold tabular-nums">{m.count}</span>
              </span>
              <ChangeBadge change={m.change} />
            </Link>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}

// Fewer mistakes is good (green, ↓); more is pink (↑). The arrow means it never relies on colour.
function ChangeBadge({ change }) {
  const cls = change < 0 ? 'bg-correct/12 text-correct-ink' : change > 0 ? 'bg-mistake/10 text-mistake-ink' : 'bg-canvas text-ink-soft';
  const Icon = change < 0 ? ArrowDownIcon : change > 0 ? ArrowUpIcon : MinusIcon;
  return (
    <span className={`flex h-6 min-w-12 items-center justify-center gap-0.5 rounded-tag px-1.5 text-[12px] font-semibold tabular-nums ${cls}`} data-change={change}>
      <Icon size={12} weight="bold" aria-hidden="true" />{change === 0 ? 'same' : Math.abs(change)}
    </span>
  );
}
