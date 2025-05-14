import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  userId: string;
}

interface NotesState {
  notes: Note[];
  currentNote: Note | null;
  loading: boolean;
  error: string | null;
}

const initialState: NotesState = {
  notes: [],
  currentNote: null,
  loading: false,
  error: null,
};

const notesSlice = createSlice({
  name: 'notes',
  initialState,
  reducers: {
    fetchNotesStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchNotesSuccess: (state, action: PayloadAction<Note[]>) => {
      state.loading = false;
      state.notes = action.payload;
    },
    fetchNotesFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    setCurrentNote: (state, action: PayloadAction<Note | null>) => {
      state.currentNote = action.payload;
    },
    createNoteStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    createNoteSuccess: (state, action: PayloadAction<Note>) => {
      state.loading = false;
      state.notes.push(action.payload);
    },
    createNoteFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    updateNoteStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    updateNoteSuccess: (state, action: PayloadAction<Note>) => {
      state.loading = false;
      const index = state.notes.findIndex((note) => note.id === action.payload.id);
      if (index !== -1) {
        state.notes[index] = action.payload;
      }
      if (state.currentNote?.id === action.payload.id) {
        state.currentNote = action.payload;
      }
    },
    updateNoteFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    deleteNoteStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    deleteNoteSuccess: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.notes = state.notes.filter((note) => note.id !== action.payload);
      if (state.currentNote?.id === action.payload) {
        state.currentNote = null;
      }
    },
    deleteNoteFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  fetchNotesStart,
  fetchNotesSuccess,
  fetchNotesFailure,
  setCurrentNote,
  createNoteStart,
  createNoteSuccess,
  createNoteFailure,
  updateNoteStart,
  updateNoteSuccess,
  updateNoteFailure,
  deleteNoteStart,
  deleteNoteSuccess,
  deleteNoteFailure,
} = notesSlice.actions;

export default notesSlice.reducer; 