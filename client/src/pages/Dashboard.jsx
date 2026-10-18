import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRightIcon, BookOpenIcon, MicrophoneIcon, SpeakerHighIcon } from '@phosphor-icons/react';
import api, { getErrorMessage } from '../lib/api';
import { useAuth } from '../context/useAuth';
import { MISTAKE_LABELS } from '../lib/corrections';
import { wordOfTheDay } from '../lib/words';
import { speak, ttsSupported } from '../lib/speak';
import VoiceOrb from '../components/VoiceOrb';

const ease = [0.2, 0.8, 0.2, 1];
const card = (i) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.05 * i, duration: 0.35, ease },
});

const firstName = (n = '') => n.trim().split(/\s+/)[0] || 'there';
const weekday = (key) => new Date(`${key}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'narrow' });
const shortDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  // Worked out once when the page opens, not on every render
  const [{ word, todayLabel }] = useState(() => ({
    word: wordOfTheDay(),
    todayLabel: new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' }),
  }));

  const [wordsDue, setWordsDue] = useState(0);

  useEffect(() => {
    api.get('/stats/dashboard').then(({ data }) => setData(data)).catch((err) => setError(getErrorMessage(err)));
    // Just a small extra line, so a failure here is ignored
    api.get('/vocab/overview').then(({ data }) => setWordsDue(data.dueCount)).catch(() => {});
  }, []);

  async function startChallenge() {
    setStarting(true);
    setError('');
    try {
      const res = await api.post('/conversations', { scenarioId: data.challenge.scenarioId, difficulty: 'neutral' });
      navigate(`/practice/${res.data.conversation._id}`); // the server answers 201 { conversation }
    } catch (err) {
      setError(getErrorMessage(err));
      setStarting(false);
    }
  }

  const name = firstName(user?.name);

  let headline = `${name}, let's have your first conversation.`;
  if (data?.hasSessions) {
    const left = data.goalMin - data.today.minutes;
    headline = left > 0
      ? `${name}, you're ${left} minute${left === 1 ? '' : 's'} from today's goal.`
      : `${name}, today's goal is done. Nice work.`;
  }

  return (
    <div className="flex flex-col gap-7 px-4 py-8 md:px-12 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="text-[15px] text-ink-soft">{todayLabel}</div>
          <h1 className="mt-1.5 max-w-[22ch] text-[clamp(30px,3.6vw,42px)] font-semibold leading-[1.05] tracking-[-0.035em] md:max-w-none">
            {data ? headline : `Welcome back, ${name}.`}
          </h1>
          {wordsDue > 0 && (
            <Link to="/vocabulary/review" className="mt-2 inline-flex items-center gap-1.5 text-[15px] font-semibold text-brand hover:text-brand-hover">
              <BookOpenIcon size={17} aria-hidden="true" /> {wordsDue} word{wordsDue === 1 ? '' : 's'} to review <ArrowRightIcon size={15} aria-hidden="true" />
            </Link>
          )}
        </div>
        <Link to="/practice"
          className="flex h-11 items-center gap-2 rounded-field border border-line bg-surface px-4 text-[15px] font-semibold transition hover:-translate-y-px active:scale-[0.97]">
          <MicrophoneIcon size={18} /> All scenes
        </Link>
      </header>

      {error && <p role="alert" className="text-mistake-ink">{error}</p>}

      {!data ? (
        <DashboardSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-12">
          {/* Challenge */}
          <motion.section {...card(0)}
            className="relative flex min-h-[340px] flex-col overflow-hidden rounded-panel bg-ink px-7 py-8 text-white md:col-span-2 xl:col-span-8 xl:row-span-2 xl:min-h-[400px] xl:px-11 xl:py-10">
            {/* Smaller and fainter where the card is narrow, so the text on top stays readable */}
            <div aria-hidden="true" className="pointer-events-none absolute -right-[150px] -bottom-[200px] size-[340px] opacity-35 md:opacity-50 xl:-right-[130px] xl:-bottom-[150px] xl:size-[460px] xl:opacity-90">
              <VoiceOrb state="idle" />
            </div>
            <div className="relative text-base text-[#C9CFF0]">Today's speaking challenge</div>
            <h2 className="relative mt-4 max-w-[560px] font-display text-[clamp(26px,3vw,40px)] font-semibold leading-[1.08] tracking-[-0.03em] text-pretty">
              {data.challenge.brief}
            </h2>
            <div className="relative mt-5 flex flex-wrap gap-x-[18px] gap-y-2 text-[15px] text-[#C9CFF0]">
              <span>{data.challenge.category}</span>
              <span>With {data.challenge.who}, {data.challenge.role}</span>
              <span>About {data.challenge.minutes} min</span>
            </div>
            <div className="relative mt-auto flex flex-wrap items-center gap-4 pt-8">
              <button onClick={startChallenge} disabled={starting}
                className="flex h-14 items-center gap-2.5 rounded-field bg-brand px-6 text-[17px] font-semibold transition hover:-translate-y-px hover:bg-brand-hover active:scale-[0.97] disabled:cursor-wait disabled:opacity-80">
                <MicrophoneIcon size={20} />
                {starting ? `${data.challenge.who} is getting ready…` : `Start with ${data.challenge.who}`}
              </button>
              {data.challenge.focusType && (
                <span className="text-[15px] text-[#C9CFF0]">Focus: {MISTAKE_LABELS[data.challenge.focusType]?.toLowerCase()}</span>
              )}
            </div>
          </motion.section>

          {/* Minutes today */}
          <motion.section {...card(1)} className="flex flex-col gap-3.5 rounded-panel border border-line bg-surface px-[26px] py-6 xl:col-span-4">
            <div className="text-[15px] font-semibold">Minutes spoken today</div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[72px] font-semibold leading-[0.9] tracking-[-0.04em]">{data.today.minutes}</span>
              <span className="text-[17px] text-ink-soft">of {data.goalMin} min</span>
            </div>
            <div className="h-2 overflow-hidden rounded-[4px] border border-line bg-canvas">
              <motion.div className="h-full bg-brand" initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (data.today.minutes / data.goalMin) * 100)}%` }}
                transition={{ delay: 0.3, duration: 0.7, ease }} />
            </div>
            <div className="text-sm text-ink-soft">
              {data.today.yesterdayMinutes ? `Yesterday you spoke for ${data.today.yesterdayMinutes}.` : 'Minutes count when you end a session.'}
            </div>
          </motion.section>

          {/* Streak */}
          <motion.section {...card(2)} className="flex flex-col gap-4 rounded-panel border border-line bg-surface px-[26px] py-6 xl:col-span-4">
            <StreakCard streak={data.streak} last7={data.last7} />
          </motion.section>

          {/* Recurring mistakes */}
          <motion.section {...card(3)} className="flex flex-col rounded-panel border border-line bg-surface px-[26px] py-6 xl:col-span-5 xl:row-span-2">
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-[15px] font-semibold">Recurring mistakes this week</span>
              <Link to="/progress" className="text-sm text-brand hover:text-brand-hover hover:underline">Progress</Link>
            </div>
            {data.mistakes.length === 0 ? (
              <p className="py-4 text-[15px] text-ink-soft">No mistakes logged this week. Finish a session and they'll show up here.</p>
            ) : (
              data.mistakes.map((m) => <MistakeRow key={m.type} m={m} />)
            )}
          </motion.section>

          {/* Word of the day */}
          <motion.section {...card(4)} className="flex flex-col gap-2.5 rounded-panel border border-line bg-surface px-[26px] py-6 xl:col-span-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[15px] font-semibold">Word of the day</span>
              {ttsSupported && (
                <button onClick={() => speak(`${word.word}. ${word.example}`)} aria-label={`Hear ${word.word}`}
                  className="rounded-tag p-1 text-brand hover:text-brand-hover">
                  <SpeakerHighIcon size={20} />
                </button>
              )}
            </div>
            <div className="mt-1.5 font-display text-[38px] font-semibold leading-none tracking-[-0.03em]">{word.word}</div>
            <div className="text-sm text-ink-soft">{word.pos} · {word.ipa}</div>
            <div className="text-base leading-snug">{word.meaning}</div>
            <div className="border-t border-line pt-2.5 text-[15px] leading-normal text-ink-soft">"{word.example}"</div>
          </motion.section>

          {/* Family */}
          {data.family.length > 1 && (
            <motion.section {...card(5)} className="flex flex-col gap-3 rounded-panel border border-line bg-surface px-[22px] py-6 xl:col-span-3">
              <span className="text-[15px] font-semibold">Family this week</span>
              {data.family.map((f, i) => {
                const max = data.family[0].minutes || 1;
                return (
                  <div key={i} className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-[15px]">
                      <span className={f.isMe ? 'font-semibold' : ''}>{i + 1}. {f.name}</span>
                      <span className="text-ink-soft">{f.minutes} min</span>
                    </div>
                    <div className="h-1 rounded-[2px] bg-canvas">
                      <motion.div className={`h-full rounded-[2px] ${f.isMe ? 'bg-brand' : 'bg-ink-soft'}`}
                        initial={{ width: 0 }} animate={{ width: `${(f.minutes / max) * 100}%` }}
                        transition={{ delay: 0.4 + i * 0.08, duration: 0.6, ease }} />
                    </div>
                  </div>
                );
              })}
            </motion.section>
          )}

          {/* Last sessions */}
          <motion.section {...card(6)}
            className={`flex flex-col rounded-panel border border-line bg-surface px-[26px] pt-[22px] pb-2 md:col-span-2 ${data.family.length > 1 ? 'xl:col-span-7' : 'xl:col-span-7 xl:col-start-6'}`}>
            <div className="flex items-baseline justify-between">
              <span className="text-[15px] font-semibold">Last sessions</span>
              <Link to="/history" className="text-sm text-brand hover:text-brand-hover hover:underline">History</Link>
            </div>
            {data.recent.length === 0 ? (
              <p className="py-4 text-[15px] text-ink-soft">Your finished sessions will appear here.</p>
            ) : (
              data.recent.map((s) => (
                <Link key={s.id} to={s.type === 'reading' ? '/read-aloud' : `/history/${s.id}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-3.5 text-[15px] last:border-0 md:grid-cols-[minmax(0,1fr)_110px_70px_80px]">
                  <span className="flex flex-col gap-0.5">
                    <span className="font-semibold">{s.title}</span>
                    <span className="text-sm text-ink-soft">{s.with}</span>
                  </span>
                  <span className="hidden text-ink-soft md:block">{shortDate(s.endedAt)}</span>
                  <span className="hidden text-ink-soft md:block">{s.minutes} min</span>
                  <span className="text-right font-display text-xl font-semibold">
                    {s.score ?? '–'}<span className="font-body text-[13px] font-normal text-ink-soft">{s.score != null ? (s.unit === 'wpm' ? ' wpm' : '%') : ''}</span>
                  </span>
                </Link>
              ))
            )}
          </motion.section>
        </div>
      )}
    </div>
  );
}

function StreakCard({ streak, last7 }) {
  const todayDone = last7[last7.length - 1]?.done;
  const title = streak === 0 ? 'No streak yet' : `${streak}-day streak`;
  const note = streak === 0 ? 'Talk today to start one' : todayDone ? 'Today counted' : `Today makes it ${streak + 1}`;
  const rots = [-4, 3, -2, 5, -3, 2, -1];

  return (
    <>
      <div className="flex items-baseline justify-between">
        <span className="text-[15px] font-semibold">{title}</span>
        <span className="text-sm text-ink-soft">{note}</span>
      </div>
      <div className="grid grid-cols-7 items-end gap-1.5" aria-label={`Last 7 days: ${last7.filter((d) => d.done).length} with practice`}>
        {last7.map((d, i) => {
          const isToday = i === last7.length - 1;
          return (
            <div key={d.date} className="flex flex-col items-center gap-2">
              <div className="flex h-10 items-end">
                {d.done ? (
                  <motion.div className="h-10 w-[9px] origin-bottom rounded-[5px_4px_6px_3px] bg-brand"
                    style={{ rotate: rots[i] }}
                    initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                    transition={{ delay: 0.35 + i * 0.06, duration: 0.4, ease }} />
                ) : isToday ? (
                  <div className="h-10 w-[9px] rounded-[5px] border-[1.5px] border-dashed border-ink-soft" />
                ) : (
                  <div className="h-2.5 w-[9px] rounded-[3px] bg-line" />
                )}
              </div>
              <span className="text-[13px] text-ink-soft">{weekday(d.date)}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function MistakeRow({ m }) {
  let trend = { text: 'New this week', cls: 'text-ink-soft' };
  if (m.prevCount > 0) {
    if (m.count < m.prevCount) trend = { text: `Down from ${m.prevCount}`, cls: 'text-correct-ink' };
    else if (m.count > m.prevCount) trend = { text: `Up from ${m.prevCount}`, cls: 'text-mistake-ink' };
    else trend = { text: 'Same as last week', cls: 'text-ink-soft' };
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_120px] items-center gap-4 border-b border-line py-[18px] last:border-0">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline gap-2.5">
          <Link to={`/grammar/${m.type}`} className="font-display text-[22px] font-semibold tracking-[-0.02em] hover:text-brand hover:underline">
            {MISTAKE_LABELS[m.type] ?? 'Other'}
          </Link>
          <span className="text-sm text-ink-soft">{m.count} this week</span>
        </div>
        {m.example && (
          <div className="text-[15px]">
            <span className="text-mistake-ink line-through decoration-mistake decoration-2">{m.example.wrong}</span>{' '}
            <span className="rounded-[2px_4px_3px_5px] bg-marker px-1">{m.example.right}</span>
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-1">
        <Sparkline values={m.daily} />
        <span className={`text-[13px] font-medium ${trend.cls}`}>{trend.text}</span>
      </div>
    </div>
  );
}

function Sparkline({ values }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const points = values
    .map((v, i) => `${((i / (values.length - 1)) * 120).toFixed(1)},${(28 - ((v - min) / (max - min || 1)) * 24).toFixed(1)}`)
    .join(' ');
  return (
    <svg viewBox="0 0 120 32" className="h-8 w-[120px] overflow-visible" role="img" aria-label={`Daily counts: ${values.join(', ')}`}>
      <motion.polyline points={points} fill="none" className="stroke-mistake" strokeWidth="1.75"
        strokeLinejoin="round" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.5, duration: 0.8, ease }} />
    </svg>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-12" aria-hidden="true">
      <div className="h-[400px] animate-pulse rounded-panel bg-ink/10 md:col-span-2 xl:col-span-8 xl:row-span-2" />
      <div className="h-[190px] animate-pulse rounded-panel bg-surface/70 xl:col-span-4" />
      <div className="h-[190px] animate-pulse rounded-panel bg-surface/70 xl:col-span-4" />
      <div className="h-[300px] animate-pulse rounded-panel bg-surface/70 xl:col-span-5" />
      <div className="h-[300px] animate-pulse rounded-panel bg-surface/70 xl:col-span-7" />
    </div>
  );
}