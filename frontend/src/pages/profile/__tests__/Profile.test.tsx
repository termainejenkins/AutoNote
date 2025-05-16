import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import { configureStore } from '@reduxjs/toolkit';
import theme from '../../../theme';
import Profile from '../Profile';
import authReducer from '../../../store/slices/authSlice';
import notesReducer from '../../../store/slices/notesSlice';

const mockStore = configureStore({
  reducer: {
    auth: authReducer,
    notes: notesReducer,
  },
  preloadedState: {
    auth: {
      user: {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
    },
    notes: {
      items: [],
      isLoading: false,
      error: null,
    },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <Provider store={mockStore}>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </Provider>
  );
};

describe('Profile Component', () => {
  it('renders the profile form with user data', () => {
    renderWithProviders(<Profile />);
    
    expect(screen.getByLabelText(/username/i)).toHaveValue('testuser');
    expect(screen.getByLabelText(/email/i)).toHaveValue('test@example.com');
  });

  it('shows validation errors for invalid input', async () => {
    renderWithProviders(<Profile />);
    
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText(/enter a valid email/i)).toBeInTheDocument();
    });
  });

  it('shows password fields', () => {
    renderWithProviders(<Profile />);
    
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm.*password/i)).toBeInTheDocument();
  });

  it('displays statistics', () => {
    renderWithProviders(<Profile />);
    
    expect(screen.getByText(/total notes/i)).toBeInTheDocument();
    expect(screen.getByText(/last active/i)).toBeInTheDocument();
    expect(screen.getByText(/average notes per day/i)).toBeInTheDocument();
  });
});
