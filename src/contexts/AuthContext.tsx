import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authenticateUser, registerUser, updateUserProfile, type AuthenticatedUser } from '@/services/auth';
import { readStorage, removeStorage, writeStorage } from '@/services/storage';
import { setToken } from '@/services/apiClient';

const AUTH_STORAGE_KEY = 'powerball:user';
const LEGACY_AUTH_STORAGE_KEY = 'datafin:user';

function lerUsuarioSalvo(): AuthenticatedUser | null {
  const atual = readStorage<AuthenticatedUser | null>(AUTH_STORAGE_KEY, null);
  if (atual) return atual;
  const legado = readStorage<AuthenticatedUser | null>(LEGACY_AUTH_STORAGE_KEY, null);
  if (legado) {
    writeStorage(AUTH_STORAGE_KEY, legado);
    removeStorage(LEGACY_AUTH_STORAGE_KEY);
    return legado;
  }
  return null;
}

interface AuthContextType {
  user: AuthenticatedUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; user?: AuthenticatedUser }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; message?: string; user?: AuthenticatedUser }>;
  updateProfile: (profile: Pick<AuthenticatedUser, 'name' | 'email'>) => Promise<{ success: boolean; message?: string; user?: AuthenticatedUser }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!cancelled) {
        setUser(lerUsuarioSalvo());
        setLoading(false);
      }
    };

    void bootstrap();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === AUTH_STORAGE_KEY) {
        setUser(readStorage<AuthenticatedUser | null>(AUTH_STORAGE_KEY, null));
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      cancelled = true;
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const result = await authenticateUser(email, password);
    if (result.success && result.user) {
      setUser(result.user);
      writeStorage(AUTH_STORAGE_KEY, result.user);
    }
    return result;
  };

  const register = async (name: string, email: string, password: string) => {
    const result = await registerUser(name, email, password);
    if (result.success) {
      const loginResult = await authenticateUser(email, password);
      if (loginResult.success && loginResult.user) {
        setUser(loginResult.user);
        writeStorage(AUTH_STORAGE_KEY, loginResult.user);
      }
    }
    return result;
  };

  const updateProfileHandler = useCallback(async (profile: Pick<AuthenticatedUser, 'name' | 'email'>) => {
    if (!user) {
      return { success: false, message: 'Usuário não autenticado' };
    }

    const result = await updateUserProfile(user.email, profile);
    if (result.success && result.user) {
      setUser(result.user);
      writeStorage(AUTH_STORAGE_KEY, result.user);
    }

    return result;
  }, [user]);

  const logout = () => {
    setUser(null);
    removeStorage(AUTH_STORAGE_KEY);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, updateProfile: updateProfileHandler, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
