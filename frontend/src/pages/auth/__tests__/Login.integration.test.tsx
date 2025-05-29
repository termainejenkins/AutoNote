import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import { configureStore } from '@reduxjs/toolkit';
import theme from '../../../theme';
import Login from '../Login';
import authReducer from '../../../store/slices/authSlice';
import notesReducer from '../../../store/slices/notesSlice';

// Mock API
jest.mock('../../../services/api', () => ({
  authApi: {
    login: jest.fn((email, password) => {
      if (email === 'test@example.com' && password === 'testpass123') {
        return Promise.resolve({ access_token: 'mock-token' });
      } else {
        return Promise.reject({ response: { status: 401 } });
      }
    }),
  },
}));

const user = userEvent.setup();

const renderWithProviders = (component: React.ReactElement, initialState = {
  auth: {
    user: null,
    isAuthenticated: false,
    token: null,
    isLoading: false,
    error: null,
  },
  notes: {
    items: [],
    currentNote: null,
    isLoading: false,
    error: null,
  },
}) => {
  const store = configureStore({
    reducer: { auth: authReducer, notes: notesReducer },
    preloadedState: initialState,
  });
  return render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>{component}</ThemeProvider>
    </Provider>
  );
};

describe('Login Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs in successfully with correct credentials', async () => {
    renderWithProviders(<Login />);
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'testpass123');
    await user.click(screen.getByRole('button', { name: /login/i }));
    await waitFor(() => expect(screen.queryByText(/invalid/i)).not.toBeInTheDocument());
  });

  it('shows error on failed login', async () => {
    renderWithProviders(<Login />);
    await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /login/i }));
    await waitFor(() => expect(screen.getByText(/invalid/i)).toBeInTheDocument());
  });

  it('shows error if API is down', async () => {
    const { authApi } = require('../../../services/api');
    authApi.login.mockRejectedValueOnce(new Error('Network error'));
    renderWithProviders(<Login />);
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'testpass123');
    await user.click(screen.getByRole('button', { name: /login/i }));
    expect(await screen.findByText(/error/i)).toBeInTheDocument();
  });

  it('shows validation error if email is missing', async () => {
    renderWithProviders(<Login />);
    await user.type(screen.getByLabelText(/password/i), 'testpass123');
    await user.click(screen.getByRole('button', { name: /login/i }));
    expect(await screen.findByText(/email.*required/i)).toBeInTheDocument();
  });

  it('shows validation error if password is missing', async () => {
    renderWithProviders(<Login />);
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /login/i }));
    expect(await screen.findByText(/password.*required/i)).toBeInTheDocument();
  });

  it('shows loading state during login', async () => {
    const { authApi } = require('../../../services/api');
    authApi.login.mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve({ access_token: 'mock-token' }), 100)));
    renderWithProviders(<Login />);
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'testpass123');
    await user.click(screen.getByRole('button', { name: /login/i }));
    expect(screen.getByRole('button', { name: /login/i })).toBeDisabled();
    await waitFor(() => expect(screen.getByRole('button', { name: /login/i })).not.toBeDisabled());
  });
}); 