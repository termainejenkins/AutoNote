import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Box,
  Button,
  TextField,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Autocomplete,
} from '@mui/material';
import { Editor } from '@tinymce/tinymce-react';
import { RootState, AppDispatch } from '../../store';
import { notesApi } from '../../services/api';
import { fetchNotes } from '../../store/slices/notesSlice';

const validationSchema = Yup.object({
  title: Yup.string().required('Title is required'),
  content: Yup.string().required('Content is required'),
  tags: Yup.array().of(Yup.string()),
});

const NoteEditor: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.notes);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestedTags] = useState<string[]>([]);

  const formik = useFormik({
    initialValues: {
      title: '',
      content: '',
      tags: [] as string[],
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setIsSubmitting(true);
        if (id) {
          await notesApi.updateNote(id, values);
        } else {
          await notesApi.createNote(values);
        }
        navigate('/notes');
      } catch (err) {
        console.error('Failed to save note:', err);
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  useEffect(() => {
    const fetchNote = async () => {
      if (id) {
        try {
          const response = await notesApi.getNote(id);
          formik.setValues({
            title: response.title,
            content: response.content,
            tags: response.tags,
          });
          dispatch(fetchNotes());
        } catch (err) {
          console.error('Failed to fetch note:', err);
        }
      }
    };
    fetchNote();
  }, [id, dispatch]);

  const handleEditorChange = (content: string) => {
    formik.setFieldValue('content', content);
  };

  const handleTagsChange = (_: any, newValue: string[]) => {
    formik.setFieldValue('tags', newValue);
  };

  if (isLoading) {
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
        {id ? 'Edit Note' : 'New Note'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={formik.handleSubmit}>
        <TextField
          fullWidth
          id="title"
          name="title"
          label="Title"
          value={formik.values.title}
          onChange={formik.handleChange}
          error={formik.touched.title && Boolean(formik.errors.title)}
          helperText={formik.touched.title && formik.errors.title}
          sx={{ mb: 2 }}
        />

        <Box sx={{ mb: 2 }}>
          <Editor
            apiKey={process.env.REACT_APP_TINYMCE_API_KEY}
            value={formik.values.content}
            onEditorChange={handleEditorChange}
            init={{
              height: 500,
              menubar: false,
              plugins: [
                'advlist',
                'autolink',
                'lists',
                'link',
                'image',
                'charmap',
                'preview',
                'anchor',
                'searchreplace',
                'visualblocks',
                'code',
                'fullscreen',
                'insertdatetime',
                'media',
                'table',
                'code',
                'help',
                'wordcount',
              ],
              toolbar:
                'undo redo | blocks | ' +
                'bold italic forecolor | alignleft aligncenter ' +
                'alignright alignjustify | bullist numlist outdent indent | ' +
                'removeformat | help',
              content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
            }}
          />
          {formik.touched.content && formik.errors.content && (
            <Typography color="error" variant="caption">
              {formik.errors.content}
            </Typography>
          )}
        </Box>

        <Autocomplete
          multiple
          id="tags"
          options={suggestedTags}
          value={formik.values.tags}
          onChange={handleTagsChange}
          freeSolo
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip label={option} {...getTagProps({ index })} key={option} />
            ))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label="Tags"
              placeholder="Add tags"
              error={formik.touched.tags && Boolean(formik.errors.tags)}
              helperText={formik.touched.tags && formik.errors.tags}
            />
          )}
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="contained" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Note'}
          </Button>
          <Button variant="outlined" onClick={() => navigate('/notes')}>
            Cancel
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default NoteEditor;
