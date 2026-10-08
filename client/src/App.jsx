import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { getErrorMessage } from './lib/api';

export default function App() {
  const { user, loading, login, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (loading) return <p className="p-8">Checking login...</p>;

  return (
    <div className="min-h-screen bg-stone-100 p-8">
      <h1 className="text-2xl font-bold text-indigo-600">Auth test page</h1>

      {user ? (
        <div className="mt-4">
          <p>
            Logged in as <b>{user.name}</b> ({user.email}), role:{' '}
            <b>{user.role}</b>
          </p>
          <button
            onClick={logout}
            className="mt-3 rounded bg-indigo-600 px-4 py-2 text-white"
          >
            Log out
          </button>
        </div>
      ) : (
        <div className="mt-4 flex max-w-xs flex-col gap-2">
          <p>Not logged in</p>
          <input
            className="rounded border p-2"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="rounded border p-2"
            placeholder="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            onClick={handleLogin}
            className="rounded bg-indigo-600 px-4 py-2 text-white"
          >
            Log in
          </button>
          {error && <p className="text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}