import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { useAuth } from '../context/useAuth';
import { getErrorMessage } from '../lib/api';
import Logo from '../components/Logo';
import VoiceOrb from '../components/VoiceOrb';

const spring = { type: 'spring', stiffness: 500, damping: 40 };
const EMPTY = { name: '', email: '', password: '', signupCode: '' };

export default function AuthPage() {
  const { user, loading, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Wait for the "who am I?" check, so a logged-in user doesn't see the form flash
  if (loading) return null;
  if (user) return <Navigate to={from} replace />;

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (error) setError('');
  };

  const switchMode = (next) => {
    if (next === mode) return;
    setMode(next);
    setError('');
    setForm((f) => ({ ...EMPTY, email: f.email })); // keep the email, clear the rest
  };

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register({
          name: form.name,
          email: form.email,
          password: form.password,
          signupCode: form.signupCode,
        });
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-surface lg:grid lg:grid-cols-[minmax(0,1fr)_560px] lg:bg-canvas">
      {/* Left: story (desktop only) */}
      <section className="relative hidden overflow-hidden px-20 py-14 lg:block">
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-[330px] -left-[210px] size-[760px]">
          <VoiceOrb state="listening" />
        </div>

        <div className="relative">
          <Logo />
          <h1 className="mt-[clamp(48px,12vh,120px)] max-w-[760px] font-display text-[clamp(56px,6.4vw,92px)] font-semibold leading-[0.94] tracking-[-0.04em]">
            Speak first.
            <br />
            We tidy the grammar after.
          </h1>
          <p className="mt-7 max-w-[470px] text-xl leading-normal text-pretty text-ink-soft">
            Roleplay real conversations out loud. SpeakUp listens, answers in character, and marks what to fix
            once you've finished your sentence.
          </p>
        </div>

        <CorrectionCard className="absolute bottom-24 left-[clamp(320px,35vw,500px)] w-[340px] [@media(max-height:760px)]:hidden" />
      </section>

      {/* Right: form */}
      <section className="flex flex-col px-5 py-8 sm:px-10 lg:border-l lg:border-line lg:bg-surface lg:px-[72px] lg:py-14">
        <div className="flex items-center">
          <span className="lg:hidden"><Logo /></span>
          <span className="ml-auto text-sm text-ink-soft">Private · family members only</span>
        </div>

        <div className="mx-auto mt-12 w-full max-w-[416px] lg:mx-0 lg:mt-24 lg:max-w-none">
          <div role="tablist" className="grid grid-cols-2 gap-1 rounded-field border border-line bg-canvas p-1">
            {[['login', 'Log in'], ['signup', 'Create account']].map(([m, label]) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => switchMode(m)}
                className={`relative h-10 rounded-[9px] text-[15px] transition-colors ${
                  mode === m ? 'font-semibold text-ink' : 'font-medium text-ink-soft hover:text-ink'
                }`}
              >
                {mode === m && (
                  <motion.span
                    layoutId="auth-tab"
                    transition={spring}
                    className="absolute inset-0 rounded-[9px] border border-line bg-surface"
                  />
                )}
                <span className="relative">{label}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.form
              key={mode}
              onSubmit={onSubmit}
              noValidate
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              {mode === 'login' ? (
                <>
                  <h2 className="mb-1.5 mt-10 text-[34px] font-semibold tracking-[-0.03em]">Pick up where you stopped</h2>
                  <p className="mb-7 text-base text-ink-soft">Your conversations are saved right where you left them.</p>
                  <div className="flex flex-col gap-[18px]">
                    <Field label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com"
                      value={form.email} onChange={update('email')} required />
                    <Field label="Password" name="password" type="password" autoComplete="current-password" placeholder="Your password"
                      value={form.password} onChange={update('password')} error={error} required />
                    <SubmitButton busy={busy} label="Log in" busyLabel="Logging in…" />
                  </div>
                  <p className="mt-7 text-[15px] leading-normal text-ink-soft">
                    New to SpeakUp? Ask your family admin for the signup code, then{' '}
                    <button type="button" onClick={() => switchMode('signup')} className="text-brand hover:text-brand-hover hover:underline">
                      create an account
                    </button>
                    .
                    <br />
                    Forgot your password? Ask your family admin.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="mb-1.5 mt-10 text-[34px] font-semibold tracking-[-0.03em]">Join your family's SpeakUp</h2>
                  <p className="mb-7 text-base text-ink-soft">Takes a minute. Your first conversation starts right after.</p>
                  <div className="flex flex-col gap-4">
                    <Field label="Name" name="name" autoComplete="given-name" placeholder="What should the AI call you?"
                      value={form.name} onChange={update('name')} required />
                    <Field label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com"
                      value={form.email} onChange={update('email')} required />
                    <Field label="Password" name="password" type="password" autoComplete="new-password" placeholder="At least 8 characters"
                      value={form.password} onChange={update('password')} minLength={8} required />
                    <Field label="Family signup code" name="signupCode" placeholder="From your family admin" autoCapitalize="characters"
                      spellCheck={false} hint="Ask your family admin for this code." value={form.signupCode}
                      onChange={update('signupCode')} inputClassName="font-medium tracking-[0.06em]" required />
                    {error && <ErrorLine>{error}</ErrorLine>}
                    <SubmitButton busy={busy} label="Create account" busyLabel="Creating account…" />
                  </div>
                </>
              )}
            </motion.form>
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}

function Field({ label, hint, error, inputClassName = '', ...input }) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold">
      {label}
      <input
        {...input}
        aria-invalid={!!error}
        className={`h-[50px] w-full rounded-field bg-surface px-3.5 text-base font-normal text-ink transition-colors ${
          error ? 'border-[1.5px] border-mistake focus-visible:outline-mistake' : 'border border-line'
        } ${inputClassName}`}
      />
      {hint && <span className="text-[13px] font-normal text-ink-soft">{hint}</span>}
      {error && <ErrorLine>{error}</ErrorLine>}
    </label>
  );
}

function ErrorLine({ children }) {
  return (
    <span role="alert" className="flex items-start gap-2 text-sm font-medium leading-snug text-mistake-ink">
      <WarningCircleIcon size={18} className="mt-px shrink-0" />
      {children}
    </span>
  );
}

function SubmitButton({ busy, label, busyLabel }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="mt-2 h-[54px] rounded-field bg-brand text-[17px] font-semibold text-white transition duration-150 hover:-translate-y-px hover:bg-brand-hover active:scale-[0.97] disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0"
    >
      {busy ? busyLabel : label}
    </button>
  );
}

// The correction rewrite moment: strike 260ms, marker 380ms, note 240ms
function CorrectionCard({ className = '' }) {
  return (
    <div className={`flex flex-col gap-2.5 rounded-panel border border-line bg-surface px-[22px] py-5 ${className}`}>
      <div className="flex justify-between text-[13px] text-ink-soft">
        <span>Café order with Leo</span>
        <span>0:18</span>
      </div>
      <p className="relative w-fit text-[19px] leading-snug text-mistake-ink">
        She don't like coffee
        <motion.span
          aria-hidden="true"
          className="absolute inset-x-0 top-1/2 h-[2px] origin-left bg-mistake"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.8, duration: 0.26, ease: 'easeOut' }}
        />
      </p>
      <p className="relative w-fit text-[19px] leading-snug">
        <motion.span
          aria-hidden="true"
          className="absolute -inset-x-1.5 inset-y-0 origin-left rounded-[3px_6px_4px_7px] bg-marker"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 1.1, duration: 0.38, ease: [0.2, 0.8, 0.2, 1] }}
        />
        <motion.span
          className="relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.2 }}
        >
          She doesn't like coffee
        </motion.span>
      </p>
      <motion.p
        className="border-t border-line pt-2 text-[13px] leading-snug text-ink-soft"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.55, duration: 0.24 }}
      >
        With he, she or it, use <b className="font-semibold text-ink">doesn't</b> in the present tense.
      </motion.p>
    </div>
  );
}