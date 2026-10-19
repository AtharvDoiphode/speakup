import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { CheckIcon, MicrophoneIcon, PencilSimpleIcon, PlusIcon, TrashIcon, UserCircleIcon } from '@phosphor-icons/react';
import api, { getErrorMessage } from '../../lib/api';
import { DIFFICULTIES } from '../../lib/modes';
import Segmented from '../Segmented';

const ROLE_CHIPS = ['Junior software developer', 'Bank clerk', 'Sales executive', 'MBA admission'];
const FOCUS_SHORT = { hr: 'HR', situational: 'Situational', campus: 'Campus' };

// ---------------------------------------------------------------- small shared pieces

// A labelled text box with a live counter and an inline message once there's something to say
function Field({ id, label, value, onChange, max, error, multiline = false, placeholder, inputRef, hint }) {
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold">{label}</label>
        <span className={`text-[13px] tabular-nums ${value.length > max * 0.9 ? 'text-mistake-ink' : 'text-ink-faint'}`} aria-live="off">{value.length}/{max}</span>
      </div>
      <Tag id={id} ref={inputRef} value={value} onChange={(e) => onChange(e.target.value)} maxLength={max} placeholder={placeholder}
        aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        rows={multiline ? 4 : undefined}
        className={`w-full rounded-field border bg-surface px-3.5 text-base outline-none placeholder:text-ink-faint focus:border-brand ${multiline ? 'resize-y py-3 leading-relaxed' : 'h-12'} ${error ? 'border-mistake' : 'border-line'}`} />
      {error ? <p id={`${id}-error`} role="alert" className="text-sm text-mistake-ink">{error}</p>
        : hint ? <p id={`${id}-hint`} className="text-[13px] text-ink-soft">{hint}</p> : null}
    </div>
  );
}

function DifficultyField({ value, onChange, layoutId }) {
  const level = DIFFICULTIES.find((d) => d.value === value);
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-sm font-semibold">Difficulty</span>
      <Segmented label="Difficulty" layoutId={layoutId} value={value} onChange={onChange} options={DIFFICULTIES.map(({ value: v, label }) => ({ value: v, label }))} />
      <span className="text-sm leading-snug text-ink-soft">{level.note} Every mistake is marked at every level.</span>
    </div>
  );
}

function StartButton({ busy, busyText, children, onClick }) {
  return (
    <button type="button" onClick={onClick} disabled={busy}
      className="flex h-14 items-center justify-center gap-2.5 rounded-field bg-brand px-6 text-[17px] font-semibold text-white transition duration-150 hover:-translate-y-px hover:bg-brand-hover active:scale-[0.97] disabled:cursor-wait disabled:opacity-80 disabled:hover:translate-y-0">
      {busy ? <><span className="size-2 animate-pulse rounded-full bg-white" /> {busyText}</> : <><MicrophoneIcon size={20} /> {children}</>}
    </button>
  );
}

// ---------------------------------------------------------------- Interview

export function InterviewPanel({ modes }) {
  const navigate = useNavigate();
  const [role, setRole] = useState('');
  const [focus, setFocus] = useState('hr');
  const [difficulty, setDifficulty] = useState('neutral');
  const [tried, setTried] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const focuses = modes?.interview.focuses ?? [];
  const n = role.trim().length;
  const roleError = n < 2 ? 'Type the job you are interviewing for (at least 2 characters).' : n > 60 ? 'Keep the job title under 60 characters.' : '';

  async function start() {
    setTried(true);
    setError('');
    if (roleError) return;
    setStarting(true);
    try {
      const { data } = await api.post('/conversations', { mode: 'interview', role: role.trim(), focus, difficulty });
      navigate(`/practice/${data.conversation._id}`);
    } catch (err) {
      setError(getErrorMessage(err)); // the role you typed stays
      setStarting(false);
    }
  }

  return (
    <section className="flex max-w-[680px] flex-col gap-7" aria-label="Interview setup">
      <div className="flex flex-col gap-3">
        <Field id="interview-role" label="The job" value={role} onChange={setRole} max={60} placeholder="e.g. Junior software developer"
          error={tried ? roleError : ''} hint="Type any job, or pick one below." />
        <div className="flex flex-wrap gap-2" aria-label="Suggestions">
          {ROLE_CHIPS.map((r) => (
            <button key={r} type="button" onClick={() => setRole(r)} aria-pressed={role === r}
              className={`min-h-11 rounded-tag border px-3.5 text-sm font-medium transition active:scale-[0.97] ${role === r ? 'border-ink bg-ink text-white' : 'border-line bg-surface hover:border-ink-faint'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="text-sm font-semibold">Focus</span>
        <Segmented label="Interview focus" layoutId="focus-pill" value={focus} onChange={setFocus}
          options={(focuses.length ? focuses : Object.keys(FOCUS_SHORT).map((value) => ({ value }))).map((f) => ({ value: f.value, label: FOCUS_SHORT[f.value] }))} />
        <span className="text-sm text-ink-soft">{focuses.find((f) => f.value === focus)?.blurb}</span>
      </div>

      <DifficultyField value={difficulty} onChange={setDifficulty} layoutId="interview-difficulty" />

      <div className="flex flex-col gap-2.5">
        <p className="text-[15px] font-medium">{modes?.interview.turns ?? 10} questions, then a scorecard.</p>
        {error && <p role="alert" className="text-sm font-medium text-mistake-ink">{error}</p>}
        <StartButton onClick={start} busy={starting} busyText="The interviewer is getting ready…">Start interview</StartButton>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Debate

export function DebatePanel({ modes }) {
  const navigate = useNavigate();
  const [topicId, setTopicId] = useState(null); // a topic id, or 'custom'
  const [custom, setCustom] = useState('');
  const [stance, setStance] = useState('for');
  const [difficulty, setDifficulty] = useState('neutral');
  const [tried, setTried] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const customRef = useRef(null);
  const topics = modes?.debate.topics ?? [];
  const chosen = topicId === 'custom' ? custom.trim() : topics.find((t) => t.id === topicId)?.text ?? '';
  const topicError = !topicId ? 'Pick a topic, or write your own motion.'
    : topicId === 'custom' && custom.trim().length < 5 ? 'Write a motion of at least 5 characters.' : '';

  useEffect(() => {
    if (topicId === 'custom') customRef.current?.focus();
  }, [topicId]);

  async function start() {
    setTried(true);
    setError('');
    if (topicError) return;
    setStarting(true);
    try {
      const { data } = await api.post('/conversations', { mode: 'debate', topic: chosen, stance, difficulty });
      navigate(`/practice/${data.conversation._id}`);
    } catch (err) {
      setError(getErrorMessage(err)); // your motion stays
      setStarting(false);
    }
  }

  return (
    <section className="flex max-w-[900px] flex-col gap-7" aria-label="Debate setup">
      <div className="flex flex-col gap-2.5">
        <span className="text-sm font-semibold" id="topic-label">The motion</span>
        <div role="group" aria-labelledby="topic-label" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((t) => (
            <button key={t.id} type="button" onClick={() => setTopicId(t.id)} aria-pressed={topicId === t.id}
              className={`flex min-h-16 items-start gap-2.5 rounded-field border px-3.5 py-3 text-left text-[15px] leading-snug transition ${topicId === t.id ? 'border-brand bg-brand/5 font-medium' : 'border-line bg-surface hover:border-ink-faint'}`}>
              <span className={`mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border ${topicId === t.id ? 'border-brand bg-brand text-white' : 'border-line'}`}>
                {topicId === t.id && <CheckIcon size={11} weight="bold" />}
              </span>
              {t.text}
            </button>
          ))}
          <button type="button" onClick={() => setTopicId('custom')} aria-pressed={topicId === 'custom'}
            className={`flex min-h-16 items-center gap-2.5 rounded-field border border-dashed px-3.5 py-3 text-left text-[15px] font-semibold transition ${topicId === 'custom' ? 'border-brand bg-brand/5 text-brand' : 'border-ink-faint text-ink hover:border-brand'}`}>
            <PencilSimpleIcon size={18} /> Your own motion
          </button>
        </div>
        {topicId === 'custom' && (
          <Field id="debate-motion" label="Your motion" value={custom} onChange={setCustom} max={120} inputRef={customRef}
            placeholder="e.g. Tea is better than coffee." error={tried ? topicError : ''} />
        )}
        {tried && topicError && topicId !== 'custom' && <p role="alert" className="text-sm text-mistake-ink">{topicError}</p>}
      </div>

      <div className="flex flex-col gap-2.5 sm:max-w-[360px]">
        <span className="text-sm font-semibold">Your side</span>
        <Segmented label="Your side" layoutId="stance-pill" value={stance} onChange={setStance}
          options={[{ value: 'for', label: 'For' }, { value: 'against', label: 'Against' }]} />
        <span className="text-sm text-ink-soft">You argue {stance} the motion. Arjun argues {stance === 'for' ? 'against' : 'for'} it.</span>
      </div>

      <div className="sm:max-w-[460px]"><DifficultyField value={difficulty} onChange={setDifficulty} layoutId="debate-difficulty" /></div>

      <div className="flex flex-col gap-2.5 sm:max-w-[460px]">
        <p className="text-[15px] font-medium">{modes?.debate.turns ?? 5} rounds, then a scorecard.</p>
        {error && <p role="alert" className="text-sm font-medium text-mistake-ink">{error}</p>}
        <StartButton onClick={start} busy={starting} busyText="Arjun is getting ready…">Start debate</StartButton>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- My people

const blank = { name: '', role: '', brief: '', traits: [], mood: 'Neutral' };

function personErrors(p) {
  const e = {};
  const name = p.name.trim(), role = p.role.trim(), brief = p.brief.trim();
  if (!name) e.name = 'Give them a name.';
  else if (name.length > 30) e.name = 'Keep the name under 30 characters.';
  if (role.length < 2) e.role = 'Say who they are, in a few words.';
  else if (role.length > 60) e.role = 'Keep it under 60 characters.';
  if (brief.length < 10) e.brief = 'Describe the situation in at least a sentence (10 characters).';
  else if (brief.length > 400) e.brief = 'Keep the situation under 400 characters.';
  return e;
}

/**
 * Your saved people. Start opens the same start sheet as scenes (the page shows it).
 *  - onStart(person): the page selects the person and opens the sheet
 */
export function PeoplePanel({ extraTraits, moods, selectedId, onStart, onPeopleChange }) {
  const [people, setPeople] = useState(null);
  const [max, setMax] = useState(12);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | a person id
  const [confirmId, setConfirmId] = useState(null);

  useEffect(() => {
    api.get('/people')
      .then(({ data }) => { setPeople(data.people); setMax(data.max); })
      .catch((err) => setError(getErrorMessage(err)));
  }, []);
  useEffect(() => { onPeopleChange?.(people ?? []); }, [people, onPeopleChange]);

  // The two-tap delete resets itself after 3 seconds, as elsewhere
  useEffect(() => {
    if (!confirmId) return;
    const t = setTimeout(() => setConfirmId(null), 3000);
    return () => clearTimeout(t);
  }, [confirmId]);

  async function remove(p) {
    if (confirmId !== p.id) return setConfirmId(p.id);
    setError('');
    try {
      await api.delete(`/people/${p.id}`);
      setPeople((list) => list.filter((x) => x.id !== p.id));
    } catch (err) {
      setError(getErrorMessage(err));
    }
    setConfirmId(null);
  }

  function saved(person, isNew) {
    setPeople((list) => (isNew ? [person, ...list] : list.map((x) => (x.id === person.id ? person : x))));
    setEditing(null);
  }

  return (
    <section className="flex flex-col gap-5" aria-label="My people">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] text-ink-soft">{people ? `${people.length} of ${max} saved. Only you can see them.` : ' '}</p>
        {editing !== 'new' && (
          <button type="button" onClick={() => setEditing('new')}
            className="flex min-h-11 items-center gap-1.5 rounded-field bg-ink px-4 font-semibold text-white transition active:scale-[0.97]">
            <PlusIcon size={18} /> New person
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {editing === 'new' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <PersonForm extraTraits={extraTraits} moods={moods} onCancel={() => setEditing(null)} onSaved={(p) => saved(p, true)} />
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p role="alert" className="text-sm font-medium text-mistake-ink">{error}</p>}
      {!people && !error && <div className="h-40 animate-pulse rounded-panel bg-surface/70" />}
      {people && people.length === 0 && editing !== 'new' && (
        <div className="flex flex-col items-start gap-2 rounded-panel border border-dashed border-ink-faint p-6">
          <UserCircleIcon size={32} className="text-ink-soft" />
          <p className="font-semibold">No people yet</p>
          <p className="text-[15px] text-ink-soft">Create someone you really need to talk to: your manager, a landlord, a relative, a shopkeeper.</p>
        </div>
      )}

      {people && people.length > 0 && (
        <ul className="grid gap-3 lg:grid-cols-2">
          {people.map((p) => (
            <li key={p.id} data-person={p.name}>
              {editing === p.id ? (
                <PersonForm initial={p} extraTraits={extraTraits} moods={moods} onCancel={() => setEditing(null)} onSaved={(x) => saved(x, false)} />
              ) : (
                <div className={`flex h-full flex-col gap-3 rounded-panel border bg-surface p-5 ${selectedId === p.id ? 'border-brand' : 'border-line'}`}>
                  <div>
                    <div className="font-display text-[22px] font-semibold tracking-[-0.02em]">{p.name}</div>
                    <div className="text-[15px] text-ink-soft">{p.role}</div>
                  </div>
                  <p className="line-clamp-2 text-sm text-ink-soft">{p.brief}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.traits.map((t) => <span key={t} className="rounded-tag border border-line px-2 py-0.5 text-[13px]">{t}</span>)}
                    <span className="rounded-tag bg-canvas px-2 py-0.5 text-[13px] text-ink-soft">Mood: {p.mood}</span>
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2 pt-1">
                    <button type="button" onClick={() => onStart(p)}
                      className="flex min-h-11 items-center gap-1.5 rounded-field bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover">
                      <MicrophoneIcon size={16} /> Start
                    </button>
                    <button type="button" onClick={() => setEditing(p.id)}
                      className="flex min-h-11 items-center gap-1.5 rounded-field border border-line px-3.5 text-sm font-semibold hover:border-ink-faint">
                      <PencilSimpleIcon size={16} /> Edit
                    </button>
                    <button type="button" onClick={() => remove(p)}
                      className="flex min-h-11 items-center gap-1.5 rounded-field border border-mistake px-3.5 text-sm font-semibold text-mistake-ink">
                      <TrashIcon size={16} /> {confirmId === p.id ? 'Tap again' : 'Delete'}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PersonForm({ initial, extraTraits, moods, onCancel, onSaved }) {
  const [p, setP] = useState(() => (initial ? { name: initial.name, role: initial.role, brief: initial.brief, traits: initial.traits, mood: initial.mood } : blank));
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const errors = tried ? personErrors(p) : {};
  const set = (k) => (v) => setP((x) => ({ ...x, [k]: v }));
  const toggle = (t) => setP((x) => ({ ...x, traits: x.traits.includes(t) ? x.traits.filter((y) => y !== t) : x.traits.length < 3 ? [...x.traits, t] : x.traits }));
  const prefix = initial ? `person-${initial.id}` : 'person-new';

  async function save(e) {
    e.preventDefault();
    setTried(true);
    setError('');
    if (Object.keys(personErrors(p)).length) return;
    setSaving(true);
    try {
      const body = { name: p.name.trim(), role: p.role.trim(), brief: p.brief.trim(), traits: p.traits, mood: p.mood };
      const { data } = initial ? await api.patch(`/people/${initial.id}`, body) : await api.post('/people', body);
      onSaved(data.person);
    } catch (err) {
      setError(getErrorMessage(err)); // e.g. "You can save up to 12 people"; what you typed stays
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-4 rounded-panel border border-brand bg-surface p-5 md:p-6" aria-label={initial ? `Edit ${initial.name}` : 'New person'}>
      <h3 className="font-display text-[20px] font-semibold tracking-[-0.02em]">{initial ? `Edit ${initial.name}` : 'New person'}</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <Field id={`${prefix}-name`} label="Name" value={p.name} onChange={set('name')} max={30} placeholder="e.g. Neha" error={errors.name} />
        <Field id={`${prefix}-role`} label="Who they are" value={p.role} onChange={set('role')} max={60} placeholder="e.g. My manager at the bank" error={errors.role} />
      </div>
      <Field id={`${prefix}-brief`} label="The situation" value={p.brief} onChange={set('brief')} max={400} multiline
        placeholder="e.g. You are asking Neha for two days of leave during the busy month-end." error={errors.brief}
        hint='Write it to yourself: "You are…"' />
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">Traits <span className="font-normal text-ink-soft">(up to 3)</span></span>
        <div className="flex flex-wrap gap-1.5">
          {extraTraits.map((t) => {
            const on = p.traits.includes(t);
            const full = !on && p.traits.length >= 3;
            return (
              <button key={t} type="button" onClick={() => toggle(t)} disabled={full} aria-pressed={on}
                className={`min-h-11 rounded-tag border px-3.5 text-sm font-medium transition active:scale-[0.96] disabled:opacity-40 ${on ? 'border-ink bg-ink text-white' : 'border-line bg-surface'}`}>
                {t}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col gap-2 md:max-w-[460px]">
        <span className="text-sm font-semibold">Mood</span>
        <Segmented label="Mood" size="sm" layoutId={`${prefix}-mood`} value={p.mood} onChange={set('mood')} options={moods.map((m) => ({ value: m, label: m }))} />
      </div>
      {error && <p role="alert" className="text-sm font-medium text-mistake-ink">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className="flex min-h-12 items-center rounded-field bg-brand px-5 font-semibold text-white hover:bg-brand-hover disabled:opacity-70">
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Save person'}
        </button>
        <button type="button" onClick={onCancel} className="flex min-h-12 items-center rounded-field border border-line px-5 font-semibold hover:border-ink-faint">Cancel</button>
      </div>
    </form>
  );
}
