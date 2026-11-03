import { http, call } from './client';

export const authApi = {
  register: (body) => call(http.post('/auth/register', body)),
  login: (body) => call(http.post('/auth/login', body)),
  logout: () => call(http.post('/auth/logout')),
};

export const usersApi = {
  me: () => call(http.get('/users/me')),
  update: (body) => call(http.patch('/users/me', body)),
  uploadResume: (file, onUploadProgress) => {
    const form = new FormData();
    form.append('resume', file);
    return call(http.post('/users/me/resume', form, { onUploadProgress }));
  },
  saved: () => call(http.get('/users/me/saved')),
  save: (jobId) => call(http.post(`/users/me/saved/${jobId}`)),
  unsave: (jobId) => call(http.delete(`/users/me/saved/${jobId}`)),
};

export const jobsApi = {
  search: (params) => call(http.get('/jobs', { params })),
  get: (id) => call(http.get(`/jobs/${id}`)),
  recommended: () => call(http.get('/jobs/recommended')),
  create: (body) => call(http.post('/jobs', body)),
  update: (id, body) => call(http.patch(`/jobs/${id}`, body)),
  setStatus: (id, status) => call(http.patch(`/jobs/${id}/status`, { status })),
  remove: (id) => call(http.delete(`/jobs/${id}`)),
  apply: (id, coverNote) => call(http.post(`/jobs/${id}/apply`, { coverNote })),
  applicants: (id, status) => call(http.get(`/jobs/${id}/applications`, { params: { status } })),
};

export const applicationsApi = {
  mine: () => call(http.get('/applications/me')),
  withdraw: (id) => call(http.patch(`/applications/${id}/withdraw`)),
  move: (id, status) => call(http.patch(`/applications/${id}/status`, { status })),
  notes: (id, notes) => call(http.patch(`/applications/${id}/notes`, { notes })),
};

export const recruiterApi = {
  jobs: () => call(http.get('/recruiter/jobs')),
  stats: () => call(http.get('/recruiter/stats')),
  createCompany: (body) => call(http.post('/companies', body)),
  updateCompany: (id, body) => call(http.patch(`/companies/${id}`, body)),
  uploadLogo: (id, file) => {
    const form = new FormData();
    form.append('logo', file);
    return call(http.post(`/companies/${id}/logo`, form));
  },
};

export const adminApi = {
  users: (params) => call(http.get('/admin/users', { params })),
  jobs: (params) => call(http.get('/admin/jobs', { params })),
  stats: () => call(http.get('/admin/stats')),
  block: (id, blocked) => call(http.patch(`/admin/users/${id}/block`, { blocked })),
  removeJob: (id) => call(http.delete(`/jobs/${id}`)),
};
