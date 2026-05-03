import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authenticateUser, registerUser, ensureAdminUser } from '@/services/auth';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; user?: User }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; message?: string; user?: User }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureAdminUser();
    const stored = localStorage.getItem('datafin_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('datafin_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const result = await authenticateUser(email, password);
    if (result.success && result.user) {
      setUser(result.user);
      localStorage.setItem('datafin_user', JSON.stringify(result.user));
    }
    return result;
  };

  const register = async (name: string, email: string, password: string) => {
    const result = await registerUser(name, email, password);
    if (result.success) {
      const loginResult = await authenticateUser(email, password);
      if (loginResult.success && loginResult.user) {
        setUser(loginResult.user);
        localStorage.setItem('datafin_user', JSON.stringify(loginResult.user));
      }
    }
    return result;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('datafin_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
