import { createContext, useContext } from 'react';

// The shared "box" that AuthProvider fills with { user, loading, login, register, logout }
export const AuthContext = createContext(null);

// Use this in any component: const { user, login, logout } = useAuth();
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
