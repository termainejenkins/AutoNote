import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Note, NotesState } from '../../types/notes';
import { notesApi } from '../../services/api';

const initialState: NotesState = {
  items: [],
  currentNote: null,
  isLoading: false,
  error: null,
};

// Async actions
export const fetchNotes = createAsyncThunk('notes/fetchNotes', async () => {
  const response = await notesApi.getNotes();
  return response;
});

export const createNote = createAsyncThunk(
  'notes/createNote',
  async (data: { title: string; content: string; tags?: string[] }) => {
    const response = await notesApi.createNote(data);
    return response;
  }
);

export const updateNote = createAsyncThunk(
  'notes/updateNote',
  async ({ id, data }: { id: string; data: Partial<Note> }) => {
    const response = await notesApi.updateNote(id, data);
    return response;
  }
);

export const deleteNote = createAsyncThunk('notes/deleteNote', async (id: string) => {
  await notesApi.deleteNote(id);
  return id;
});

const notesSlice = createSlice({
  name: 'notes',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentNote: (state) => {
      state.currentNote = null;
    },
    setCurrentNote: (state, action) => {
      state.currentNote = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotes.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotes.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchNotes.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch notes';
      })
      .addCase(createNote.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createNote.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items.push(action.payload);
        state.currentNote = action.payload;
      })
      .addCase(createNote.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to create note';
      })
      .addCase(updateNote.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateNote.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.items.findIndex((note) => note.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        state.currentNote = action.payload;
      })
      .addCase(updateNote.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to update note';
      })
      .addCase(deleteNote.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteNote.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = state.items.filter((note) => note.id !== action.payload);
        if (state.currentNote?.id === action.payload) {
          state.currentNote = null;
        }
      })
      .addCase(deleteNote.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to delete note';
      });
  },
});

export const { clearError, clearCurrentNote, setCurrentNote } = notesSlice.actions;
export default notesSlice.reducer;
