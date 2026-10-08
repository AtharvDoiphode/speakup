import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  // Sends the login cookie with every request. Without this,
  // the backend would never see that you're logged in.
  withCredentials: true,
});

// Pulls a readable message out of a failed request
export const getErrorMessage = (error) =>
  error.response?.data?.message || 'Cannot reach the server. Is it running?';

export default api;