import React, { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Container,
  Paper,
  Tabs,
  Tab,
  Divider,
  ThemeProvider,
  createTheme,
  CssBaseline,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Web as WebIcon,
  Brush as FigmaIcon,
  PhoneAndroid as StoreIcon,
  BugReport as LogIcon,
  PhotoLibrary as GalleryIcon,
} from '@mui/icons-material';
import WebScreenshots from './components/WebScreenshots';
import FigmaScreenshots from './components/FigmaScreenshots';
import StoreScreenshots from './components/StoreScreenshots';
import Gallery from './components/Gallery';
import ResultsPanel from './components/ResultsPanel';
import LiveLogs from './components/LiveLogs';

const drawerWidth = 240;

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#2196f3',
    },
    secondary: {
      main: '#f50057',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [results, setResults] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');

  // Generate session ID on app mount
  React.useEffect(() => {
    const newSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    setSessionId(newSessionId);
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleResultsUpdate = (newResults: any[]) => {
    setResults(prev => [...prev, ...newResults]);
  };

  const handleProcessingChange = (processing: boolean) => {
    setIsProcessing(processing);
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Portfolio Tool
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={() => setActiveTab(0)} selected={activeTab === 0}>
            <ListItemIcon>
              <WebIcon />
            </ListItemIcon>
            <ListItemText primary="Web Screenshots" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={() => setActiveTab(1)} selected={activeTab === 1}>
            <ListItemIcon>
              <FigmaIcon />
            </ListItemIcon>
            <ListItemText primary="Figma Screenshots" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={() => setActiveTab(2)} selected={activeTab === 2}>
            <ListItemIcon>
              <StoreIcon />
            </ListItemIcon>
            <ListItemText primary="App Store Screenshots" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={() => setActiveTab(3)} selected={activeTab === 3}>
            <ListItemIcon>
              <GalleryIcon />
            </ListItemIcon>
            <ListItemText primary="Gallery" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 0:
        return (
          <WebScreenshots
            onResultsUpdate={handleResultsUpdate}
            onProcessingChange={handleProcessingChange}
            sessionId={sessionId}
          />
        );
      case 1:
        return (
          <FigmaScreenshots
            onResultsUpdate={handleResultsUpdate}
            onProcessingChange={handleProcessingChange}
            sessionId={sessionId}
          />
        );
      case 2:
        return (
          <StoreScreenshots
            onResultsUpdate={handleResultsUpdate}
            onProcessingChange={handleProcessingChange}
            sessionId={sessionId}
          />
        );
      case 3:
        return (
          <Gallery
            onResultsUpdate={handleResultsUpdate}
            onProcessingChange={handleProcessingChange}
            sessionId={sessionId}
          />
        );
      default:
        return null;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        <AppBar
          position="fixed"
          sx={{
            width: { md: `calc(100% - ${drawerWidth}px)` },
            ml: { md: `${drawerWidth}px` },
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div">
              Portfolio Screenshot Tool
            </Typography>
          </Toolbar>
        </AppBar>

        <Box
          component="nav"
          sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        >
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true,
            }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
          >
            {drawer}
          </Drawer>
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', md: 'block' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { md: `calc(100% - ${drawerWidth}px)` },
            mt: 8,
          }}
        >
          <Container maxWidth="lg">
            {/* Main title and description - Hide on Gallery page */}
            {activeTab !== 3 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                  Portfolio Screenshot Tool
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Capture screenshots and analyze web pages, Figma designs, and app store listings
                </Typography>
              </Box>
            )}

            {/* Live Logs Component - Hide on Gallery page */}
            {activeTab !== 3 && <LiveLogs isProcessing={isProcessing} />}

            {/* Mobile Tabs */}
            <Paper sx={{ display: { xs: 'block', md: 'none' }, mb: 3 }}>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ borderBottom: 1, borderColor: 'divider' }}
              >
                <Tab icon={<WebIcon />} label="Web" />
                <Tab icon={<FigmaIcon />} label="Figma" />
                <Tab icon={<StoreIcon />} label="Store" />
                <Tab icon={<GalleryIcon />} label="Gallery" />
              </Tabs>
            </Paper>

            {/* Desktop Content */}
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              {renderActiveComponent()}
            </Box>

            {/* Mobile Content */}
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              {renderActiveComponent()}
            </Box>

            {/* Results Panel - Hide on Gallery page */}
            {results.length > 0 && activeTab !== 3 && (
              <ResultsPanel results={results} isProcessing={isProcessing} />
            )}
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
