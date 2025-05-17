export interface User {
  id: string;
  email: string;
  username: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  username: string;
}

export interface NoteFormData {
  title: string;
  content: string;
  tags: string[];
}

export interface ContentProcessRequest {
  url: string;
  type: 'web' | 'pdf';
}

export interface AIProcessRequest {
  content: string;
  operation: 'summarize' | 'extract' | 'questions';
}
