import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  // Sends the login cookie with every request. Without this,
  // the backend would never see that you're logged in.
  withCredentials: true,
  // The server gives the AI up to 45 seconds before answering "busy".
  // Waiting 60 means we always hear the server's own answer first.
  timeout: 60_000,
});

// Pulls a readable message out of a failed request
export const getErrorMessage = (error) => {
  if (error.response?.data?.message) return error.response.data.message;
  // No response at all: either we gave up waiting, or the server isn't there
  if (error.code === 'ECONNABORTED') return 'That took too long. Please try again.';
  return 'Cannot reach the server. Is it running?';
};

// Checking an essay can take the server up to 60 seconds (a long review plus a full
// rewrite), so this one request waits 70: we always hear the server's own answer first.
export const checkWriting = (body) => api.post('/writing/check', body, { timeout: 70_000 });

export default api;
