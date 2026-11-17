import axios from 'axios';
import { errorInfo } from './errors';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  // Sends the login cookie with every request. Without this,
  // the backend would never see that you're logged in.
  withCredentials: true,
  // The server gives the AI up to 45 seconds before answering "busy".
  // Waiting 60 means we always hear the server's own answer first.
  timeout: 60_000,
});

// A friendly sentence for any failed request (see lib/errors.js)
export const getErrorMessage = (error) => errorInfo(error).message;

// ---- App-wide signals (listened to by AuthProvider and WakeBanner) ----
export const AUTH_EXPIRED = 'speakup:auth-expired';
export const SERVER_WAKING = 'speakup:waking';

// The free server sleeps when nobody uses it. Until it has answered once, a request
// still waiting after 4 seconds shows "Waking the server up…".
const WAKE_AFTER_MS = 4000;
let warm = false;
let loginAt = 0; // requests sent before the latest login can't end the new session
export const markLogin = () => { loginAt = Date.now(); };
let waking = 0; // requests currently past the 4s mark
const signal = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

api.interceptors.request.use((config) => {
  config.sentAt = Date.now();
  if (!warm) {
    config.wakeTimer = setTimeout(() => {
      config.isWaking = true;
      if (waking++ === 0) signal(SERVER_WAKING, true);
    }, WAKE_AFTER_MS);
  }
  return config;
});

function settle(config, answered) {
  if (!config) return;
  clearTimeout(config.wakeTimer);
  if (config.isWaking && --waking === 0) signal(SERVER_WAKING, false);
  if (answered) warm = true;
}

api.interceptors.response.use(
  (res) => {
    settle(res.config, true);
    return res;
  },
  (error) => {
    settle(error.config, Boolean(error.response));
    // A login that ran out mid-session: the app goes back to the login page and returns here after
    const url = error.config?.url ?? '';
    if (error.response?.status === 401 && !/\/auth\/(me|login|register)$/.test(url) && (error.config?.sentAt ?? 0) >= loginAt) signal(AUTH_EXPIRED);
    return Promise.reject(error);
  }
);

// Checking an essay can take the server up to 60 seconds (a long review plus a full
// rewrite), so this one request waits 70: we always hear the server's own answer first.
export const checkWriting = (body) => api.post('/writing/check', body, { timeout: 70_000 });

export default api;
