import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Chip,
  Paper,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  Web as WebIcon,
  Brush as FigmaIcon,
  PhoneAndroid as StoreIcon,
  Folder as FolderIcon,
  ZoomIn as ZoomInIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';

interface ProjectData {
  id: string;
  title: string;
  url: string;
  description: string;
  platform: 'web' | 'figma' | 'store';
  images: string[];
  keyFeatures?: string[];
  folderPath: string;
  timestamp: number;
  analysis?: {
    shortDescription?: string;
    detailedDescription?: string;
    keyFeatures?: string[];
    techStack?: string;
    isAnalyzed: boolean;
  };
}

interface GalleryProps {
  onResultsUpdate?: (results: any[]) => void;
  onProcessingChange?: (processing: boolean) => void;
  sessionId?: string;
}

const Gallery: React.FC<GalleryProps> = () => {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<ProjectData | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/gallery');
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gallery API error:', response.status, errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (err) {
      console.error('Gallery load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectClick = (project: ProjectData) => {
    setSelectedProject(project);
    setCurrentImageIndex(0);
  };

  const handleCloseDialog = () => {
    setSelectedProject(null);
    setCurrentImageIndex(0);
  };

  const handleNextImage = () => {
    if (selectedProject) {
      setCurrentImageIndex((prev) => 
        prev === selectedProject.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const handlePrevImage = () => {
    if (selectedProject) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? selectedProject.images.length - 1 : prev - 1
      );
    }
  };

  const handleImageClick = () => {
    if (selectedProject) {
      setFullscreenImage(selectedProject.images[currentImageIndex]);
    }
  };

  const handleCloseFullscreen = () => {
    setFullscreenImage(null);
  };

  const handleDownloadImage = () => {
    if (selectedProject) {
      const imageUrl = selectedProject.images[currentImageIndex];
      // Convert relative URL to absolute URL using the server
      const fullImageUrl = `http://localhost:9000${imageUrl}`;
      
      // Fetch the image as blob and then download
      fetch(fullImageUrl)
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to fetch image');
          }
          return response.blob();
        })
        .then(blob => {
          // Create blob URL and download
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          
          // Extract file extension from URL
          const urlParts = imageUrl.split('.');
          const extension = urlParts[urlParts.length - 1] || 'jpg';
          link.download = `project-image-${currentImageIndex + 1}.${extension}`;
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up blob URL
          window.URL.revokeObjectURL(blobUrl);
        })
        .catch(error => {
          console.error('Download failed:', error);
          alert('Failed to download image. Please try again.');
        });
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'web':
        return <WebIcon />;
      case 'figma':
        return <FigmaIcon />;
      case 'store':
        return <StoreIcon />;
      default:
        return <FolderIcon />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'web':
        return '#2196f3';
      case 'figma':
        return '#f50057';
      case 'store':
        return '#4caf50';
      default:
        return '#757575';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%' }}>
        <LinearProgress />
        <Typography variant="body1" sx={{ mt: 2, textAlign: 'center' }}>
          Loading projects...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Project Gallery
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Browse all your processed projects and screenshots
        </Typography>
      </Box>

      {projects.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <FolderIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No projects found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Start by processing some URLs to see them appear here
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(4, 1fr)'
          },
          gap: 3 
        }}>
          {projects.map((project) => (
            <Card 
              key={project.id}
              sx={{ 
                height: '100%', 
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
              onClick={() => handleProjectClick(project)}
            >
              <CardMedia
                component="img"
                height="200"
                image={project.images[0] || '/placeholder-image.jpg'}
                alt={project.title}
                sx={{ objectFit: 'cover' }}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ 
                    color: getPlatformColor(project.platform),
                    mr: 1,
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    {getPlatformIcon(project.platform)}
                  </Box>
                  <Chip 
                    label={project.platform.toUpperCase()} 
                    size="small" 
                    sx={{ 
                      backgroundColor: getPlatformColor(project.platform),
                      color: 'white',
                      fontSize: '0.7rem'
                    }} 
                  />
                </Box>
                <Typography variant="h6" component="h3" gutterBottom noWrap>
                  {project.title}
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    mb: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {project.description}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {formatDate(project.timestamp)}
                </Typography>
                <Typography 
                  variant="caption" 
                  color="primary" 
                  sx={{ 
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {project.url}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Project Detail Dialog */}
      <Dialog
        open={!!selectedProject}
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        {selectedProject && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <Box sx={{ 
                    color: getPlatformColor(selectedProject.platform),
                    mr: 1,
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    {getPlatformIcon(selectedProject.platform)}
                  </Box>
                  <Typography variant="h6" component="span">
                    {selectedProject.title}
                  </Typography>
                </Box>
                <IconButton onClick={handleCloseDialog}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            
            <DialogContent sx={{ p: 0 }}>
              <Box sx={{ position: 'relative' }}>
                {/* Image Slider */}
                <Box sx={{ position: 'relative', height: 400 }}>
                  <img
                    src={selectedProject.images[currentImageIndex]}
                    alt={`${selectedProject.title} - ${currentImageIndex + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      backgroundColor: '#f5f5f5',
                      cursor: 'pointer'
                    }}
                    onClick={handleImageClick}
                  />
                  
                  {/* Image Action Buttons */}
                  <Box sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    display: 'flex',
                    gap: 1
                  }}>
                    <IconButton
                      onClick={handleImageClick}
                      sx={{
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        color: 'white',
                        '&:hover': {
                          backgroundColor: 'rgba(0,0,0,0.7)',
                        }
                      }}
                    >
                      <ZoomInIcon />
                    </IconButton>
                    <IconButton
                      onClick={handleDownloadImage}
                      sx={{
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        color: 'white',
                        '&:hover': {
                          backgroundColor: 'rgba(0,0,0,0.7)',
                        }
                      }}
                    >
                      <DownloadIcon />
                    </IconButton>
                  </Box>
                  
                  {/* Navigation Arrows */}
                  {selectedProject.images.length > 1 && (
                    <>
                      <IconButton
                        onClick={handlePrevImage}
                        sx={{
                          position: 'absolute',
                          left: 8,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          color: 'white',
                          '&:hover': {
                            backgroundColor: 'rgba(0,0,0,0.7)',
                          }
                        }}
                      >
                        <NavigateBeforeIcon />
                      </IconButton>
                      <IconButton
                        onClick={handleNextImage}
                        sx={{
                          position: 'absolute',
                          right: 8,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          color: 'white',
                          '&:hover': {
                            backgroundColor: 'rgba(0,0,0,0.7)',
                          }
                        }}
                      >
                        <NavigateNextIcon />
                      </IconButton>
                    </>
                  )}
                  
                  {/* Image Counter */}
                  <Box sx={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontSize: '0.875rem'
                  }}>
                    {currentImageIndex + 1} / {selectedProject.images.length}
                  </Box>
                </Box>

                {/* Project Details */}
                <Box sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Chip 
                      label={selectedProject.platform.toUpperCase()} 
                      sx={{ 
                        backgroundColor: getPlatformColor(selectedProject.platform),
                        color: 'white',
                        mr: 2
                      }} 
                    />
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(selectedProject.timestamp)}
                    </Typography>
                  </Box>

                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                    {selectedProject.analysis?.isAnalyzed && selectedProject.analysis.shortDescription 
                      ? selectedProject.analysis.shortDescription 
                      : selectedProject.title}
                  </Typography>
                  
                  <Typography 
                    variant="body2" 
                    sx={{ mb: 2 }}
                  >
                    <a 
                      href={selectedProject.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ 
                        color: '#1976d2', 
                        textDecoration: 'none',
                        wordBreak: 'break-all'
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLAnchorElement).style.textDecoration = 'underline';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLAnchorElement).style.textDecoration = 'none';
                      }}
                    >
                      {selectedProject.url}
                    </a>
                  </Typography>

                  {selectedProject.analysis?.isAnalyzed ? (
                    <>
                      <Typography variant="body1" paragraph>
                        {selectedProject.analysis.detailedDescription || selectedProject.description}
                      </Typography>
                      
                      {selectedProject.analysis.techStack && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                            Tech Stack:
                          </Typography>
                          <Typography variant="body1" paragraph>
                            {selectedProject.analysis.techStack}
                          </Typography>
                        </Box>
                      )}
                    </>
                  ) : (
                    <>
                      <Typography variant="body1" paragraph>
                        {selectedProject.description}
                      </Typography>
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          This project hasn't been analyzed yet. Run analysis to get detailed insights about the project.
                        </Typography>
                      </Alert>
                    </>
                  )}

                  {selectedProject.keyFeatures && selectedProject.keyFeatures.length > 0 && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                        Key Features:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {selectedProject.keyFeatures.map((feature, index) => (
                          <Chip
                            key={index}
                            label={feature}
                            size="small"
                            variant="outlined"
                            sx={{ 
                              fontSize: '0.875rem',
                              height: '28px'
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
              <Button onClick={handleCloseDialog}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Fullscreen Image Dialog */}
      <Dialog
        open={!!fullscreenImage}
        onClose={handleCloseFullscreen}
        maxWidth={false}
        fullWidth
        PaperProps={{
          sx: { 
            backgroundColor: 'rgba(0,0,0,0.9)',
            boxShadow: 'none',
            borderRadius: 0
          }
        }}
      >
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          <IconButton
            onClick={handleCloseFullscreen}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              zIndex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.7)',
              }
            }}
          >
            <CloseIcon />
          </IconButton>
          
          <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '80vh',
            p: 2
          }}>
            <img
              src={fullscreenImage || ''}
              alt="Fullscreen view"
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain'
              }}
            />
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Gallery; 