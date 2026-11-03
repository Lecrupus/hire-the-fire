import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { authApi, usersApi } from '../api';
import { refreshSession, setAccessToken, setOnSessionEnd } from '../api/client';

export const AuthContext = createContext(null);

/** Holds the logged-in user. On load it silently restores the session from the refresh cookie. */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setOnSessionEnd(() => setUser(null));
    refreshSession()
      .then(() => usersApi.me())
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  const start = useCallback(async (session) => {
    setAccessToken(session.accessToken);
    // /users/me populates the recruiter's company
    const me = await usersApi.me();
    setUser(me);
    return me;
  }, []);

  const login = useCallback(async (body) => start(await authApi.login(body)), [start]);
  const register = useCallback(async (body) => start(await authApi.register(body)), [start]);
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);
  const reload = useCallback(async () => setUser(await usersApi.me()), []);

  const value = useMemo(
    () => ({ user, ready, login, register, logout, reload, setUser }),
    [user, ready, login, register, logout, reload],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
