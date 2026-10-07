// EBS application authentication (Layer 2). Credentials go to the backend only;
// nothing about the user or password is stored in localStorage.
import { api } from './apiClient.js';

export const authService = {
  signup: (data) => api.post('/api/auth/signup', data),
  login: (username, password) => api.post('/api/auth/login', { username, password }),
  logout: () => api.post('/api/auth/logout'),
  session: () => api.get('/api/auth/session'),
};

// Remove data left behind by the old localStorage-only demo login (it held plain-text passwords).
try {
  localStorage.removeItem('ebs_users');
  localStorage.removeItem('ebs_logged_in_user');
} catch (e) { /* storage unavailable */ }
