import { configureStore } from '@reduxjs/toolkit';
import authReducer, { login, updateUser } from '../authSlice';
import { authApi } from '../../../services/api';
import { AuthState, User } from '../../../types/auth';

// Mock the API
jest.mock('../../../services/api', () => ({
  authApi: {
    login: jest.fn(),
    updateUser: jest.fn(),
    updatePassword: jest.fn(),
  }
}));

type RootState = ReturnType<typeof store.getState>;
type AppDispatch = typeof store.dispatch;

describe('Auth Slice', () => {
  let store: ReturnType<typeof configureStore>;
  let appDispatch: AppDispatch;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authReducer,
      },
    });
    appDispatch = store.dispatch;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login action', () => {
    const mockCredentials = {
      email: 'test@example.com',
      password: 'password123',
    };    const mockResponse = {
      user: {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        created_at: new Date().toISOString(),
      },
      token: 'mock-token',
    };

    it('handles successful login', async () => {
      (authApi.login as jest.Mock).mockResolvedValue(mockResponse);

      await store.dispatch(login(mockCredentials));
      const state = store.getState() as { auth: AuthState };

      expect(state.auth.isAuthenticated).toBe(true);
      expect(state.auth.user).toEqual(mockResponse.user);
      expect(state.auth.error).toBeNull();
    });

    it('handles login failure', async () => {
      const errorMessage = 'Invalid credentials';
      (authApi.login as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await store.dispatch(login(mockCredentials));
      const state = store.getState() as { auth: AuthState };

      expect(state.auth.isAuthenticated).toBe(false);
      expect(state.auth.user).toBeNull();
      expect(state.auth.error).toContain(errorMessage);
    });
  });
  describe('updateUser action', () => {
    const mockUser = {
      id: '1',
      username: 'updateduser',
      email: 'updated@example.com',
      created_at: new Date().toISOString(),
    };

    beforeEach(() => {
      store = configureStore({
        reducer: {
          auth: authReducer,
        },
        preloadedState: {
          auth: {            user: {
              id: '1',
              username: 'testuser',
              email: 'test@example.com',
              created_at: new Date().toISOString(),
            },
            isAuthenticated: true,
            token: 'test-token',
            isLoading: false,
            error: null,
          },
        },
      });
    });

    it('handles successful user update', async () => {
      (authApi.updateUser as jest.Mock).mockResolvedValue(mockUser);

      await store.dispatch(updateUser({ id: mockUser.id, username: mockUser.username, email: mockUser.email }));
      const state = store.getState() as { auth: AuthState };

      expect(state.auth.user).toEqual(mockUser);
      expect(state.auth.error).toBeNull();
    });

    it('handles update failure', async () => {
      const errorMessage = 'Update failed';
      (authApi.updateUser as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await store.dispatch(updateUser({ id: mockUser.id, username: mockUser.username, email: mockUser.email }));
      const state = store.getState() as { auth: AuthState };

      expect(state.auth.error).toContain(errorMessage);
    });
  });
});
