require('dotenv').config();

const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');

// Import screenshot functionality
const { processWebsiteAPI, validateUrls } = require('../screenshot-api');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-here';
const API_KEY = process.env.API_KEY || 'your-api-key-here';

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  }
});
app.use('/api/', limiter);

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      message: 'Please provide a valid JWT token in Authorization header'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        error: 'Invalid or expired token',
        message: 'Please obtain a new access token'
      });
    }
    req.user = user;
    next();
  });
};

// API Key Authentication for token generation
const authenticateAPIKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.body.apiKey;
  
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({
      error: 'Invalid API key',
      message: 'Please provide a valid API key'
    });
  }
  next();
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Portfolio Screenshot Tool API'
  });
});

// Generate JWT Token
app.post('/api/auth/token', authenticateAPIKey, (req, res) => {
  const { userId = 'default', expiresIn = '24h' } = req.body;
  
  const token = jwt.sign(
    { 
      userId, 
      timestamp: Date.now(),
      service: 'portfolio-screenshot-tool'
    }, 
    JWT_SECRET, 
    { expiresIn }
  );

  res.json({
    success: true,
    token,
    expiresIn,
    message: 'Token generated successfully'
  });
});

// Main Screenshot API Endpoint
app.post('/api/screenshot', authenticateToken, async (req, res) => {
  try {
    const { screenshots = false, analyze = false, urls } = req.body;

    // Validate required parameters
    if (!screenshots && !analyze) {
      return res.status(400).json({
        error: 'Invalid parameters',
        message: 'At least one of "screenshots" or "analyze" must be true'
      });
    }

    if (!urls) {
      return res.status(400).json({
        error: 'Missing URLs',
        message: 'Please provide URLs to process'
      });
    }

    // Parse URLs from different formats
    let urlList = [];
    
    if (typeof urls === 'string') {
      // Handle newline separated or comma separated
      if (urls.includes('\n')) {
        urlList = urls.split('\n').map(url => url.trim()).filter(url => url);
      } else if (urls.includes(',')) {
        urlList = urls.split(',').map(url => url.trim()).filter(url => url);
      } else {
        urlList = [urls.trim()];
      }
    } else if (Array.isArray(urls)) {
      urlList = urls.map(url => String(url).trim()).filter(url => url);
    } else {
      return res.status(400).json({
        error: 'Invalid URL format',
        message: 'URLs must be a string (newline/comma separated) or array'
      });
    }

    // Validate URLs
    const { valid: validUrls, invalid: invalidUrls } = validateUrls(urlList);
    
    if (validUrls.length === 0) {
      return res.status(400).json({
        error: 'No valid URLs',
        message: 'Please provide at least one valid URL',
        invalidUrls
      });
    }

    // Generate unique job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Start processing (async)
    const processingPromise = processWebsiteAPI({
      urls: validUrls,
      screenshots,
      analyze,
      jobId,
      userId: req.user.userId
    });

    // Return immediate response with job ID
    res.json({
      success: true,
      jobId,
      message: 'Processing started',
      validUrls,
      invalidUrls,
      options: {
        screenshots,
        analyze,
        urlCount: validUrls.length
      },
      estimatedTime: `${validUrls.length * 30} seconds`
    });

    // Process in background
    processingPromise.catch(error => {
      console.error(`Job ${jobId} failed:`, error);
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Job Status Check
app.get('/api/job/:jobId', authenticateToken, (req, res) => {
  const { jobId } = req.params;
  
  // Check if job results exist
  const resultsPath = path.join(__dirname, 'screenshots', 'api-results', `${jobId}.json`);
  
  if (fs.existsSync(resultsPath)) {
    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    res.json({
      success: true,
      status: 'completed',
      results
    });
  } else {
    res.json({
      success: true,
      status: 'processing',
      message: 'Job is still processing, please check again later'
    });
  }
});

// List Recent Jobs
app.get('/api/jobs', authenticateToken, (req, res) => {
  const resultsDir = path.join(__dirname, 'screenshots', 'api-results');
  
  if (!fs.existsSync(resultsDir)) {
    return res.json({
      success: true,
      jobs: []
    });
  }

  const jobFiles = fs.readdirSync(resultsDir)
    .filter(file => file.endsWith('.json'))
    .map(file => {
      const jobId = file.replace('.json', '');
      const filePath = path.join(resultsDir, file);
      const stats = fs.statSync(filePath);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      return {
        jobId,
        createdAt: stats.birthtime,
        completedAt: stats.mtime,
        urlCount: data.results?.length || 0,
        status: 'completed'
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 50); // Last 50 jobs

  res.json({
    success: true,
    jobs: jobFiles
  });
});

// API Documentation
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Portfolio Screenshot Tool API',
    version: '1.0.0',
    documentation: {
      authentication: {
        method: 'JWT Bearer Token',
        getToken: {
          endpoint: 'POST /api/auth/token',
          headers: { 'x-api-key': 'your-api-key' },
          body: { userId: 'optional', expiresIn: '24h' }
        }
      },
      endpoints: {
        '/api/screenshot': {
          method: 'POST',
          description: 'Process websites for screenshots and/or analysis',
          headers: { 'Authorization': 'Bearer JWT_TOKEN' },
          body: {
            screenshots: 'boolean - whether to take screenshots',
            analyze: 'boolean - whether to analyze with AI',
            urls: 'string|array - URLs to process (newline/comma separated or array)'
          }
        },
        '/api/job/:jobId': {
          method: 'GET',
          description: 'Check status of a processing job'
        },
        '/api/jobs': {
          method: 'GET',
          description: 'List recent jobs'
        }
      }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested endpoint does not exist',
    availableEndpoints: [
      'GET /health',
      'POST /api/auth/token',
      'POST /api/screenshot',
      'GET /api/job/:jobId',
      'GET /api/jobs',
      'GET /api/docs'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 Portfolio Screenshot Tool API Server Started

📍 Server: http://localhost:${PORT}
📚 API Docs: http://localhost:${PORT}/api/docs
🏥 Health Check: http://localhost:${PORT}/health

🔐 Authentication:
1. Get token: POST /api/auth/token (with x-api-key header)
2. Use token: Authorization: Bearer <token>

⚙️ Environment Variables Required:
- API_KEY: ${process.env.API_KEY ? '✅ Set' : '❌ Missing'}
- JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Missing'}
- OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}
`);
});

module.exports = app; 