// Configuration for API endpoints
export const config = {
  // API Server URL - can be overridden by environment variable
  apiUrl: process.env.REACT_APP_API_URL || '',
  
  // Helper function to get full API URL
  getApiUrl: (endpoint: string) => {
    const baseUrl = process.env.REACT_APP_API_URL || '';
    return baseUrl ? `${baseUrl}${endpoint}` : endpoint;
  },
  
  // Helper function to get SSE URL
  getSseUrl: (sessionId: string) => {
    const baseUrl = process.env.REACT_APP_API_URL || '';
    return baseUrl ? `${baseUrl}/api/logs?sessionId=${sessionId}` : `/api/logs?sessionId=${sessionId}`;
  }
}; 