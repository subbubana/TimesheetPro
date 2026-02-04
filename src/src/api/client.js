import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, null, {
            params: { refresh_token: refreshToken }
          });
          const { access_token, refresh_token } = response.data;

          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

export const authAPI = {
  register: (data) => apiClient.post('/auth/register', data),
  login: (data) => apiClient.post('/auth/login', data),
  getCurrentUser: () => apiClient.get('/auth/me'),
};

export const employeesAPI = {
  create: (data) => apiClient.post('/employees/', data),
  getAll: (params) => apiClient.get('/employees/', { params }),
  getAll: (params) => apiClient.get('/employees/', { params }),
  get: (id) => apiClient.get(`/employees/${id}`),
  getById: (id) => apiClient.get(`/employees/${id}`),
  update: (id, data) => apiClient.put(`/employees/${id}`, data),
  delete: (id) => apiClient.delete(`/employees/${id}`),
  // Client assignment endpoints
  addAssignment: (employeeId, data) => apiClient.post(`/employees/${employeeId}/assignments`, data),
  getAssignments: (employeeId) => apiClient.get(`/employees/${employeeId}/assignments`),
  removeAssignment: (employeeId, assignmentId) => apiClient.delete(`/employees/${employeeId}/assignments/${assignmentId}`),
};

export const clientsAPI = {
  create: (data) => apiClient.post('/clients/', data),
  getAll: (params) => apiClient.get('/clients/', { params }),
  getAll: (params) => apiClient.get('/clients/', { params }),
  get: (id) => apiClient.get(`/clients/${id}`),
  getById: (id) => apiClient.get(`/clients/${id}`),
  update: (id, data) => apiClient.put(`/clients/${id}`, data),
  delete: (id) => apiClient.delete(`/clients/${id}`),
  // Business calendar endpoints
  createCalendar: (clientId, data) => apiClient.post(`/clients/${clientId}/calendars`, data),
  getCalendars: (clientId) => apiClient.get(`/clients/${clientId}/calendars`),
  getCalendarByYear: (clientId, year) => apiClient.get(`/clients/${clientId}/calendars/${year}`),
  updateCalendar: (clientId, year, data) => apiClient.put(`/clients/${clientId}/calendars/${year}`, data),
};

export const timesheetsAPI = {
  create: (data) => apiClient.post('/timesheets/', data),
  getAll: (params) => apiClient.get('/timesheets/', { params }),
  getById: (id) => apiClient.get(`/timesheets/${id}`),
  update: (id, data) => apiClient.put(`/timesheets/${id}`, data),
  delete: (id) => apiClient.delete(`/timesheets/${id}`),
  submit: (id) => apiClient.post(`/timesheets/${id}/submit`),
  // Upload endpoints
  getUploads: (params) => apiClient.get('/timesheets/uploads/', { params }),
  upload: (formData) => apiClient.post('/timesheets/uploads/', formData),
};

export const approvalsAPI = {
  getAll: (params) => apiClient.get('/approvals/', { params }),
  getById: (id) => apiClient.get(`/approvals/${id}`),
  update: (id, data) => apiClient.put(`/approvals/${id}`, data),
  createForTimesheet: (timesheetId) => apiClient.post(`/approvals/timesheet/${timesheetId}`),
};

export const calendarsAPI = {
  create: (data) => apiClient.post('/calendars/', data),
  getAll: (params) => apiClient.get('/calendars/', { params }),
  getById: (id) => apiClient.get(`/calendars/${id}`),
  update: (id, data) => apiClient.put(`/calendars/${id}`, data),
  createHoliday: (calendarId, data) => apiClient.post(`/calendars/${calendarId}/holidays`, data),
  getHolidays: (calendarId) => apiClient.get(`/calendars/${calendarId}/holidays`),
};

export const configurationsAPI = {
  create: (data) => apiClient.post('/configurations/', data),
  getAll: (params) => apiClient.get('/configurations/', { params }),
  getById: (id) => apiClient.get(`/configurations/${id}`),
  getByKey: (key) => apiClient.get(`/configurations/key/${key}`),
  update: (id, data) => apiClient.put(`/configurations/${id}`, data),
  delete: (id) => apiClient.delete(`/configurations/${id}`),
};

export const notificationsAPI = {
  send: (data) => apiClient.post('/notifications/send', data),
  sendBulk: (data) => apiClient.post('/notifications/send-bulk', data),
  getAll: (params) => apiClient.get('/notifications/', { params }),
  getById: (id) => apiClient.get(`/notifications/${id}`),
  markSent: (id) => apiClient.put(`/notifications/${id}/mark-sent`),
};

export const dashboardAPI = {
  getData: (params) => apiClient.get('/dashboard/', { params }),
  getStats: () => apiClient.get('/dashboard/stats'),
};

export const integrationsAPI = {
  // Get status of all integrations
  getStatus: () => apiClient.get('/integrations/status'),
  // Gmail OAuth
  getGmailAuthUrl: () => apiClient.get('/integrations/gmail/auth'),
  disconnectGmail: () => apiClient.delete('/integrations/gmail/disconnect'),
  // Drive OAuth
  getDriveAuthUrl: () => apiClient.get('/integrations/drive/auth'),
  listDriveFolders: () => apiClient.get('/integrations/drive/folders'),
  updateDriveConfig: (data) => apiClient.patch('/integrations/drive/config', data),
  disconnectDrive: () => apiClient.delete('/integrations/drive/disconnect'),
  // General
  list: () => apiClient.get('/integrations/'),
  toggle: (type) => apiClient.post(`/integrations/${type}/toggle`),
  toggle: (type) => apiClient.post(`/integrations/${type}/toggle`),
  test: (type) => apiClient.post(`/integrations/${type}/test`),
  sync: (type) => apiClient.post(`/integrations/${type}/sync`),
};
