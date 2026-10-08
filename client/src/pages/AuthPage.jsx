import { useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../context/useAuth';
import { getErrorMessage } from '../lib/api';
import VoiceOrb from '../components/VoiceOrb';
import CorrectionDemo from '../components/CorrectionDemo';

const inputClass =
  'w-full rounded-xl border border-line bg-surface px-4 py-3.5 text-base outline-none transition-colors placeholder:text-ink-soft/60 focus:border-brand focus:ring-2 focus:ring-inset focus:ring-brand/30';

// One labeled input. The id doubles as the form field name.
function Field({ label, id, hint, ...props }) {
  return (
    <div className="pb-5">
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <input id={id} name={id} className={inputClass} {...props} />
      {hint && <p className="mt-1.5 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

// Slides a field open or closed when switching between login and signup
function Reveal({ children }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden"
    >
      {children}
    </motion.div>
  );
}

export default function AuthPage() {
  const { user, loading, login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', signupCode: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // The orb reads this number every frame. Typing sets it briefly.
  const levelRef = useRef(0);
  const pulseTimer = useRef(null);
  const pulse = () => {
    levelRef.current = 0.7;
    clearTimeout(pulseTimer.current);
    pulseTimer.current = setTimeout(() => {
      levelRef.current = 0;
    }, 90);
  };

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const isLogin = mode === 'login';

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    pulse(); // the orb answers every keystroke
  };

  const switchMode = () => {
    setMode(isLogin ? 'register' : 'login');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isLogin) {
        await login(form.email, form.password);
      } else {
        await register(form); // register expects one object: { name, email, password, signupCode }
      }
      // On success the user state changes and this page redirects by itself
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.15fr_1fr]">
      {/* Left: headline, the orb, and the correction example */}
      <section className="relative flex min-h-[620px] flex-col justify-between overflow-hidden p-6 lg:min-h-screen lg:p-14">
        <div>
          <p className="font-display text-2xl font-bold text-brand">SpeakUp</p>
          <h1 className="mt-10 max-w-xl text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
            Speak first. We tidy the grammar after.
          </h1>
        </div>

        {/* The orb blooms in first */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 60, damping: 14, delay: 0.1 }}
          className="pointer-events-none absolute -bottom-20 -left-16 h-[360px] w-[360px] lg:-bottom-28 lg:-left-28 lg:h-[680px] lg:w-[680px]"
        >
          <VoiceOrb levelRef={levelRef} state={submitting ? 'thinking' : 'idle'} />
        </motion.div>

        <div className="flex justify-end">
          <CorrectionDemo />
        </div>
      </section>

      {/* Right: the form fades in last */}
      <section className="flex items-center justify-center p-6 lg:p-14">
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="w-full max-w-sm"
        >
          <h2 className="text-3xl font-bold">
            {isLogin ? 'Welcome back' : 'Join the family'}
          </h2>
          <p className="mb-7 mt-2 text-sm text-ink-soft">
            {isLogin
              ? 'Pick up where you left off.'
              : 'Ask for the family code if you do not have it yet.'}
          </p>

          <AnimatePresence initial={false}>
            {!isLogin && (
              <Reveal key="name">
                <Field
                  label="Your name"
                  id="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={form.name}
                  onChange={handleChange}
                />
              </Reveal>
            )}
          </AnimatePresence>

          <Field
            label="Email"
            id="email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={handleChange}
          />

          <Field
            label="Password"
            id="password"
            type="password"
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            required
            minLength={isLogin ? undefined : 8}
            hint={isLogin ? undefined : 'At least 8 characters.'}
            value={form.password}
            onChange={handleChange}
          />

          <AnimatePresence initial={false}>
            {!isLogin && (
              <Reveal key="code">
                <Field
                  label="Family signup code"
                  id="signupCode"
                  type="text"
                  autoComplete="off"
                  required
                  value={form.signupCode}
                  onChange={handleChange}
                />
              </Reveal>
            )}
          </AnimatePresence>

          {/* A new error shakes in once */}
          <AnimatePresence>
            {error && (
              <motion.p
                key={error}
                role="alert"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, x: [0, -8, 8, -5, 5, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="mb-5 rounded-xl bg-mistake/10 px-4 py-3 text-sm font-medium text-mistake-deep"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            disabled={submitting}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="w-full rounded-xl bg-brand px-4 py-3.5 font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
          >
            {submitting
              ? isLogin
                ? 'Logging in...'
                : 'Creating account...'
              : isLogin
                ? 'Log in'
                : 'Create account'}
          </motion.button>

          <p className="mt-6 text-center text-sm text-ink-soft">
            {isLogin ? 'New here?' : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={switchMode}
              className="font-semibold text-brand hover:underline"
            >
              {isLogin ? 'Create an account' : 'Log in'}
            </button>
          </p>
        </motion.form>
      </section>
    </div>
  );
}