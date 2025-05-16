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
  createNote: async (data: any) => {
    const response = await api.post('/notes', data);
    return response.data;
  },
  updateNote: async (id: number, data: any) => {
    const response = await api.put(`/notes/${id}`, data);
    return response.data;
  },
  deleteNote: async (id: number) => {
    await api.delete(`/notes/${id}`);
  },
};