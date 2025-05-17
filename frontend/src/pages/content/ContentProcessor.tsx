import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  TextField,
  Typography,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import { notesApi } from '../../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`content-tabpanel-${index}`}
      aria-labelledby={`content-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const ContentProcessor: React.FC = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const type = tabValue === 0 ? 'web' : 'pdf';
      const response = await notesApi.processContent(url, type);
      navigate(`/notes/new?content=${encodeURIComponent(JSON.stringify(response))}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process content');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Process Content
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="content type tabs">
            <Tab label="Web Page" />
            <Tab label="PDF Document" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <Typography variant="body1" gutterBottom>
              Enter the URL of the web page you want to process. The content will be extracted and
              prepared for note creation.
            </Typography>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Typography variant="body1" gutterBottom>
              Enter the URL of the PDF document you want to process. The content will be extracted
              and prepared for note creation.
            </Typography>
          </TabPanel>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              disabled={loading}
              sx={{ mb: 2 }}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button type="submit" variant="contained" disabled={loading || !url}>
                {loading ? (
                  <>
                    <CircularProgress size={24} sx={{ mr: 1 }} />
                    Processing...
                  </>
                ) : (
                  'Process Content'
                )}
              </Button>
              <Button variant="outlined" onClick={() => navigate('/notes')} disabled={loading}>
                Cancel
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Tips
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • For web pages, make sure the URL is publicly accessible
            <br />
            • For PDFs, ensure the document is not password-protected
            <br />
            • Large documents may take longer to process
            <br />• The processed content will be available in the note editor
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ContentProcessor;
