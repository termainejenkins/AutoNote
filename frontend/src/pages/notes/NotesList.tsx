import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
  Chip,
  CircularProgress,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
} from '@mui/icons-material';
import { RootState } from '../../store';
import { getNotes } from '../../services/api';
import {
  fetchNotesStart,
  fetchNotesSuccess,
  fetchNotesFailure,
} from '../../store/slices/notesSlice';

type SortOption = 'newest' | 'oldest' | 'title';

const NotesList: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { notes, loading } = useSelector((state: RootState) => state.notes);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);

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

  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };

  const handleSortClick = (event: React.MouseEvent<HTMLElement>) => {
    setSortAnchorEl(event.currentTarget);
  };

  const handleSortClose = () => {
    setSortAnchorEl(null);
  };

  const handleSortChange = (option: SortOption) => {
    setSortBy(option);
    handleSortClose();
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    );
  };

  const filteredNotes = notes
    .filter((note) => {
      const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTags = selectedTags.length === 0 ||
        selectedTags.every((tag) => note.tags.includes(tag));
      return matchesSearch && matchesTags;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

  const allTags = Array.from(new Set(notes.flatMap((note) => note.tags)));

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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">My Notes</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateNote}
        >
          New Note
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={handleFilterClick}
              >
                Filter
              </Button>
              <Button
                variant="outlined"
                startIcon={<SortIcon />}
                onClick={handleSortClick}
              >
                Sort
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {selectedTags.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Selected Tags:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {selectedTags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                onDelete={() => handleTagToggle(tag)}
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      )}

      <Grid container spacing={3}>
        {filteredNotes.map((note) => (
          <Grid item xs={12} md={6} lg={4} key={note.id}>
            <Card
              sx={{
                cursor: 'pointer',
                height: '100%',
                '&:hover': { bgcolor: 'action.hover' },
              }}
              onClick={() => navigate(`/notes/${note.id}`)}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {note.title}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mb: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {note.content}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {note.tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTagToggle(tag);
                      }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Menu
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={handleFilterClose}
      >
        {allTags.map((tag) => (
          <MenuItem
            key={tag}
            onClick={() => handleTagToggle(tag)}
            selected={selectedTags.includes(tag)}
          >
            {tag}
          </MenuItem>
        ))}
      </Menu>

      <Menu
        anchorEl={sortAnchorEl}
        open={Boolean(sortAnchorEl)}
        onClose={handleSortClose}
      >
        <MenuItem onClick={() => handleSortChange('newest')}>Newest First</MenuItem>
        <MenuItem onClick={() => handleSortChange('oldest')}>Oldest First</MenuItem>
        <MenuItem onClick={() => handleSortChange('title')}>Title</MenuItem>
      </Menu>
    </Box>
  );
};

export default NotesList; 