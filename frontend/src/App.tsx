import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { Provider } from 'react-redux';

import theme from './theme';
import { store } from './store';

import MainLayout from './components/layouts/MainLayout';
import PrivateRoute from './components/auth/PrivateRoute';

import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import NotesList from './pages/notes/NotesList';
import NoteEditor from './pages/notes/NoteEditor';
import ContentProcessor from './pages/content/ContentProcessor';
import Profile from './pages/profile/Profile';

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes */}
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Home />} />
              <Route
                path="notes"
                element={
                  <PrivateRoute>
                    <NotesList />
                  </PrivateRoute>
                }
              />
              <Route
                path="notes/:id"
                element={
                  <PrivateRoute>
                    <NoteEditor />
                  </PrivateRoute>
                }
              />
              <Route
                path="content"
                element={
                  <PrivateRoute>
                    <ContentProcessor />
                  </PrivateRoute>
                }
              />
              <Route
                path="profile"
                element={
                  <PrivateRoute>
                    <Profile />
                  </PrivateRoute>
                }
              />
            </Route>
          </Routes>
        </Router>
      </ThemeProvider>
    </Provider>
  );
};

export default App;
