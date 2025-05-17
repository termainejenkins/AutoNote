import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
} from '@mui/material';
import NoteAltIcon from '@mui/icons-material/NoteAlt';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import SchoolIcon from '@mui/icons-material/School';
import axios from 'axios';

function Dashboard() {
  const [stats, setStats] = useState({
    totalNotes: 0,
    webNotes: 0,
    videoNotes: 0,
    courseraNotes: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get('http://localhost:8000/notes/');
      const notes = response.data;

      setStats({
        totalNotes: notes.length,
        webNotes: notes.filter((note) => note.source_type === 'web').length,
        videoNotes: notes.filter((note) => note.source_type === 'video').length,
        courseraNotes: notes.filter((note) => note.source_type === 'coursera').length,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Icon sx={{ fontSize: 40, color, mr: 2 }} />
          <Typography variant="h4" component="div">
            {value}
          </Typography>
        </Box>
        <Typography color="text.secondary">{title}</Typography>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Notes"
            value={stats.totalNotes}
            icon={NoteAltIcon}
            color="primary.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Web Notes"
            value={stats.webNotes}
            icon={NoteAltIcon}
            color="primary.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Video Notes"
            value={stats.videoNotes}
            icon={VideoLibraryIcon}
            color="secondary.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Coursera Notes"
            value={stats.courseraNotes}
            icon={SchoolIcon}
            color="success.main"
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Quick Actions
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Browser Extension
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Install our browser extension to automatically capture notes while browsing.
              </Typography>
              <Button variant="contained" color="primary">
                Install Extension
              </Button>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                View Notes
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Access all your captured notes in one place.
              </Typography>
              <Button variant="contained" color="primary" href="/notes">
                View Notes
              </Button>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Coursera Integration
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Connect your Coursera account to capture course content.
              </Typography>
              <Button variant="contained" color="primary">
                Connect Coursera
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}

export default Dashboard;
