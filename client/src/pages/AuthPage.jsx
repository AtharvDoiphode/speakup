import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, m as motion } from 'motion/react';
import { CORRECTION, SPRING, anim, enter, fadeUp, markerSweep, strike } from '../lib/motion';
import { EyeIcon, EyeSlashIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useAuth } from '../context/useAuth';
import { getErrorMessage } from '../lib/api';
import { validate } from '../lib/validate';
import { safeReturnPath } from '../lib/safeReturn';
import Logo from '../components/Logo';
import VoiceOrb from '../components/VoiceOrb';

const spring = SPRING.snappy; // tab and pill indicators slide with the shared snappy spring
const EMPTY = { name: '', email: '', password: '', signupCode: '' };

export default function AuthPage() {
  const { user, loading, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Back to the page that asked for a login (only ever a path inside this app)
  const from = safeReturnPath(location.state?.from);

  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(''); // what the server said
  const [errors, setErrors] = useState({}); // per field, checked when you leave it
  const [busy, setBusy] = useState(false);

  // Wait for the "who am I?" check, so a logged-in user doesn't see the form flash
  if (loading) return null;
  if (user) return <Navigate to={from} replace />;

  const fields = mode === 'login' ? ['email', 'password'] : ['name', 'email', 'password', 'signupCode'];
  const check = (key, f = form) => ({
    name: () => validate.name(f.name),
    email: () => validate.email(f.email),
    password: () => (mode === 'login' ? (f.password ? null : 'Enter your password') : validate.password(f.password, { email: f.email })),
    signupCode: () => validate.signupCode(f.signupCode),
  })[key]();

  const update = (key) => (e) => {
    const next = { ...form, [key]: e.target.value };
    setForm(next);
    if (error) setError('');
    if (errors[key]) setErrors((x) => ({ ...x, [key]: check(key, next) })); // clears as soon as it's fixed
  };
  const leave = (key) => () => form[key] && setErrors((x) => ({ ...x, [key]: check(key) }));

  const switchMode = (next) => {
    if (next === mode) return;
    setMode(next);
    setError('');
    setErrors({});
    setForm((f) => ({ ...EMPTY, email: f.email })); // keep the email, clear the rest
  };

  async function onSubmit(e) {
    e.preventDefault();
    if (busy) return;
    const found = Object.fromEntries(fields.map((k) => [k, check(k)]).filter(([, v]) => v));
    setErrors(found);
    const first = fields.find((k) => found[k]);
    if (first) { e.currentTarget.elements[first]?.focus(); return; } // the first field to fix
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
    <main className="min-h-dvh bg-surface-card lg:grid lg:grid-cols-[minmax(0,1fr)_560px] lg:bg-surface-canvas">
      {/* Left: story (desktop only) */}
      <section className="relative hidden overflow-hidden px-20 py-14 lg:block">
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-[330px] -left-[210px] size-[760px]">
          <VoiceOrb state="listening" />
        </div>

        <div className="relative">
          <Logo />
          <p className="mt-[clamp(48px,12vh,120px)] max-w-[760px] font-display text-[clamp(56px,6.4vw,92px)] font-semibold leading-[0.94] tracking-[-0.04em]">
            Speak first.
            <br />
            We tidy the grammar after.
          </p>
          <p className="mt-7 max-w-[470px] text-xl leading-normal text-pretty text-text-secondary">
            Roleplay real conversations out loud. SpeakUp listens, answers in character, and marks what to fix
            once you've finished your sentence.
          </p>
        </div>

        <CorrectionCard className="absolute bottom-24 left-[clamp(320px,35vw,500px)] w-[340px] [@media(max-height:760px)]:hidden" />
      </section>

      {/* Right: form */}
      <section className="flex flex-col px-5 py-8 sm:px-10 lg:border-l lg:border-border-subtle lg:bg-surface-card lg:px-[72px] lg:py-14">
        <div className="flex items-center">
          <span className="lg:hidden"><Logo /></span>
          <span className="ml-auto text-sm text-text-secondary">Private · family members only</span>
        </div>

        <div className="mx-auto mt-12 w-full max-w-[416px] lg:mx-0 lg:mt-24 lg:max-w-none">
          <div role="tablist" className="grid grid-cols-2 gap-1 rounded-field border border-border-subtle bg-surface-sunken p-1">
            {[['login', 'Log in'], ['signup', 'Create account']].map(([m, label]) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => switchMode(m)}
                className={`relative h-10 max-md:h-11 rounded-[9px] text-[15px] transition-colors ${
                  mode === m ? 'font-semibold text-text-primary' : 'font-medium text-text-secondary hover:text-text-primary'
                }`}
              >
                {mode === m && (
                  <motion.span
                    layoutId="auth-tab"
                    transition={spring}
                    className="absolute inset-0 rounded-[9px] border border-border-subtle bg-surface-card"
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
              {...anim(fadeUp)}
            >
              {mode === 'login' ? (
                <>
                  <h1 className="mb-1.5 mt-10 text-[34px] font-semibold tracking-[-0.03em]">Pick up where you stopped</h1>
                  <p className="mb-7 text-base text-text-secondary">Your conversations are saved right where you left them.</p>
                  <div className="flex flex-col gap-[18px]">
                    <Field label="Email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com"
                      value={form.email} onChange={update('email')} onBlur={leave('email')} error={errors.email} required />
                    <Field label="Password" name="password" type="password" autoComplete="current-password" placeholder="Your password"
                      value={form.password} onChange={update('password')} onBlur={leave('password')} error={errors.password} required />
                    {error && <ErrorLine>{error}</ErrorLine>}
                    <SubmitButton busy={busy} label="Log in" busyLabel="Logging in…" />
                  </div>
                  <p className="mt-7 text-[15px] leading-normal text-text-secondary">
                    New to SpeakUp? Ask your family admin for the signup code, then{' '}
                    <button type="button" onClick={() => switchMode('signup')} className="text-brand hover:text-brand-700 hover:underline">
                      create an account
                    </button>
                    .
                    <br />
                    Forgot your password? Ask your family admin.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="mb-1.5 mt-10 text-[34px] font-semibold tracking-[-0.03em]">Join your family's SpeakUp</h1>
                  <p className="mb-7 text-base text-text-secondary">Takes a minute. Your first conversation starts right after.</p>
                  <div className="flex flex-col gap-4">
                    <Field label="Name" name="name" autoComplete="given-name" placeholder="What should the AI call you?" maxLength={40}
                      value={form.name} onChange={update('name')} onBlur={leave('name')} error={errors.name} required />
                    <Field label="Email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com"
                      value={form.email} onChange={update('email')} onBlur={leave('email')} error={errors.email} required />
                    <Field label="Password" name="password" type="password" autoComplete="new-password" placeholder="At least 8 characters"
                      hint="8 to 72 characters, and not your email." value={form.password} onChange={update('password')} onBlur={leave('password')}
                      error={errors.password} maxLength={72} required />
                    <Field label="Family signup code" name="signupCode" placeholder="From your family admin" autoCapitalize="characters" autoComplete="off"
                      spellCheck={false} hint="Ask your family admin for this code." value={form.signupCode}
                      onChange={update('signupCode')} onBlur={leave('signupCode')} error={errors.signupCode} inputClassName="font-medium tracking-[0.06em]" required />
                    {error && <ErrorLine>{error}</ErrorLine>}
                    <SubmitButton busy={busy} label="Create account" busyLabel="Creating account…" />
                  </div>
                </>
              )}
            </motion.form>
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
}

function Field({ label, hint, error, inputClassName = '', type = 'text', ...input }) {
  const [shown, setShown] = useState(false);
  const id = `field-${input.name}`;
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined;
  const isPassword = type === 'password';
  return (
    <div className="flex flex-col gap-2 text-sm font-semibold">
      <label htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          {...input}
          id={id}
          type={isPassword && shown ? 'text' : type}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={`h-[50px] w-full rounded-field bg-surface-card px-3.5 text-base font-normal text-text-primary transition-colors ${
            error ? 'border-[1.5px] border-mistake focus-visible:outline-mistake' : 'border border-border-strong'
          } ${isPassword ? 'pr-20' : ''} ${inputClassName}`}
        />
        {isPassword && (
          <button type="button" onClick={() => setShown((v) => !v)} aria-pressed={shown} aria-label={shown ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-1 my-auto flex h-11 items-center gap-1.5 rounded-field px-2.5 text-sm font-semibold text-text-secondary hover:text-text-primary">
            {shown ? <EyeSlashIcon size={18} aria-hidden="true" /> : <EyeIcon size={18} aria-hidden="true" />}
            {shown ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {hint && <span id={`${id}-hint`} className="text-[13px] font-normal text-text-secondary">{hint}</span>}
      {error && <ErrorLine id={`${id}-error`}>{error}</ErrorLine>}
    </div>
  );
}

function ErrorLine({ id, children }) {
  return (
    <span id={id} role="alert" className="flex items-start gap-2 text-sm font-medium leading-snug text-mistake-text">
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
      aria-busy={busy}
      className="mt-2 h-[54px] rounded-field bg-brand text-[17px] font-semibold text-on-brand transition duration-(--motion-fast) hover:-translate-y-px hover:bg-brand-700 press disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0"
    >
      {busy ? busyLabel : label}
    </button>
  );
}

// The correction rewrite moment, with the same timing as the live screen (CORRECTION in lib/motion.js)
function CorrectionCard({ className = '' }) {
  return (
    <div className={`flex flex-col gap-2.5 rounded-panel border border-border-subtle bg-surface-card px-[22px] py-5 ${className}`}>
      <div className="flex justify-between text-[13px] text-text-secondary">
        <span>Café order with Leo</span>
        <span>0:18</span>
      </div>
      <p className="relative w-fit text-[19px] leading-snug text-mistake-text">
        She don't like coffee
        <motion.span
          aria-hidden="true"
          className="absolute inset-x-0 top-1/2 h-[2px] origin-left bg-mistake"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={strike(CORRECTION.strike)}
        />
      </p>
      <p className="relative w-fit text-[19px] leading-snug">
        <motion.span
          aria-hidden="true"
          className="absolute -inset-x-1.5 inset-y-0 origin-left rounded-[3px_6px_4px_7px] bg-marker"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={markerSweep(CORRECTION.mark)}
        />
        <motion.span
          className="relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={enter('fast', { delay: CORRECTION.mark })}
        >
          She doesn't like coffee
        </motion.span>
      </p>
      <motion.p
        className="border-t border-border-subtle pt-2 text-[13px] leading-snug text-text-secondary"
        {...anim(fadeUp, CORRECTION.notes)}
      >
        With he, she or it, use <b className="font-semibold text-text-primary">doesn't</b> in the present tense.
      </motion.p>
    </div>
  );
}