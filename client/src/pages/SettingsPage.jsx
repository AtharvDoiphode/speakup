import { useEffect, useRef, useState } from 'react';
import { CheckIcon, SpeakerHighIcon, WarningIcon } from '@phosphor-icons/react';
import api, { getErrorMessage } from '../lib/api';
import { useAuth } from '../context/useAuth';
import { DIFFICULTIES } from '../lib/modes';
import { englishVoices, setSpeechPrefs, speak, ttsSupported } from '../lib/speak';
import Segmented from '../components/Segmented';

const GOALS = [10, 15, 20, 30];
const PREVIEW = 'Hello! This is how I will sound when we practise together.';

// "Saved" for a moment after a save, or the error (and the control keeps what you chose)
function SaveState({ state }) {
  if (!state) return <span className="min-h-5" aria-live="polite" />;
  if (state === 'saving') return <span className="text-[13px] text-ink-faint" aria-live="polite">Saving…</span>;
  if (state === 'saved') return <span className="flex items-center gap-1 text-[13px] font-medium text-correct-ink" aria-live="polite"><CheckIcon size={14} weight="bold" /> Saved</span>;
  return <span role="alert" className="text-[13px] font-medium text-mistake-ink">{state}</span>;
}

function Section({ title, note, state, children }) {
  return (
    <section className="flex flex-col gap-4 rounded-panel border border-line bg-surface p-5 md:p-6" aria-label={title}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h2 className="text-[17px] font-semibold">{title}</h2>
          {note && <p className="text-sm text-ink-soft">{note}</p>}
        </div>
        {state !== undefined && <SaveState state={state} />}
      </div>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const forced = user.mustChangePassword;

  return (
    <div className="flex max-w-[760px] flex-col gap-5 px-4 py-8 md:px-11 md:py-10">
      <header>
        <h1 className="text-[clamp(30px,3.4vw,38px)] font-semibold leading-[1.05] tracking-[-0.035em]">Settings</h1>
        <p className="mt-2 text-[15px] text-ink-soft">Changes save as you make them.</p>
      </header>

      {forced && (
        <div role="alert" className="flex gap-3 rounded-panel border border-mistake bg-mistake/8 p-4" data-forced>
          <WarningIcon size={22} weight="fill" className="mt-0.5 shrink-0 text-mistake-ink" />
          <div>
            <p className="font-semibold text-mistake-ink">Choose a new password to continue</p>
            <p className="text-[15px] text-ink">An admin reset your password. Use the temporary one as your current password, then pick your own. The rest of SpeakUp opens after that.</p>
          </div>
        </div>
      )}

      {forced ? (
        <PasswordSection user={user} setUser={setUser} />
      ) : (
        <>
          <ProfileSection user={user} setUser={setUser} />
          <PreferenceSections user={user} setUser={setUser} />
          <PasswordSection user={user} setUser={setUser} />
        </>
      )}
    </div>
  );
}

// Saves one setting at a time; the control keeps its value if saving fails
function useSettingSaver(setUser) {
  const [states, setStates] = useState({});
  const timers = useRef({});
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);
  async function save(key, value) {
    setStates((s) => ({ ...s, [key]: 'saving' }));
    try {
      const { data } = await api.patch('/me/settings', { [key]: value });
      setUser(data.user);
      setStates((s) => ({ ...s, [key]: 'saved' }));
      clearTimeout(timers.current[key]);
      timers.current[key] = setTimeout(() => setStates((s) => ({ ...s, [key]: null })), 2000);
    } catch (err) {
      setStates((s) => ({ ...s, [key]: getErrorMessage(err) }));
    }
  }
  return [states, save];
}

function ProfileSection({ user, setUser }) {
  const [name, setName] = useState(user.name);
  const [state, setState] = useState(null);
  const saved = useRef(user.name);

  async function save() {
    const next = name.trim();
    if (next === saved.current) return;
    if (!next) return setState('Name is required');
    setState('saving');
    try {
      const { data } = await api.patch('/me/profile', { name: next });
      saved.current = data.user.name;
      setUser(data.user);
      setName(data.user.name);
      setState('saved');
      setTimeout(() => setState((s) => (s === 'saved' ? null : s)), 2000);
    } catch (err) {
      setState(getErrorMessage(err)); // what you typed stays
    }
  }

  return (
    <Section title="Profile" note={user.email} state={state}>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <label htmlFor="settings-name" className="text-sm font-semibold">Your name</label>
          <span className="text-[13px] tabular-nums text-ink-faint">{name.length}/40</span>
        </div>
        <input id="settings-name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} onBlur={save}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className="h-12 rounded-field border border-line bg-surface px-3.5 text-base outline-none focus:border-brand" />
        <p className="text-[13px] text-ink-soft">Saved when you leave the box or press Enter.</p>
      </div>
    </Section>
  );
}

function PreferenceSections({ user, setUser }) {
  const s = user.settings ?? {};
  const [states, save] = useSettingSaver(setUser);
  const [goal, setGoal] = useState(s.goalMin ?? 15);
  const [difficulty, setDifficulty] = useState(s.defaultDifficulty ?? 'neutral');
  const [voiceName, setVoiceName] = useState(s.voiceName ?? '');
  const [rate, setRate] = useState(s.speechRate ?? 1);
  const [voices, setVoices] = useState(() => englishVoices());
  const rateTimer = useRef(0);

  // Voices load a moment after the page does in most browsers
  useEffect(() => {
    if (!ttsSupported) return;
    const load = () => setVoices(englishVoices());
    window.speechSynthesis.addEventListener?.('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', load);
  }, []);
  useEffect(() => () => clearTimeout(rateTimer.current), []);

  const missing = voiceName && voices.length > 0 && !voices.some((v) => v.name === voiceName);

  function preview() {
    setSpeechPrefs({ voiceName, speechRate: rate }); // hear exactly what's on screen
    speak(PREVIEW, { rate: 1 });
  }

  return (
    <>
      <Section title="Daily goal" note="Minutes of practice a day. The Dashboard and Progress show it." state={states.goalMin}>
        <div className="max-w-[420px]">
          <Segmented label="Daily goal" layoutId="goal-pill" value={goal} onChange={(v) => { setGoal(v); save('goalMin', v); }}
            options={GOALS.map((g) => ({ value: g, label: `${g} min` }))} />
        </div>
      </Section>

      <Section title="Voice" note="How SpeakUp reads things aloud." state={states.voiceName ?? states.speechRate}>
        {!ttsSupported ? (
          <p className="text-[15px] text-ink-soft">This browser can't read aloud. Try Chrome or Edge.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="settings-voice" className="text-sm font-semibold">Voice</label>
              <select id="settings-voice" value={voiceName} onChange={(e) => { setVoiceName(e.target.value); save('voiceName', e.target.value); }}
                className="h-12 rounded-field border border-line bg-surface px-3 text-base outline-none focus:border-brand">
                <option value="">Automatic (Indian English when available)</option>
                {missing && <option value={voiceName}>{voiceName} (not on this device)</option>}
                {voices.map((v) => <option key={v.name} value={v.name}>{v.name} · {v.lang}</option>)}
              </select>
              {missing && <p className="text-[13px] text-ink-soft">That voice isn't on this device, so the automatic choice is used here.</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <label htmlFor="settings-rate" className="text-sm font-semibold">Speed</label>
                <span className="text-sm font-semibold tabular-nums" data-rate>{rate.toFixed(2)}×</span>
              </div>
              <input id="settings-rate" type="range" min={0.7} max={1.3} step={0.05} value={rate}
                aria-valuetext={`${rate.toFixed(2)} times normal speed`}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setRate(v);
                  clearTimeout(rateTimer.current);
                  rateTimer.current = setTimeout(() => save('speechRate', v), 400); // save once you stop sliding
                }}
                className="h-11 w-full accent-brand" />
              <div className="flex justify-between text-[13px] text-ink-faint"><span>Slower</span><span>Faster</span></div>
            </div>
            <button type="button" onClick={preview}
              className="flex min-h-11 w-fit items-center gap-2 rounded-field border border-line px-4 font-semibold hover:border-ink-faint">
              <SpeakerHighIcon size={18} /> Preview
            </button>
          </div>
        )}
      </Section>

      <Section title="Practice" note="The difficulty Practice, Interview and Debate start on." state={states.defaultDifficulty}>
        <div className="flex max-w-[460px] flex-col gap-2">
          <Segmented label="Default difficulty" layoutId="default-difficulty" value={difficulty}
            onChange={(v) => { setDifficulty(v); save('defaultDifficulty', v); }}
            options={DIFFICULTIES.map(({ value, label }) => ({ value, label }))} />
          <span className="text-sm text-ink-soft">{DIFFICULTIES.find((d) => d.value === difficulty)?.note}</span>
        </div>
      </Section>
    </>
  );
}

function PasswordSection({ user, setUser }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState(null); // { ok, text }
  const [busy, setBusy] = useState(false);

  async function change(e) {
    e.preventDefault();
    setMsg(null);
    if (next.length < 8) return setMsg({ text: 'The new password needs at least 8 characters' });
    if (next !== confirm) return setMsg({ text: "The two new passwords don't match" });
    setBusy(true);
    try {
      const { data } = await api.post('/auth/change-password', { currentPassword: current, newPassword: next });
      setCurrent(''); setNext(''); setConfirm('');
      setMsg({ ok: true, text: 'Password changed.' });
      setUser(data.user); // clears the forced-change gate
    } catch (err) {
      setMsg({ text: getErrorMessage(err) }); // what you typed stays
    }
    setBusy(false);
  }

  const field = (id, label, value, set, auto) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">{label}</label>
      <input id={id} type="password" value={value} onChange={(e) => set(e.target.value)} autoComplete={auto} maxLength={72}
        className="h-12 rounded-field border border-line bg-surface px-3.5 text-base outline-none focus:border-brand" />
    </div>
  );

  return (
    <Section title="Password" note={user.mustChangePassword ? undefined : '8 to 72 characters, not your email.'}>
      <form onSubmit={change} className="flex flex-col gap-3.5" noValidate>
        {/* For password managers */}
        <input type="text" name="username" autoComplete="username" value={user.email} readOnly hidden />
        {field('pw-current', user.mustChangePassword ? 'Temporary password' : 'Current password', current, setCurrent, 'current-password')}
        <div className="grid gap-3.5 md:grid-cols-2">
          {field('pw-new', 'New password', next, setNext, 'new-password')}
          {field('pw-confirm', 'New password again', confirm, setConfirm, 'new-password')}
        </div>
        {msg && <p role={msg.ok ? 'status' : 'alert'} className={`text-sm font-medium ${msg.ok ? 'text-correct-ink' : 'text-mistake-ink'}`}>{msg.text}</p>}
        <button type="submit" disabled={busy || !current || !next || !confirm}
          className="flex min-h-12 w-fit items-center rounded-field bg-brand px-5 font-semibold text-white hover:bg-brand-hover disabled:opacity-50">
          {busy ? 'Changing…' : 'Change password'}
        </button>
      </form>
    </Section>
  );
}
