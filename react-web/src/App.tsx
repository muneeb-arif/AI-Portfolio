import React, { useState } from 'react';
import {
  Box,
  CssBaseline,
  ThemeProvider,
  createTheme,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Container,
  Paper,
  Tabs,
  Tab,
  IconButton,
  useMediaQuery,
} from '@mui/material';
import {
  Web as WebIcon,
  Brush as FigmaIcon,
  PhoneAndroid as StoreIcon,
  Brightness4,
  Brightness7,
  Menu as MenuIcon,
} from '@mui/icons-material';
import WebScreenshots from './components/WebScreenshots';
import FigmaScreenshots from './components/FigmaScreenshots';
import StoreScreenshots from './components/StoreScreenshots';
import ResultsPanel from './components/ResultsPanel';

const drawerWidth = 240;

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`screenshot-tabpanel-${index}`}
      aria-labelledby={`screenshot-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [results, setResults] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const isMobile = useMediaQuery('(max-width:768px)');

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#2196f3',
      },
      secondary: {
        main: '#f50057',
      },
      background: {
        default: darkMode ? '#121212' : '#f5f5f5',
        paper: darkMode ? '#1e1e1e' : '#ffffff',
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

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleThemeToggle = () => {
    setDarkMode(!darkMode);
  };

  const handleResultsUpdate = (newResults: any[]) => {
    setResults(newResults);
  };

  const handleProcessingChange = (processing: boolean) => {
    setIsProcessing(processing);
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
          📸 Screenshot Tool
        </Typography>
      </Toolbar>
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={() => setTabValue(0)} selected={tabValue === 0}>
            <ListItemIcon>
              <WebIcon />
            </ListItemIcon>
            <ListItemText primary="Web Screenshots" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={() => setTabValue(1)} selected={tabValue === 1}>
            <ListItemIcon>
              <FigmaIcon />
            </ListItemIcon>
            <ListItemText primary="Figma Screenshots" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={() => setTabValue(2)} selected={tabValue === 2}>
            <ListItemIcon>
              <StoreIcon />
            </ListItemIcon>
            <ListItemText primary="App Store Screenshots" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        <AppBar
          position="fixed"
          sx={{
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            ml: { sm: `${drawerWidth}px` },
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
              Portfolio Screenshot Tool
            </Typography>
            <IconButton color="inherit" onClick={handleThemeToggle}>
              {darkMode ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Toolbar>
        </AppBar>

        <Box
          component="nav"
          sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        >
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true,
            }}
            sx={{
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
          >
            {drawer}
          </Drawer>
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', sm: 'block' },
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
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            mt: 8,
          }}
        >
          <Container maxWidth="xl">
            <Paper elevation={2} sx={{ mb: 3 }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                aria-label="screenshot tabs"
                sx={{ borderBottom: 1, borderColor: 'divider' }}
              >
                <Tab
                  icon={<WebIcon />}
                  label="Web Screenshots"
                  iconPosition="start"
                />
                <Tab
                  icon={<FigmaIcon />}
                  label="Figma Screenshots"
                  iconPosition="start"
                />
                <Tab
                  icon={<StoreIcon />}
                  label="App Store Screenshots"
                  iconPosition="start"
                />
              </Tabs>
            </Paper>

            <TabPanel value={tabValue} index={0}>
              <WebScreenshots
                onResultsUpdate={handleResultsUpdate}
                onProcessingChange={handleProcessingChange}
              />
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
              <FigmaScreenshots
                onResultsUpdate={handleResultsUpdate}
                onProcessingChange={handleProcessingChange}
              />
            </TabPanel>
            <TabPanel value={tabValue} index={2}>
              <StoreScreenshots
                onResultsUpdate={handleResultsUpdate}
                onProcessingChange={handleProcessingChange}
              />
            </TabPanel>

            <ResultsPanel
              results={results}
              isProcessing={isProcessing}
            />
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
