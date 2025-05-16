import { configureStore } from '@reduxjs/toolkit';
import notesReducer, { fetchNotes, createNote, updateNote, deleteNote } from '../notesSlice';
import { notesApi } from '../../../services/api';

jest.mock('../../../services/api');

describe('Notes Slice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        notes: notesReducer,
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchNotes action', () => {
    const mockNotes = [
      {
        id: '1',
        title: 'Test Note 1',
        content: 'Content 1',
        tags: ['test'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '2',
        title: 'Test Note 2',
        content: 'Content 2',
        tags: ['test'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    it('handles successful notes fetch', async () => {
      (notesApi.getNotes as jest.Mock).mockResolvedValue(mockNotes);

      await store.dispatch(fetchNotes());
      const state = store.getState().notes;

      expect(state.items).toEqual(mockNotes);
      expect(state.error).toBeNull();
    });

    it('handles fetch failure', async () => {
      const errorMessage = 'Failed to fetch notes';
      (notesApi.getNotes as jest.Mock).mockRejectedValue(new Error(errorMessage));

      await store.dispatch(fetchNotes());
      const state = store.getState().notes;

      expect(state.error).toContain(errorMessage);
    });
  });

  describe('createNote action', () => {
    const mockNote = {
      title: 'New Note',
      content: 'New Content',
      tags: ['new'],
    };

    const mockResponse = {
      id: '3',
      ...mockNote,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it('handles successful note creation', async () => {
      (notesApi.createNote as jest.Mock).mockResolvedValue(mockResponse);

      await store.dispatch(createNote(mockNote));
      const state = store.getState().notes;

      expect(state.items).toContainEqual(mockResponse);
      expect(state.error).toBeNull();
    });
  });

  describe('updateNote action', () => {
    const mockUpdate = {
      id: '1',
      data: {
        title: 'Updated Note',
        content: 'Updated Content',
      },
    };

    const mockResponse = {
      id: '1',
      title: 'Updated Note',
      content: 'Updated Content',
      tags: ['test'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it('handles successful note update', async () => {
      (notesApi.updateNote as jest.Mock).mockResolvedValue(mockResponse);

      await store.dispatch(updateNote(mockUpdate));
      const state = store.getState().notes;

      const updatedNote = state.items.find(note => note.id === '1');
      expect(updatedNote).toEqual(mockResponse);
    });
  });

  describe('deleteNote action', () => {
    it('handles successful note deletion', async () => {
      const noteId = '1';
      (notesApi.deleteNote as jest.Mock).mockResolvedValue({ success: true });

      // Add a note first
      store = configureStore({
        reducer: {
          notes: notesReducer,
        },
        preloadedState: {
          notes: {
            items: [{
              id: noteId,
              title: 'Test Note',
              content: 'Content',
              tags: ['test'],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }],
            error: null,
            isLoading: false,
          },
        },
      });

      await store.dispatch(deleteNote(noteId));
      const state = store.getState().notes;

      expect(state.items).not.toContainEqual(expect.objectContaining({ id: noteId }));
    });
  });
});
