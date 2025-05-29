import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import { configureStore } from '@reduxjs/toolkit';
import theme from '../../../theme';
import NotesList from '../NotesList';
import authReducer from '../../../store/slices/authSlice';
import notesReducer from '../../../store/slices/notesSlice';

// Mock API
jest.mock('../../../services/api', () => ({
  notesApi: {
    getNotes: jest.fn().mockResolvedValue([
      { id: '1', title: 'Note 1', content: 'Content 1', tags: [] },
      { id: '2', title: 'Note 2', content: 'Content 2', tags: [] },
    ]),
    createNote: jest.fn().mockResolvedValue({ id: '3', title: 'Note 3', content: 'Content 3', tags: [] }),
  },
}));

const user = userEvent.setup();

const renderWithProviders = (component: React.ReactElement, initialState = {
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

describe('NotesList Integration', () => {
  it('fetches and displays notes', async () => {
    renderWithProviders(<NotesList />);
    expect(await screen.findByText('Note 1')).toBeInTheDocument();
    expect(screen.getByText('Note 2')).toBeInTheDocument();
  });

  it('creates a new note and updates the list', async () => {
    renderWithProviders(<NotesList />);
    const addButton = await screen.findByRole('button', { name: /add note/i });
    await user.click(addButton);
    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, 'Note 3');
    const contentInput = screen.getByLabelText(/content/i);
    await user.type(contentInput, 'Content 3');
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);
    await waitFor(() => expect(screen.getByText('Note 3')).toBeInTheDocument());
  });
}); 