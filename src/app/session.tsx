/**
 * Session context — the ONE place screens get the current user and the
 * adapters. Swap createMockAuth/createMockStorage for real implementations
 * later; nothing in src/features/ needs to change.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { createMockAuth, createMockStorage, type MockStorageAdapter } from '../adapters/mock/mockAdapters';
import type { AuthAdapter } from '../adapters/types';
import type { SessionUser } from '../domain/types';

interface SessionContextValue {
  user: SessionUser;
  auth: AuthAdapter;
  storage: MockStorageAdapter;
  demoUsers: SessionUser[];
  switchUser: (userId: string) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const auth = useMemo(() => createMockAuth('u-selin'), []);
  const storage = useMemo(() => createMockStorage(), []);
  const [user, setUser] = useState<SessionUser>(auth.currentUser());

  const switchUser = (userId: string) => {
    auth.switchUser?.(userId);
    setUser(auth.currentUser());
  };

  const value: SessionContextValue = {
    user,
    auth,
    storage,
    demoUsers: auth.listDemoUsers?.() ?? [],
    switchUser,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
