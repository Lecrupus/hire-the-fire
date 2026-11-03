import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AuthContext } from '../context/AuthContext';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** Returns value after it has stopped changing for `delay` ms. */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/**
 * Runs an async loader and tracks { data, error, loading }. Re-runs when deps change; reload() re-runs on demand.
 * Responses from stale runs are ignored, so fast typing never shows an older result.
 */
export function useFetch(loader, deps = []) {
  const [state, setState] = useState({ data: undefined, error: null, loading: true });
  const run = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(loader, deps);

  const reload = useCallback(() => {
    const id = ++run.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    load()
      .then((data) => id === run.current && setState({ data, error: null, loading: false }))
      .catch(
        (error) => id === run.current && setState((s) => ({ data: s.data, error, loading: false })),
      );
  }, [load]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    ...state,
    reload,
    setData: (data) =>
      setState((s) => ({ ...s, data: typeof data === 'function' ? data(s.data) : data })),
  };
}
