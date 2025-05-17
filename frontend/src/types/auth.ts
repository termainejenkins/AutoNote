export interface User {
  id: string;
  email: string;
  username: string;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export type RegisterCredentials = {
  username: string;
  email: string;
  password: string;
};

export interface AuthResponse {
  user: User;
  token: string;
}
