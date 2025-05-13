import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
} from '@mui/material';
import NoteAltIcon from '@mui/icons-material/NoteAlt';

function Navbar() {
  return (
    <AppBar position="static">
      <Toolbar>
        <NoteAltIcon sx={{ mr: 2 }} />
        <Typography
          variant="h6"
          component={RouterLink}
          to="/"
          sx={{
            flexGrow: 1,
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          AutoNote
        </Typography>
        <Box>
          <Button
            color="inherit"
            component={RouterLink}
            to="/"
          >
            Dashboard
          </Button>
          <Button
            color="inherit"
            component={RouterLink}
            to="/notes"
          >
            My Notes
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar; 