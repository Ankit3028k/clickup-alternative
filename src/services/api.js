import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://clickup-alternative.onrender.com/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login on 401
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  verifyEmail: (data) => api.post('/auth/verify-email', data),
  resendOTP: (data) => api.post('/auth/resend-otp', data),
  verify: () => api.get('/auth/verify'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  googleAuth: (tokenData) => api.post('/auth/google', tokenData),
};

// User API
export const userAPI = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (userData) => api.put('/users/me', userData),
  changePassword: (passwordData) => api.put('/users/me/password', passwordData),
  getUserById: (userId) => api.get(`/users/${userId}`),
  searchUsers: (query, workspaceId) => api.get(`/users/search/${query}`, { workspaceId }),
};

// Workspace API
export const workspaceAPI = {
  getWorkspaces: () => api.get('/workspaces'),
  getWorkspace: (workspaceId) => api.get(`/workspaces/${workspaceId}`),
  createWorkspace: (workspaceData) => api.post('/workspaces', workspaceData),
  updateWorkspace: (workspaceId, workspaceData) => api.put(`/workspaces/${workspaceId}`, workspaceData),
  deleteWorkspace: (workspaceId) => api.delete(`/workspaces/${workspaceId}`),
  addMember: (workspaceId, memberData) => api.post(`/workspaces/${workspaceId}/members`, memberData),
  removeMember: (workspaceId, userId) => api.delete(`/workspaces/${workspaceId}/members/${userId}`),
};

// Task API
export const taskAPI = {
  getTasks: (filters) => api.get('/tasks', { params: filters }),
  getTask: (taskId) => api.get(`/tasks/${taskId}`),
  createTask: (taskData) => api.post('/tasks', taskData),
  updateTask: (taskId, taskData) => api.put(`/tasks/${taskId}`, taskData),
  deleteTask: (taskId) => api.delete(`/tasks/${taskId}`),
  addComment: (taskId, commentData) => api.post(`/tasks/${taskId}/comments`, commentData),
  getComments: (taskId) => api.get(`/tasks/${taskId}/comments`),
};

// Time Tracking API
export const timeAPI = {
  startTimer: (timerData) => api.post('/time/start', timerData),
  stopTimer: () => api.post('/time/stop'),
  getCurrentTimer: () => api.get('/time/current'),
  addManualTime: (timeData) => api.post('/time/manual', timeData),
  getTimeLogs: (filters) => api.get('/time', { params: filters }),
  updateTimeLog: (timeLogId, timeData) => api.put(`/time/${timeLogId}`, timeData),
  deleteTimeLog: (timeLogId) => api.delete(`/time/${timeLogId}`),
  getTimeReports: (filters) => api.get('/time/reports/summary', { params: filters }),
};

// Project API (placeholder)
export const projectAPI = {
  getProjects: () => api.get('/projects'),
  getProject: (projectId) => api.get(`/projects/${projectId}`),
  createProject: (projectData) => api.post('/projects', projectData),
  updateProject: (projectId, projectData) => api.put(`/projects/${projectId}`, projectData),
  deleteProject: (projectId) => api.delete(`/projects/${projectId}`),
};

// Automation API (placeholder)
export const automationAPI = {
  getAutomations: () => api.get('/automations'),
  getAutomation: (automationId) => api.get(`/automations/${automationId}`),
  createAutomation: (automationData) => api.post('/automations', automationData),
  updateAutomation: (automationId, automationData) => api.put(`/automations/${automationId}`, automationData),
  deleteAutomation: (automationId) => api.delete(`/automations/${automationId}`),
};

// Integration API (placeholder)
export const integrationAPI = {
  getIntegrations: () => api.get('/integrations'),
  connectSlack: (config) => api.post('/integrations/slack', config),
  connectGoogleDrive: (config) => api.post('/integrations/google-drive', config),
  connectGitHub: (config) => api.post('/integrations/github', config),
  getGoogleOAuth: () => api.get('/integrations/oauth/google'),
};

// Invitation API
export const invitationAPI = {
  sendInvitation: (data) => api.post('/invitations/send', data),
  getInvitationDetails: (token) => api.get(`/invitations/${token}`),
  acceptInvitation: (token, data) => api.post(`/invitations/accept/${token}`, data),
  declineInvitation: (token) => api.post(`/invitations/decline/${token}`),
  getWorkspaceInvitations: (workspaceId) => api.get(`/invitations/workspace/${workspaceId}`),
};

export default api;
