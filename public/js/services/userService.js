import { api } from './apiClient.js';

function qs(params = {}) {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const userService = {
  // MFA gateway identity (OAuth2 Proxy headers) + EBS session summary.
  getCurrentUser: () => api.get('/api/user'),
  getProfile: () => api.get('/api/profile'),
  // Admin only: registered EBS users from PostgreSQL.
  listUsers: (params) => api.get(`/api/admin/users${qs(params)}`),
};

// Demo (illustrative) business data. Responses carry demo:true.
export const demoService = {
  summary: () => api.get('/api/demo/summary'),
  list: (dataset, params) => api.get(`/api/demo/${encodeURIComponent(dataset)}${qs(params)}`),
  track: (serviceNo) => api.get(`/api/demo/track/${encodeURIComponent(serviceNo)}`),
};
