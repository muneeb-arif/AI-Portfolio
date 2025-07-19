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
  Tabs,
  Tab,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  PhoneAndroid as StoreIcon,
  Psychology as AnalysisIcon,
  PhotoCamera as CaptureIcon,
  Android as AndroidIcon,
  Apple as AppleIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface StoreScreenshotsProps {
  onResultsUpdate: (results: any[]) => void;
  onProcessingChange: (processing: boolean) => void;
  sessionId?: string;
}

const StoreScreenshots: React.FC<StoreScreenshotsProps> = ({
  onResultsUpdate,
  onProcessingChange,
  sessionId,
}) => {
  const [urlsText, setUrlsText] = useState('');
  const [analyze, setAnalyze] = useState(false);
  const [capture, setCapture] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const parseUrls = (text: string): string[] => {
    if (!text.trim()) return [];
    
    // Split by both newlines and commas, then clean up
    const urls = text
      .split(/[\n,]/) // Split by newlines or commas
      .map(url => url.trim()) // Remove whitespace
      .filter(url => url.length > 0) // Remove empty strings
      .filter(url => isValidStoreUrl(url)); // Filter valid URLs
    
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validUrls = parseUrls(urlsText);

    if (validUrls.length === 0) {
      setError('Please enter at least one valid app store URL');
      return;
    }

    setIsProcessing(true);
    onProcessingChange(true);
    setError(null);

    try {
      const response = await axios.post('/api/store-screenshots', {
        urls: validUrls,
        analyze,
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

  const isValidStoreUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return (
        urlObj.hostname === 'play.google.com' ||
        urlObj.hostname === 'apps.apple.com' ||
        urlObj.hostname === 'appstore.com'
      );
    } catch {
      return false;
    }
  };

  const getValidUrlCount = () => {
    return parseUrls(urlsText).length;
  };

  const getPlayStoreCount = () => {
    return parseUrls(urlsText).filter(url => {
      try {
        const urlObj = new URL(url);
        return urlObj.hostname === 'play.google.com';
      } catch {
        return false;
      }
    }).length;
  };

  const getAppStoreCount = () => {
    return parseUrls(urlsText).filter(url => {
      try {
        const urlObj = new URL(url);
        return urlObj.hostname === 'apps.apple.com' || urlObj.hostname === 'appstore.com';
      } catch {
        return false;
      }
    }).length;
  };

  const getInvalidUrls = () => {
    if (!urlsText.trim()) return [];
    
    const allUrls = urlsText
      .split(/[\n,]/)
      .map(url => url.trim())
      .filter(url => url.length > 0);
    
    return allUrls.filter(url => !isValidStoreUrl(url));
  };

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <StoreIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h5" component="h2">
            App Store Screenshots
          </Typography>
        </Box>

        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                App Store URLs to Capture
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Enter Play Store or Apple App Store URLs (one per line or comma-separated) to extract screenshots and app information.
              </Typography>

              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
                  <Tab 
                    icon={<AndroidIcon />} 
                    label={`Play Store (${getPlayStoreCount()})`} 
                    iconPosition="start"
                  />
                  <Tab 
                    icon={<AppleIcon />} 
                    label={`App Store (${getAppStoreCount()})`} 
                    iconPosition="start"
                  />
                </Tabs>
              </Box>
              
              <TextField
                fullWidth
                multiline
                rows={6}
                label="App Store URLs"
                placeholder={
                  activeTab === 0 
                    ? "https://play.google.com/store/apps/details?id=com.example.app&#10;https://play.google.com/store/apps/details?id=com.another.app"
                    : "https://apps.apple.com/app/example-app/id123456789&#10;https://apps.apple.com/app/another-app/id987654321"
                }
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
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
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
                <Chip
                  icon={<AndroidIcon />}
                  label={`${getPlayStoreCount()} Play Store`}
                  color="success"
                  variant="outlined"
                />
                <Chip
                  icon={<AppleIcon />}
                  label={`${getAppStoreCount()} App Store`}
                  color="info"
                  variant="outlined"
                />
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
                    Processing app store data... This may take a few minutes.
                  </Typography>
                </Box>
              )}

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isProcessing || getValidUrlCount() === 0}
                startIcon={<StoreIcon />}
                sx={{ minWidth: 200 }}
              >
                {isProcessing ? 'Processing...' : 'Extract App Store Data'}
              </Button>
            </Box>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default StoreScreenshots; 