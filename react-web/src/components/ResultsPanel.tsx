import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Button,
  Collapse,
  IconButton,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Web as WebIcon,
  Brush as FigmaIcon,
  PhoneAndroid as StoreIcon,
} from '@mui/icons-material';

interface ResultsPanelProps {
  results: any[];
  isProcessing: boolean;
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({ results, isProcessing }) => {
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());

  const toggleResult = (id: string) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedResults(newExpanded);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'web':
        return <WebIcon />;
      case 'figma':
        return <FigmaIcon />;
      case 'store':
        return <StoreIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const getResultType = (result: any) => {
    if (result.deepCapture !== undefined) return 'web';
    if (result.screenshot?.file) return 'figma';
    if (result.screenshots) return 'store';
    return 'unknown';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadFile = (filePath: string, fileName: string) => {
    // In a real app, you'd implement file download logic
    console.log('Downloading:', filePath);
    // For now, just open in new tab
    window.open(`file://${filePath}`, '_blank');
  };

  if (results.length === 0 && !isProcessing) {
    return (
      <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
        <InfoIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Results Yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Capture some screenshots to see results here
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2">
            Results ({results.length})
          </Typography>
          {isProcessing && (
            <Chip
              label="Processing..."
              color="info"
              variant="outlined"
              sx={{ ml: 2 }}
            />
          )}
        </Box>

        {results.map((result, index) => {
          const resultType = getResultType(result);
          const resultId = `result-${index}`;
          const isExpanded = expandedResults.has(resultId);

          return (
            <Accordion
              key={resultId}
              expanded={isExpanded}
              onChange={() => toggleResult(resultId)}
              sx={{ mb: 2 }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                    {getResultIcon(resultType)}
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" component="div">
                      {result.projectName || result.url}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {result.url}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {result.success ? (
                      <Chip
                        icon={<SuccessIcon />}
                        label="Success"
                        color="success"
                        size="small"
                      />
                    ) : (
                      <Chip
                        icon={<ErrorIcon />}
                        label="Failed"
                        color="error"
                        size="small"
                      />
                    )}
                    {result.deepCapture && (
                      <Chip
                        label={`${result.totalUrls} URLs`}
                        color="info"
                        size="small"
                      />
                    )}
                  </Box>
                </Box>
              </AccordionSummary>
              
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {/* Screenshots Section */}
                  {result.screenshots && result.screenshots.length > 0 && (
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Screenshots ({result.screenshots.length})
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {result.screenshots.map((screenshot: any, idx: number) => (
                          <Card variant="outlined" key={idx} sx={{ minWidth: 300, flex: '1 1 300px' }}>
                            <CardContent>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                {screenshot.url}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                {screenshot.success ? (
                                  <Chip label="Success" color="success" size="small" />
                                ) : (
                                  <Chip label="Failed" color="error" size="small" />
                                )}
                              </Box>
                              {screenshot.fullPage && (
                                <Button
                                  startIcon={<DownloadIcon />}
                                  size="small"
                                  onClick={() => downloadFile(screenshot.fullPage, `full_${idx}.jpg`)}
                                  sx={{ mr: 1 }}
                                >
                                  Full Page
                                </Button>
                              )}
                              {screenshot.viewport && (
                                <Button
                                  startIcon={<DownloadIcon />}
                                  size="small"
                                  onClick={() => downloadFile(screenshot.viewport, `viewport_${idx}.jpg`)}
                                >
                                  Viewport
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Figma Screenshots */}
                  {result.screenshot?.file && (
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Figma Screenshots
                      </Typography>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {result.screenshot.file}
                          </Typography>
                          <Button
                            startIcon={<DownloadIcon />}
                            size="small"
                            onClick={() => downloadFile(result.screenshot.file, 'figma_screenshot.png')}
                          >
                            Download
                          </Button>
                        </CardContent>
                      </Card>
                    </Box>
                  )}

                  {/* App Store Screenshots */}
                  {result.screenshots && Array.isArray(result.screenshots) && result.screenshots[0]?.url?.includes('screenshot') && (
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        App Store Screenshots ({result.screenshots.length})
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {result.screenshots.map((screenshot: any, idx: number) => (
                          <Card variant="outlined" key={idx} sx={{ minWidth: 300, flex: '1 1 300px' }}>
                            <CardContent>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                Screenshot {idx + 1}
                              </Typography>
                              <Button
                                startIcon={<DownloadIcon />}
                                size="small"
                                onClick={() => downloadFile(screenshot.url, `screenshot_${idx + 1}.jpg`)}
                              >
                                Download
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Analysis Section */}
                  {result.analysis && (
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        AI Analysis
                      </Typography>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            {result.analysis}
                          </Typography>
                          {result.analysisFile && (
                            <Button
                              startIcon={<DownloadIcon />}
                              size="small"
                              onClick={() => downloadFile(result.analysisFile, 'analysis.txt')}
                              sx={{ mt: 2 }}
                            >
                              Download Analysis
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </Box>
                  )}

                  {/* Error Section */}
                  {result.error && (
                    <Box>
                      <Alert severity="error">
                        <Typography variant="body2">
                          {result.error}
                        </Typography>
                      </Alert>
                    </Box>
                  )}

                  {/* Metadata */}
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Details
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary="Project Name"
                          secondary={result.projectName || 'N/A'}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Total URLs"
                          secondary={result.totalUrls || '1'}
                        />
                      </ListItem>
                      {result.deepCapture && (
                        <ListItem>
                          <ListItemText
                            primary="Deep Capture"
                            secondary="Enabled"
                          />
                        </ListItem>
                      )}
                    </List>
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Paper>
    </Box>
  );
};

export default ResultsPanel; 