import axios from 'axios';

const API_ORIGIN = import.meta.env.VITE_API_URL || '';

/** One Axios instance for the whole app. Sends the refresh cookie; attaches the access token. */
export const http = axios.create({ baseURL: `${API_ORIGIN}/api/v1`, withCredentials: true });

let accessToken = null;
let onSessionEnd = () => {};
let refreshing = null;

export const setAccessToken = (t) => {
  accessToken = t;
};
export const setOnSessionEnd = (fn) => {
  onSessionEnd = fn;
};

/** Gets a new access token from the refresh cookie. Concurrent 401s share one refresh request. */
export function refreshSession() {
  refreshing ??= http
    .post('/auth/refresh', null, { _skipRefresh: true })
    .then((res) => {
      setAccessToken(res.data.data.accessToken);
      return res.data.data;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

http.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// On a 401, refresh once and retry the original request; if the refresh fails, the session is over.
http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    if (response?.status === 401 && config && !config._retried && !config._skipRefresh) {
      config._retried = true;
      try {
        await refreshSession();
        return http(config);
      } catch {
        setAccessToken(null);
        onSessionEnd();
      }
    }
    return Promise.reject(error);
  },
);

/** Unwraps { success, data } and turns failures into Error objects with code, status and field details. */
export async function call(promise) {
  try {
    const res = await promise;
    return res.data.data;
  } catch (err) {
    const body = err.response?.data?.error;
    const e = new Error(
      body?.message ||
        (err.response ? 'Something went wrong' : 'Cannot reach the server. Check your connection.'),
    );
    e.code = body?.code || (err.response ? 'UNKNOWN' : 'NETWORK');
    e.status = err.response?.status;
    e.details = body?.details;
    throw e;
  }
}

/** Absolute URL for a stored file (local uploads are served by the API). */
export const fileUrl = (path) => (path?.startsWith('/uploads') ? `${API_ORIGIN}${path}` : path);
