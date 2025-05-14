import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Description as NoteIcon,
  Web as WebIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { RootState } from '../store';
import { getNotes } from '../services/api';
import {
  fetchNotesStart,
  fetchNotesSuccess,
  fetchNotesFailure,
} from '../store/slices/notesSlice';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { notes, loading } = useSelector((state: RootState) => state.notes);
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        dispatch(fetchNotesStart());
        const response = await getNotes();
        dispatch(fetchNotesSuccess(response));
      } catch (err) {
        dispatch(fetchNotesFailure(err instanceof Error ? err.message : 'Failed to fetch notes'));
      }
    };

    fetchNotes();
  }, [dispatch]);

  const handleCreateNote = () => {
    navigate('/notes/new');
  };

  const handleProcessContent = (type: 'web' | 'pdf') => {
    navigate(`/content/process?type=${type}`);
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Welcome back, {user?.username}!
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreateNote}
                >
                  New Note
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<WebIcon />}
                  onClick={() => handleProcessContent('web')}
                >
                  Process Web Page
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PdfIcon />}
                  onClick={() => handleProcessContent('pdf')}
                >
                  Process PDF
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Notes
              </Typography>
              {notes.length === 0 ? (
                <Typography color="text.secondary">
                  No notes yet. Create your first note!
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {notes.slice(0, 5).map((note) => (
                    <Card
                      key={note.id}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                      onClick={() => navigate(`/notes/${note.id}`)}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <NoteIcon color="action" />
                          <Typography variant="subtitle1">{note.title}</Typography>
                        </Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mt: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {note.content}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Home; 