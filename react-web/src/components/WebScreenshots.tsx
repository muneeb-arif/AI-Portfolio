import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Chip,
  Alert,
  LinearProgress,
  Card,
  CardContent,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Web as WebIcon,
  Psychology as AnalysisIcon,
  Search as DeepCaptureIcon,
  PhotoCamera as CaptureIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface WebScreenshotsProps {
  onResultsUpdate: (results: any[]) => void;
  onProcessingChange: (processing: boolean) => void;
  sessionId?: string;
}

const WebScreenshots: React.FC<WebScreenshotsProps> = ({
  onResultsUpdate,
  onProcessingChange,
  sessionId,
}) => {
  const [urlsText, setUrlsText] = useState('');
  const [analyze, setAnalyze] = useState(false);
  const [deepCapture, setDeepCapture] = useState(false);
  const [capture, setCapture] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const parseUrls = (text: string): string[] => {
    if (!text.trim()) return [];
    
    // Split by both newlines and commas, then clean up
    const urls = text
      .split(/[\n,]/) // Split by newlines or commas
      .map(url => url.trim()) // Remove whitespace
      .filter(url => url.length > 0) // Remove empty strings
      .filter(url => isValidUrl(url)); // Filter valid URLs
    
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validUrls = parseUrls(urlsText);

    if (validUrls.length === 0) {
      setError('Please enter at least one valid URL');
      return;
    }

    setIsProcessing(true);
    onProcessingChange(true);
    setError(null);

    try {
      const response = await axios.post('/api/web-screenshots', {
        urls: validUrls,
        analyze,
        deep_capture: deepCapture,
        capture,
        sessionId,
      });

      onResultsUpdate(response.data.results || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred while processing the request');
    } finally {
      setIsProcessing(false);
      onProcessingChange(false);
    }
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const getValidUrlCount = () => {
    return parseUrls(urlsText).length;
  };

  const getInvalidUrls = () => {
    if (!urlsText.trim()) return [];
    
    const allUrls = urlsText
      .split(/[\n,]/)
      .map(url => url.trim())
      .filter(url => url.length > 0);
    
    return allUrls.filter(url => !isValidUrl(url));
  };

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <WebIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h5" component="h2">
            Web Screenshots
          </Typography>
        </Box>

        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                URLs to Capture
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Enter URLs (one per line or comma-separated)
              </Typography>
              
              <TextField
                fullWidth
                multiline
                rows={6}
                label="URLs"
                placeholder="https://example.com&#10;https://github.com&#10;https://stackoverflow.com"
                value={urlsText}
                onChange={(e) => setUrlsText(e.target.value)}
                disabled={isProcessing}
                helperText={`${getValidUrlCount()} valid URLs found`}
              />
              
              {getInvalidUrls().length > 0 && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    Invalid URLs: {getInvalidUrls().join(', ')}
                  </Typography>
                </Alert>
              )}
            </Box>

            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Button
                  endIcon={showAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  sx={{ textTransform: 'none' }}
                >
                  Advanced Options
                </Button>
              </Box>

              <Collapse in={showAdvanced}>
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={capture}
                            onChange={(e) => setCapture(e.target.checked)}
                            disabled={isProcessing}
                          />
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <CaptureIcon sx={{ mr: 1, fontSize: 20 }} />
                            Capture Screenshots
                          </Box>
                        }
                      />
                      
                      <FormControlLabel
                        control={
                          <Switch
                            checked={analyze}
                            onChange={(e) => setAnalyze(e.target.checked)}
                            disabled={isProcessing}
                          />
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <AnalysisIcon sx={{ mr: 1, fontSize: 20 }} />
                            AI Analysis
                          </Box>
                        }
                      />
                      
                      <FormControlLabel
                        control={
                          <Switch
                            checked={deepCapture}
                            onChange={(e) => setDeepCapture(e.target.checked)}
                            disabled={isProcessing}
                          />
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <DeepCaptureIcon sx={{ mr: 1, fontSize: 20 }} />
                            Deep Capture (Internal Links)
                          </Box>
                        }
                      />
                      {deepCapture && (
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: 1 }}>
                          Automatically discover and capture up to 10 internal links from each URL
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Collapse>
            </Box>

            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <Chip
                  label={`${getValidUrlCount()} valid URLs`}
                  color={getValidUrlCount() > 0 ? 'success' : 'default'}
                  variant="outlined"
                />
                {deepCapture && (
                  <Chip
                    label="Deep Capture Enabled"
                    color="info"
                    variant="outlined"
                  />
                )}
                {analyze && (
                  <Chip
                    label="AI Analysis Enabled"
                    color="secondary"
                    variant="outlined"
                  />
                )}
                {!capture && (
                  <Chip
                    label="Screenshots Disabled"
                    color="warning"
                    variant="outlined"
                  />
                )}
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {isProcessing && (
                <Box sx={{ mb: 2 }}>
                  <LinearProgress />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Processing screenshots... This may take a few minutes.
                  </Typography>
                </Box>
              )}

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isProcessing || getValidUrlCount() === 0}
                startIcon={<WebIcon />}
                sx={{ minWidth: 200 }}
              >
                {isProcessing ? 'Processing...' : 'Capture Screenshots'}
              </Button>
            </Box>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default WebScreenshots; 