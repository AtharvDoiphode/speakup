import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { getErrorMessage } from '../lib/api';

const inputClass =
  'w-full rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15';

export default function AuthPage() {
  const { user, loading, login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    signupCode: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Wait for the login check, and skip this page if already logged in
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const isLogin = mode === 'login';

  // One handler for all inputs: uses each input's "name" to update the right field
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const switchMode = () => {
    setMode(isLogin ? 'register' : 'login');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // stop the browser from reloading the page
    setError('');
    setSubmitting(true);
    try {
      if (isLogin) {
        await login(form.email, form.password);
      } else {
        await register(form); // form has exactly { name, email, password, signupCode }
      }
      // On success the user state updates and this page redirects automatically
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-cloud">
      {/* Left: brand panel, hidden on small screens */}
      <div className="hidden w-1/2 flex-col justify-between bg-brand p-16 text-white lg:flex">
        <div className="font-display text-2xl font-extrabold">SpeakUp</div>
        <div>
          <h1 className="text-4xl font-extrabold leading-tight">
            Speak English with confidence, every day.
          </h1>
          <p className="mt-5 max-w-md text-lg text-white/85">
            Practice real conversations, get instant grammar corrections, and
            track your progress in one place.
          </p>
        </div>
        <p className="text-sm text-white/90">
          Made for the family. Practice together.
        </p>
      </div>

      {/* Right: the form */}
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
          {/* On phones the brand panel is hidden, so show the name here instead */}
          <div className="font-display text-2xl font-extrabold text-brand lg:hidden">
            SpeakUp
          </div>

          <div>
            <h2 className="text-3xl font-extrabold text-ink">
              {isLogin ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              {isLogin
                ? 'Log in to continue your practice.'
                : 'You need the family signup code to join.'}
            </p>
          </div>

          {!isLogin && (
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-semibold text-ink">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={form.name}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-ink">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-ink">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              required
              minLength={isLogin ? undefined : 8}
              value={form.password}
              onChange={handleChange}
              className={inputClass}
            />
            {!isLogin && (
              <p className="mt-1.5 text-xs text-ink-soft">At least 8 characters.</p>
            )}
          </div>

          {!isLogin && (
            <div>
              <label htmlFor="signupCode" className="mb-1.5 block text-sm font-semibold text-ink">
                Family signup code
              </label>
              <input
                id="signupCode"
                name="signupCode"
                type="text"
                autoComplete="off"
                required
                value={form.signupCode}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-mistake/30 bg-mistake/10 px-4 py-3 text-sm font-medium text-mistake-deep"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
          >
            {submitting ? 'Please wait...' : isLogin ? 'Log in' : 'Create account'}
          </button>

          <p className="text-center text-sm text-ink-soft">
            {isLogin ? 'New here?' : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={switchMode}
              className="font-semibold text-brand hover:underline"
            >
              {isLogin ? 'Create an account' : 'Log in'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
