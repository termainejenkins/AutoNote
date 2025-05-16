import { configureStore, AnyAction } from '@reduxjs/toolkit';
import { ThunkDispatch } from 'redux-thunk';
import authReducer, { login, register, logout, updateUser } from '../authSlice';
import { authApi } from '../../../services/api';
import { AuthState } from '../../../types/auth';

// Mock the API
jest.mock('../../../services/api', () => ({
  authApi: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    updateUser: jest.fn(),
    updatePassword: jest.fn(),
  }
}));

type AppDispatch = ThunkDispatch<{ auth: AuthState }, unknown, AnyAction>;

describe('Auth Slice', () => {
  let store: ReturnType<typeof configureStore>;
  let dispatch: AppDispatch;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authReducer,
      },
    });
    dispatch = store.dispatch as AppDispatch;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login action', () => {
    const mockCredentials = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockResponse = {
      user: {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
      },
      token: 'mock-token',
    };

    it('handles successful login', async () => {
      (authApi.login as jest.Mock).mockResolvedValue(mockResponse);

      await store.dispatch(login(mockCredentials));
      const state = store.getState().auth;

      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockResponse.user);
      expect(state.error).toBeNull();
    });

    it('handles login failure', async () => {
      const errorMessage = 'Invalid credentials';
      (authApi.login as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await store.dispatch(login(mockCredentials));
      const state = store.getState().auth;

      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.error).toContain(errorMessage);
    });
  });

  describe('updateUser action', () => {
    const mockUser = {
      id: '1',
      username: 'updateduser',
      email: 'updated@example.com',
    };

    it('handles successful user update', async () => {
      (authApi.updateUser as jest.Mock).mockResolvedValue(mockUser);

      await store.dispatch(updateUser(mockUser));
      const state = store.getState().auth;

      expect(state.user).toEqual(mockUser);
      expect(state.error).toBeNull();
    });

    it('handles update failure', async () => {
      const errorMessage = 'Update failed';
      (authApi.updateUser as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await store.dispatch(updateUser(mockUser));
      const state = store.getState().auth;

      expect(state.error).toContain(errorMessage);
    });
  });
});
