import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Box,
  Chip,
  Button,
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import axios from 'axios';

function NoteDetail() {
  const [note, setNote] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchNote();
  }, [id]);

  const fetchNote = async () => {
    try {
      const response = await axios.get(`http://localhost:8000/notes/${id}`);
      setNote(response.data);
    } catch (error) {
      console.error('Error fetching note:', error);
    }
  };

  if (!note) {
    return (
      <Container>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/notes')}
        sx={{ mb: 2 }}
      >
        Back to Notes
      </Button>
      
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {note.title}
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Chip
            label={note.source_type}
            color={
              note.source_type === 'web'
                ? 'primary'
                : note.source_type === 'video'
                ? 'secondary'
                : 'success'
            }
          />
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="body1" paragraph>
          {note.content}
        </Typography>
        
        {note.source_url && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Source:
            </Typography>
            <Typography
              component="a"
              href={note.source_url}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: 'primary.main', textDecoration: 'none' }}
            >
              {note.source_url}
            </Typography>
          </Box>
        )}
        
        {note.created_at && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Created:
            </Typography>
            <Typography>
              {new Date(note.created_at).toLocaleString()}
            </Typography>
          </Box>
        )}
      </Paper>
    </Container>
  );
}

export default NoteDetail; 