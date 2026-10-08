import { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

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
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async ({ name, email, password, signupCode }) => {
    const res = await api.post('/auth/register', { name, email, password, signupCode });
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Use this in any component: const { user, login, logout } = useAuth();
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
