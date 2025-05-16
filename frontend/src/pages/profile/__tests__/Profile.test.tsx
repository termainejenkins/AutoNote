import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import { configureStore } from '@reduxjs/toolkit';
import theme from '../../../theme';
import Profile from '../Profile';
import authReducer from '../../../store/slices/authSlice';
import notesReducer from '../../../store/slices/notesSlice';

// Create a userEvent instance
const user = userEvent.setup();

const renderWithProviders = (
  component: React.ReactElement,
  initialState = {
    auth: {
      user: { id: 1, username: 'testuser', email: 'test@example.com', created_at: new Date().toISOString() },
      isAuthenticated: true,
      token: 'test-token',
      isLoading: false,
      error: null,
    },
    notes: {
      items: [],
      currentNote: null,
      isLoading: false,
      error: null,
    },
  }
) => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      notes: notesReducer,
    },
    preloadedState: initialState,
  });

  return render(
    <Provider store={store}>
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
  });  it('shows validation errors for invalid input', async () => {
    renderWithProviders(<Profile />);
    
    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');
    await user.tab();

    await waitFor(() => {
      const errorText = screen.getByText('Enter a valid email');
      expect(errorText).toBeInTheDocument();
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
