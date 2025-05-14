import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add the auth token to requests
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

// Add a response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const login = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const register = async (username: string, email: string, password: string) => {
  const response = await api.post('/auth/register', { username, email, password });
  return response.data;
};

// Notes endpoints
export const getNotes = async () => {
  const response = await api.get('/notes');
  return response.data;
};

export const getNote = async (id: string) => {
  const response = await api.get(`/notes/${id}`);
  return response.data;
};

export const createNote = async (note: { title: string; content: string; tags: string[] }) => {
  const response = await api.post('/notes', note);
  return response.data;
};

export const updateNote = async (id: string, note: { title: string; content: string; tags: string[] }) => {
  const response = await api.put(`/notes/${id}`, note);
  return response.data;
};

export const deleteNote = async (id: string) => {
  const response = await api.delete(`/notes/${id}`);
  return response.data;
};

// Content endpoints
export const processContent = async (url: string, type: 'web' | 'pdf') => {
  const response = await api.post('/content/process', { url, type });
  return response.data;
};

export const getContent = async (id: string) => {
  const response = await api.get(`/content/${id}`);
  return response.data;
};

// AI endpoints
export const processAI = async (content: string, operation: 'summarize' | 'extract' | 'questions') => {
  const response = await api.post('/ai/process', { content, operation });
  return response.data;
};

export const getAIResult = async (id: string) => {
  const response = await api.get(`/ai/${id}`);
  return response.data;
};

export default api; 