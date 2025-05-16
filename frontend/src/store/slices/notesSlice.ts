import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { notesApi } from '../../services/api';

interface Note {
  id: number;
  title: string;
  content: string;
  source_url?: string;
  source_type: string;
  created_at: string;
  updated_at: string;
}

interface NotesState {
  items: Note[];
  currentNote: Note | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: NotesState = {
  items: [],
  currentNote: null,
  isLoading: false,
  error: null,
};

export const fetchNotes = createAsyncThunk('notes/fetchNotes', async () => {
  const response = await notesApi.getNotes();
  return response;
});

export const fetchNote = createAsyncThunk('notes/fetchNote', async (id: number) => {
  const response = await notesApi.getNote(id);
  return response;
});

export const createNote = createAsyncThunk(
  'notes/createNote',
  async (data: Partial<Note>) => {
    const response = await notesApi.createNote(data);
    return response;
  }
);

export const updateNote = createAsyncThunk(
  'notes/updateNote',
  async ({ id, data }: { id: number; data: Partial<Note> }) => {
    const response = await notesApi.updateNote(id, data);
    return response;
  }
);

export const deleteNote = createAsyncThunk('notes/deleteNote', async (id: number) => {
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
      .addCase(fetchNote.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNote.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentNote = action.payload;
      })
      .addCase(fetchNote.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch note';
      })
      .addCase(createNote.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateNote.fulfilled, (state, action) => {
        const index = state.items.findIndex((note) => note.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.currentNote?.id === action.payload.id) {
          state.currentNote = action.payload;
        }
      })
      .addCase(deleteNote.fulfilled, (state, action) => {
        state.items = state.items.filter((note) => note.id !== action.payload);
        if (state.currentNote?.id === action.payload) {
          state.currentNote = null;
        }
      });
  },
});

export const { clearError, clearCurrentNote } = notesSlice.actions;
export default notesSlice.reducer;