import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  register: async (username: string, email: string, password: string) => {
    const response = await api.post('/auth/register', { username, email, password });
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('token');
  },
  updatePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.put('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
  updateUser: async (data: { id: string; username?: string; email?: string }) => {
    const response = await api.put(`/auth/users/${data.id}`, data);
    return response.data;
  },
};

export const notesApi = {
  getNotes: async () => {
    const response = await api.get('/notes');
    return response.data;
  },
  getNote: async (id: number) => {
    const response = await api.get(`/notes/${id}`);
    return response.data;
  },
  createNote: async (data: { title: string; content: string; tags?: string[] }) => {
    const response = await api.post('/notes', data);
    return response.data;
  },
  updateNote: async (id: number, data: { title?: string; content?: string; tags?: string[] }) => {
    const response = await api.put(`/notes/${id}`, data);
    return response.data;
  },
  deleteNote: async (id: number) => {
    const response = await api.delete(`/notes/${id}`);
    return response.data;
  },
  processContent: async (content: string) => {
    const response = await api.post('/notes/process', { content });
    return response.data;
  }
};