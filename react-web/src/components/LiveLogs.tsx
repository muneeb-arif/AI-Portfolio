import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Chip,
  Collapse,
  Alert,
  LinearProgress,
  Button,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Clear as ClearIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  BugReport as LogIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { config } from '../config';

interface LogEntry {
  type: 'log' | 'connection';
  message: string;
  level?: 'info' | 'success' | 'warning' | 'error';
  timestamp?: string;
}

interface LiveLogsProps {
  isProcessing: boolean;
}

const LiveLogs: React.FC<LiveLogsProps> = ({ isProcessing }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const logsContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  // Generate session ID on component mount
  useEffect(() => {
    const newSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    setSessionId(newSessionId);
  }, []);

  // Connect to log stream when component mounts
  useEffect(() => {
    if (sessionId) {
      connectToLogStream();
    }
    
    // Cleanup on unmount
    return () => {
      disconnectFromLogStream();
    };
  }, [sessionId]);

  const testConnection = async () => {
    try {
      console.log('🧪 Testing connection to backend...');
      const healthUrl = config.getApiUrl('/health');
      const sseUrl = config.getSseUrl(sessionId);
      
      const response = await fetch(healthUrl);
      const data = await response.json();
      console.log('🏥 Health check response:', data);
      
      addLog({
        type: 'log',
        message: `🧪 Health check: ${data.status}`,
        level: 'info',
        timestamp: new Date().toISOString()
      });

      // Test SSE connection manually
      console.log('🧪 Testing SSE connection manually...');
      const sseResponse = await fetch(sseUrl);
      console.log('📡 SSE response status:', sseResponse.status);
      console.log('📡 SSE response headers:', Object.fromEntries(sseResponse.headers.entries()));
      
      if (sseResponse.ok) {
        addLog({
          type: 'log',
          message: `🧪 SSE endpoint accessible (status: ${sseResponse.status})`,
          level: 'success',
          timestamp: new Date().toISOString()
        });
      } else {
        addLog({
          type: 'log',
          message: `🧪 SSE endpoint error (status: ${sseResponse.status})`,
          level: 'error',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('❌ Health check failed:', error);
      addLog({
        type: 'log',
        message: `❌ Health check failed: ${error}`,
        level: 'error',
        timestamp: new Date().toISOString()
      });
    }
  };

  const connectToLogStream = () => {
    console.log('🔗 Attempting to connect to log stream...');
    try {
      // Use config helper for server URL
      const logUrl = config.getSseUrl(sessionId);
      
      const eventSource = new EventSource(logUrl);
      console.log('📡 EventSource created:', eventSource);
      console.log('📡 EventSource readyState:', eventSource.readyState);
      console.log('🆔 Session ID:', sessionId);
      console.log('🌐 Server URL:', config.apiUrl || 'Using proxy');
      
      // Add more detailed event listeners
      eventSource.onopen = (event) => {
        console.log('✅ EventSource connection opened', event);
        console.log('📡 EventSource readyState after open:', eventSource.readyState);
        setIsConnected(true);
        addLog({
          type: 'log',
          message: '🔗 Connected to log stream',
          level: 'success',
          timestamp: new Date().toISOString()
        });
      };

      eventSource.onmessage = (event) => {
        console.log('📨 Received SSE message:', event.data);
        try {
          const data = JSON.parse(event.data);
          console.log('📋 Parsed log data:', data);
          if (data.type === 'connection') {
            setIsConnected(true);
            console.log('🆔 Session ID from server:', data.sessionId);
          } else if (data.type === 'log') {
            addLog({
              ...data,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Error parsing log data:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('❌ SSE connection error:', error);
        console.log('📡 EventSource readyState on error:', eventSource.readyState);
        setIsConnected(false);
        addLog({
          type: 'log',
          message: '❌ Lost connection to log stream',
          level: 'error',
          timestamp: new Date().toISOString()
        });
        eventSource.close();
        
        // Try to reconnect after 5 seconds
        setTimeout(() => {
          if (!isConnected) {
            console.log('🔄 Attempting to reconnect...');
            connectToLogStream();
          }
        }, 5000);
      };

      // Add a timeout to detect if connection never opens
      setTimeout(() => {
        if (eventSource.readyState === 0) { // CONNECTING
          console.log('⏰ EventSource connection timeout - still connecting');
          addLog({
            type: 'log',
            message: '⏰ Connection timeout - still trying to connect',
            level: 'warning',
            timestamp: new Date().toISOString()
          });
        }
      }, 10000);

      setEventSource(eventSource);
    } catch (error) {
      console.error('❌ Failed to connect to log stream:', error);
      addLog({
        type: 'log',
        message: '❌ Failed to connect to log stream',
        level: 'error',
        timestamp: new Date().toISOString()
      });
    }
  };

  const disconnectFromLogStream = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
      setIsConnected(false);
      addLog({
        type: 'log',
        message: '🔌 Disconnected from log stream',
        level: 'info',
        timestamp: new Date().toISOString()
      });
    }
  };

  const addLog = (logEntry: LogEntry) => {
    setLogs(prev => [...prev, logEntry]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const getLogLevelColor = (level?: string) => {
    switch (level) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  };

  const getLogLevelIcon = (level?: string) => {
    switch (level) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  return (
    <Paper elevation={2} sx={{ mb: 3 }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LogIcon color="primary" />
            <Typography variant="h6">Live Logs</Typography>
            <Chip
              label={isConnected ? 'Connected' : 'Disconnected'}
              color={isConnected ? 'success' : 'default'}
              size="small"
              variant="outlined"
            />
            {isProcessing && (
              <Chip
                label="Processing"
                color="primary"
                size="small"
                variant="outlined"
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={testConnection}
              variant="outlined"
            >
              Test Connection
            </Button>
            {isProcessing && (
              <LinearProgress sx={{ width: 100 }} />
            )}
            <IconButton
              onClick={() => setIsExpanded(!isExpanded)}
              size="small"
            >
              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <IconButton
              onClick={clearLogs}
              size="small"
              disabled={logs.length === 0}
            >
              <ClearIcon />
            </IconButton>
          </Box>
        </Box>
      </Box>

      <Collapse in={isExpanded}>
        <Box sx={{ maxHeight: 400, overflow: 'auto', p: 2, scrollBehavior: 'smooth' }} ref={logsContainerRef}>
          {logs.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
              <Typography variant="body2">
                {isProcessing 
                  ? 'Waiting for logs...' 
                  : 'No logs yet. Start processing to see live updates.'
                }
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {logs.map((log, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1,
                    p: 1,
                    borderRadius: 1,
                    backgroundColor: log.level === 'error' ? 'error.light' : 
                                   log.level === 'warning' ? 'warning.light' :
                                   log.level === 'success' ? 'success.light' : 'grey.50',
                    border: 1,
                    borderColor: log.level === 'error' ? 'error.main' : 
                                log.level === 'warning' ? 'warning.main' :
                                log.level === 'success' ? 'success.main' : 'grey.300',
                  }}
                >
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {getLogLevelIcon(log.level)}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontFamily: 'monospace',
                      flex: 1,
                      wordBreak: 'break-word'
                    }}
                  >
                    {log.message}
                  </Typography>
                  {log.timestamp && (
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default LiveLogs; 