import { useEffect, useState } from 'react';
import api, { AUTH_EXPIRED, markLogin } from '../lib/api';
import { setSpeechPrefs } from '../lib/speak';
import { AuthContext } from './useAuth';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // true until we know whether the login cookie is still valid
  const [loading, setLoading] = useState(true);

  // On page load, ask the server "who am I?" using the login cookie
  useEffect(() => {
    api
      .get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(null)) // 401 just means "not logged in"
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    markLogin();
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async ({ name, email, password, signupCode }) => {
    const res = await api.post('/auth/register', { name, email, password, signupCode });
    markLogin();
    setUser(res.data.user);
    return res.data.user;
  };

  // A login that runs out mid-session: drop the user, and ProtectedRoute sends them to /login,
  // remembering this page so they come straight back after logging in
  useEffect(() => {
    const expired = () => setUser(null);
    window.addEventListener(AUTH_EXPIRED, expired);
    return () => window.removeEventListener(AUTH_EXPIRED, expired);
  }, []);

  // Every read-aloud uses the person's own voice and speed from Settings
  useEffect(() => {
    setSpeechPrefs(user?.settings);
  }, [user]);

  const logout = async () => {
    await api.post('/auth/logout');
    try { localStorage.removeItem('speakup.writingDraft'); } catch { /* storage blocked */ } // the next person on this device mustn't see it
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
