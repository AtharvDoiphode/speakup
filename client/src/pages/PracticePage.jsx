import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { CaretDownIcon, CheckIcon, MicrophoneIcon, XIcon } from '@phosphor-icons/react';
import api, { getErrorMessage } from '../lib/api';
import Segmented from '../components/Segmented';
import { DIFFICULTIES } from '../lib/modes';
import { InterviewPanel, DebatePanel, PeoplePanel } from '../components/practice/ModePanels';

const spring = { type: 'spring', stiffness: 500, damping: 40 };

const TABS = [
  { value: 'scenes', label: 'Scenes' },
  { value: 'interview', label: 'Interview' },
  { value: 'debate', label: 'Debate' },
  { value: 'people', label: 'My people' },
];
const HEADINGS = {
  scenes: ['Who do you want to talk to?', 'Pick a scene. The character stays in role until you end the session.'],
  interview: ['Practise a job interview', 'Ten questions from a realistic interviewer, then a scorecard on how you did.'],
  debate: ['Argue your side', 'Pick a motion and a side. Arjun takes the other one for five rounds.'],
  people: ['Talk to your own people', 'Create the people you really need to talk to, and practise with them anytime.'],
};

// One of your saved people, shaped like a scene so the same start panel can show them
const personScene = (p) => ({
  id: p.id, isPerson: true, title: `Talk with ${p.name}`, brief: p.brief,
  who: p.name, roleLong: p.role, traits: p.traits, personMood: p.mood, practise: [],
});

const initials = (name) =>
  name.replace(/^(Dr|Mr|Ms|Mrs)\.\s*/, '').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

export default function PracticePage() {
  const navigate = useNavigate();
  const isDesktop = useMediaQuery('(min-width: 1280px)');
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'scenes';
  // The tab lives in the URL, so a reload or the back button returns to it
  const setTab = (t) => { setSheetOpen(false); setStartError(''); setParams(t === 'scenes' ? {} : { tab: t }, { replace: true }); };
  const [modes, setModes] = useState(null);
  const [person, setPerson] = useState(null); // the saved person picked to start with

  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [selId, setSelId] = useState(null);
  const [difficulty, setDifficulty] = useState('neutral');
  const [traits, setTraits] = useState([]);
  const [mood, setMood] = useState('Neutral');
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    api.get('/scenarios')
      .then(({ data }) => {
        if (!alive) return;
        setData(data);
        setSelId((id) => id ?? data.scenarios[0]?.id);
      })
      .catch((err) => alive && setLoadError(getErrorMessage(err)));
    return () => { alive = false; };
  }, []);

  // Interview focuses, debate topics and turn counts
  useEffect(() => {
    api.get('/modes').then(({ data }) => setModes(data)).catch(() => setModes(null));
  }, []);

  // Keep the picked person up to date when they're edited, and forget them if deleted
  const onPeopleChange = useCallback((list) => {
    setPerson((cur) => (cur ? list.find((x) => x.id === cur.id) ?? null : cur));
  }, []);

  const groups = useMemo(
    () => (data ? data.categories.map((name) => ({ name, items: data.scenarios.filter((s) => s.category === name) })) : []),
    [data]
  );
  const scene = data?.scenarios.find((s) => s.id === selId);

  function pick(id) {
    if (id !== selId) {
      setSelId(id);
      setTraits([]);
      setMood('Neutral');
      setStartError('');
    }
    if (!isDesktop) setSheetOpen(true);
  }

  function toggleTrait(t) {
    setTraits((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : cur.length < 3 ? [...cur, t] : cur));
  }

  function pickPerson(p) {
    if (p.id !== person?.id) setStartError('');
    setPerson(p);
    if (!isDesktop) setSheetOpen(true);
  }

  async function start() {
    setStarting(true);
    setStartError('');
    try {
      const body = tab === 'people' ? { personId: person.id, difficulty } : { scenarioId: scene.id, difficulty, traits, mood };
      const res = await api.post('/conversations', body);
      // The server answers 201 { conversation }, and Mongo's id field is "_id"
      navigate(`/practice/${res.data.conversation._id}`);
    } catch (err) {
      setStartError(getErrorMessage(err));
      setStarting(false);
    }
  }

  const shown = tab === 'people' ? (person ? personScene(person) : null) : scene;
  const withSheet = tab === 'scenes' || tab === 'people';
  const panelProps = {
    scene: shown, difficulty, setDifficulty, traits, toggleTrait, mood, setMood,
    extraTraits: data?.extraTraits ?? [], moods: data?.moods ?? [],
    starting, startError, onStart: start,
  };

  return (
    <div className={withSheet ? 'xl:grid xl:min-h-dvh xl:grid-cols-[minmax(0,1fr)_440px]' : ''}>
      <div className="flex min-w-0 flex-col gap-8 px-4 py-8 md:px-11 md:py-10">
        <header className="flex flex-col gap-5">
          <div className="max-w-[460px]">
            <Segmented label="Practice type" layoutId="practice-tab" value={tab} onChange={setTab} options={TABS} size="sm" />
          </div>
          <div>
            <h1 className="text-[clamp(32px,4vw,42px)] font-semibold leading-[1.05] tracking-[-0.035em]">{HEADINGS[tab][0]}</h1>
            <p className="mt-2 text-base text-ink-soft">{HEADINGS[tab][1]}</p>
          </div>
        </header>

        {tab === 'interview' && <InterviewPanel modes={modes} />}
        {tab === 'debate' && <DebatePanel modes={modes} />}
        {tab === 'people' && (
          <PeoplePanel extraTraits={data?.extraTraits ?? []} moods={data?.moods ?? ['Neutral']} selectedId={person?.id}
            onStart={pickPerson} onPeopleChange={onPeopleChange} />
        )}

        {tab === 'scenes' && loadError && <p role="alert" className="text-mistake-ink">{loadError}</p>}
        {tab === 'scenes' && !data && !loadError && <ListSkeleton />}

        {tab === 'scenes' && groups.map((g) => (
          <section key={g.name} className="flex flex-col">
            <div className="mb-1 flex items-baseline gap-3 border-b border-line pb-2.5">
              <h2 className="text-[22px] font-semibold tracking-[-0.02em]">{g.name}</h2>
              <span className="text-sm text-ink-soft">{g.items.length} scenes</span>
            </div>
            {g.items.map((s) => (
              <SceneRow key={s.id} scene={s} selected={s.id === selId} onPick={() => pick(s.id)} />
            ))}
          </section>
        ))}
      </div>

      {withSheet && (isDesktop ? (
        <aside className="sticky top-0 flex h-dvh flex-col overflow-y-auto border-l border-line bg-surface p-10">
          {shown ? <DetailPanel {...panelProps} /> : (
            <p className="text-[15px] text-ink-soft">Pick someone and press Start to see them here.</p>
          )}
        </aside>
      ) : (
        <AnimatePresence>
          {sheetOpen && shown && <DetailSheet onClose={() => !starting && setSheetOpen(false)} panelProps={panelProps} />}
        </AnimatePresence>
      ))}
    </div>
  );
}

function SceneRow({ scene, selected, onPick }) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      className={`relative -mx-3.5 mt-0.5 grid w-[calc(100%+28px)] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-field px-3.5 py-[13px] text-left transition-colors md:grid-cols-[minmax(0,1fr)_220px_60px_24px] ${
        selected ? '' : 'hover:bg-surface/70'
      }`}
    >
      {selected && (
        <motion.span layoutId="scene-pill" transition={spring} className="absolute inset-0 rounded-field border border-brand bg-surface" />
      )}
      <span className="relative">
        <span className={`block text-[17px] ${selected ? 'font-semibold' : 'font-medium'}`}>{scene.title}</span>
        <span className="block text-sm text-ink-soft md:hidden">{scene.who}, {scene.role}</span>
      </span>
      <span className="relative hidden text-sm text-ink-soft md:block">{scene.who}, {scene.role}</span>
      <span className="relative text-sm text-ink-soft">{scene.minutes} min</span>
      <span className="relative hidden md:block">{selected && <CheckIcon size={18} className="text-brand" />}</span>
    </button>
  );
}

function DetailPanel({ scene, difficulty, setDifficulty, traits, toggleTrait, mood, setMood, extraTraits, moods, starting, startError, onStart }) {
  const [customOpen, setCustomOpen] = useState(false);
  const available = extraTraits.filter((t) => !scene.traits.includes(t));
  const level = DIFFICULTIES.find((d) => d.value === difficulty);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={scene.id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16 }}
        className="flex flex-1 flex-col gap-[26px]"
      >
        <div>
          <div className="text-sm text-ink-soft">{scene.isPerson ? 'One of your people' : `${scene.category} · ${scene.minutes} min`}</div>
          <h2 className="mt-2 text-[clamp(30px,3vw,38px)] font-semibold leading-[1.02] tracking-[-0.035em]">{scene.title}</h2>
          <p className="mt-3.5 text-base leading-relaxed text-pretty">{scene.brief}</p>
        </div>

        <div className="flex items-center gap-3.5 border-y border-line py-[18px]">
          <span className="flex size-[52px] shrink-0 items-center justify-center rounded-full border border-line bg-canvas font-display text-lg font-semibold text-brand">
            {initials(scene.who)}
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="font-display text-xl font-semibold tracking-[-0.02em]">{scene.who}</span>
            <span className="text-sm text-ink-soft">{scene.roleLong}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <span className="text-sm font-semibold">Personality</span>
          <div className="flex flex-wrap gap-1.5">
            {scene.traits.map((t) => <Chip key={t}>{t}</Chip>)}
            {!scene.isPerson && traits.map((t) => <Chip key={t} dark>{t}</Chip>)}
            {scene.isPerson
              ? scene.personMood !== 'Neutral' && <Chip dark>Feeling {scene.personMood.toLowerCase()}</Chip>
              : mood !== 'Neutral' && <Chip dark>Feeling {mood.toLowerCase()}</Chip>}
          </div>
        </div>

        {scene.practise.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">You'll practise</span>
            {scene.practise.map((p) => <span key={p} className="text-[15px] text-ink-soft">{p}</span>)}
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          <span className="text-sm font-semibold">Difficulty</span>
          <Segmented label="Difficulty" layoutId="difficulty-pill" value={difficulty} onChange={setDifficulty}
            options={DIFFICULTIES.map(({ value, label }) => ({ value, label }))} />
          <span className="text-sm leading-snug text-ink-soft">
            {level.note} Every mistake is marked at every level.
          </span>
        </div>

        {!scene.isPerson && <div className="flex flex-col gap-3">
          <button type="button" onClick={() => setCustomOpen((o) => !o)} aria-expanded={customOpen}
            className="flex items-center justify-between text-sm font-semibold">
            Make it your own
            <CaretDownIcon size={16} className={`text-ink-soft transition-transform duration-200 ${customOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence initial={false}>
            {customOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-4 pb-1">
                  <div className="flex flex-col gap-2">
                    <span className="text-[13px] text-ink-soft">Extra traits, up to 3</span>
                    <div className="flex flex-wrap gap-1.5">
                      {available.map((t) => {
                        const on = traits.includes(t);
                        const full = !on && traits.length >= 3;
                        return (
                          <button key={t} type="button" onClick={() => toggleTrait(t)} disabled={full} aria-pressed={on}
                            className={`h-[34px] rounded-tag border px-3 text-sm font-medium transition active:scale-[0.96] disabled:opacity-40 ${
                              on ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink'
                            }`}>
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-[13px] text-ink-soft">Mood today</span>
                    <Segmented label="Mood today" size="sm" layoutId="mood-pill" value={mood} onChange={setMood}
                      options={moods.map((m) => ({ value: m, label: m }))} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>}

        <div className="mt-auto flex flex-col gap-2.5 pt-2">
          {startError && <p role="alert" className="text-sm font-medium text-mistake-ink">{startError}</p>}
          <button
            type="button"
            onClick={onStart}
            disabled={starting}
            className="flex h-14 items-center justify-center gap-2.5 rounded-field bg-brand text-[17px] font-semibold text-white transition duration-150 hover:-translate-y-px hover:bg-brand-hover active:scale-[0.97] disabled:cursor-wait disabled:opacity-80 disabled:hover:translate-y-0"
          >
            {starting ? (
              <>
                <span className="size-2 animate-pulse rounded-full bg-white" />
                {scene.who} is getting ready…
              </>
            ) : (
              <>
                <MicrophoneIcon size={20} />
                Start with {scene.who}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function DetailSheet({ onClose, panelProps }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <motion.div className="fixed inset-0 z-40 bg-ink/30" onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div
        role="dialog"
        aria-label={panelProps.scene.title}
        className="fixed inset-x-0 bottom-0 top-10 z-50 flex flex-col overflow-y-auto rounded-t-panel border-t border-line bg-surface px-5 pt-4 pb-[max(24px,env(safe-area-inset-bottom))]"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 420, damping: 40 }}
      >
        <button onClick={onClose} aria-label="Close" className="mb-2 self-end rounded-tag p-1.5 text-ink-soft">
          <XIcon size={20} />
        </button>
        <DetailPanel {...panelProps} />
      </motion.div>
    </>
  );
}

function Chip({ children, dark = false }) {
  return (
    <span className={`inline-flex h-[30px] items-center rounded-tag border px-2.5 text-sm ${
      dark ? 'border-ink bg-ink text-white' : 'border-line'
    }`}>
      {children}
    </span>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-hidden="true">
      {[0, 1, 2].map((g) => (
        <div key={g} className="flex flex-col gap-3">
          <div className="h-6 w-48 animate-pulse rounded-tag bg-line" />
          {[0, 1, 2].map((r) => <div key={r} className="h-11 animate-pulse rounded-field bg-surface/70" />)}
        </div>
      ))}
    </div>
  );
}