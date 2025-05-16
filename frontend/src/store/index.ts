import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import notesReducer from './slices/notesSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    notes: notesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['auth/login/fulfilled', 'auth/register/fulfilled'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;