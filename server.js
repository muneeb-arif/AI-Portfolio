require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const OpenAI = require('openai');

// Import existing functionality
const {
  sanitizeFolderName,
  validateUrls,
  getInternalLinksAPI,
  takeScreenshotAPI,
  analyzeHomepageScreenshotAPI,
  findHomepageScreenshot,
  DEFAULT_CONFIG
} = require('./screenshot-api');

// Import Figma functionality
const figmaCapture = require('./figma-api-capture');
const appStoreExtractor = require('./app-info-extractor');

const app = express();
app.use(express.json());
app.use(cors());

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Store active SSE connections with session tracking
const sseConnections = new Map(); // sessionId -> { res, timestamp }

// Generate unique session ID
function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// SSE endpoint for real-time logging
app.get('/api/logs', (req, res) => {
  const sessionId = req.query.sessionId || generateSessionId();
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection message with session ID
  res.write(`data: ${JSON.stringify({ 
    type: 'connection', 
    message: 'Connected to log stream',
    sessionId: sessionId
  })}\n\n`);

  // Add this connection to the map with session tracking
  sseConnections.set(sessionId, {
    res: res,
    timestamp: Date.now()
  });

  // Remove connection when client disconnects
  req.on('close', () => {
    sseConnections.delete(sessionId);
    console.log(`🔌 Client disconnected: ${sessionId}`);
  });

  // Clean up old connections (older than 1 hour)
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [id, connection] of sseConnections.entries()) {
    if (connection.timestamp < oneHourAgo) {
      sseConnections.delete(id);
      console.log(`🧹 Cleaned up old connection: ${id}`);
    }
  }
});

// Function to send log messages to specific session or all sessions
function sendLogToClients(logData, sessionId = null) {
  const message = `data: ${JSON.stringify(logData)}\n\n`;
  
  if (sessionId) {
    // Send to specific session only
    const connection = sseConnections.get(sessionId);
    if (connection) {
      try {
        connection.res.write(message);
      } catch (error) {
        console.error(`❌ Failed to send log to session ${sessionId}:`, error.message);
        sseConnections.delete(sessionId);
      }
    }
  } else {
    // Send to all sessions (for system-wide messages)
    for (const [id, connection] of sseConnections.entries()) {
      try {
        connection.res.write(message);
      } catch (error) {
        console.error(`❌ Failed to send log to session ${id}:`, error.message);
        sseConnections.delete(id);
      }
    }
  }
}

// Utility functions
function getRandomDelay() {
  return Math.floor(Math.random() * (10000 - 5000 + 1)) + 5000; // 5-10 seconds
}

function extractProjectName(url, type) {
  try {
    const urlObj = new URL(url);
    
    switch (type) {
      case 'figma':
        // Extract from Figma URL: figma.com/file/KEY/NAME
        const figmaMatch = url.match(/figma\.com\/(?:file|proto|design)\/[^\/]+\/([^\/\?]+)/);
        return figmaMatch ? figmaMatch[1].replace(/[^\w]/g, '_') : 'figma_project';
      
      case 'stores':
        // Extract from app store URLs
        if (url.includes('play.google.com')) {
          const playMatch = url.match(/id=([\w\.]+)/);
          return playMatch ? `playstore_${playMatch[1]}` : 'playstore_app';
        } else if (url.includes('apps.apple.com')) {
          const appleMatch = url.match(/id(\d+)/);
          return appleMatch ? `appstore_${appleMatch[1]}` : 'appstore_app';
        }
        return 'store_app';
      
      case 'web':
      default:
        // Extract domain name for web URLs
        let domain = urlObj.hostname.replace(/^www\./, '');
        domain = domain.replace(/\.[a-z]{2,}.*$/, '');
        return domain.replace(/[^\w]/g, '_');
    }
  } catch (error) {
    return 'unknown_project';
  }
}

async function analyzeUrlWithOpenAI(url, type) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `Analyze this ${type} URL: ${url}

Please provide a comprehensive analysis in the following format:

SHORT DESCRIPTION:
[Provide a concise 2-line description of what this ${type} URL represents]

DETAILED DESCRIPTION:
[Provide 5-10 detailed paragraphs covering:
- Purpose and functionality
- Target audience
- Key features and capabilities
- Design and user experience
- Business model (if applicable)
- Technical implementation
- Market positioning
- Unique selling points
- User engagement strategies
- Overall quality assessment]

KEY FEATURES:
[List 5-10 key features in bullet points]

TECH STACK:
[Identify the technologies, frameworks, platforms, and tools used]`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.7
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI analysis error:', error);
    throw new Error(`Failed to analyze URL: ${error.message}`);
  }
}

async function saveAnalysisToFile(analysis, url, projectName, type) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const analysisDir = path.join(__dirname, 'screenshots', type, projectName);
  
  if (!fs.existsSync(analysisDir)) {
    fs.mkdirSync(analysisDir, { recursive: true });
  }

  const analysisFile = path.join(analysisDir, `analysis_${timestamp}.txt`);
  const content = `URL: ${url}
Type: ${type}
Project: ${projectName}
Analyzed: ${new Date().toISOString()}

${analysis}

---
Generated by Portfolio Screenshot Tool API
`;

  fs.writeFileSync(analysisFile, content);
  return analysisFile;
}

// API 1: Web URLs Screenshot API
app.post('/api/web-screenshots', async (req, res) => {
  try {
    const { urls, analyze = false, deep_capture = false, capture = true, sessionId } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'URLs array is required and must not be empty' });
    }

    const results = [];
    const puppeteer = require("puppeteer-extra");
    const StealthPlugin = require("puppeteer-extra-plugin-stealth");
    puppeteer.use(StealthPlugin());

    const browser = await puppeteer.launch({ 
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ],
      timeout: 120000 // 2 minutes timeout
    });

    try {
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        const logMessage = `🌐 Processing web URL ${i + 1}/${urls.length}: ${url}`;
        console.log(logMessage);
        sendLogToClients({ type: 'log', message: logMessage, level: 'info' }, sessionId);

        const projectName = extractProjectName(url, 'web');
        const outputDir = path.join(__dirname, 'screenshots', 'web', projectName);
        
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        // Get internal links if deep capture is enabled
        let allUrls = [url];
        if (deep_capture) {
          const deepCaptureLog = `🔍 Deep capture enabled - fetching internal links for ${url}`;
          console.log(deepCaptureLog);
          sendLogToClients({ type: 'log', message: deepCaptureLog, level: 'info' }, sessionId);
          
          try {
            const internalLinks = await getInternalLinksAPI(url);
            const foundLinksLog = `📄 Found ${internalLinks.length} internal links:`;
            console.log(foundLinksLog);
            sendLogToClients({ type: 'log', message: foundLinksLog, level: 'info' }, sessionId);
            
            internalLinks.forEach((link, index) => {
              const linkLog = `   ${index + 1}. ${link}`;
              console.log(linkLog);
              sendLogToClients({ type: 'log', message: linkLog, level: 'info' }, sessionId);
            });
            
            allUrls = Array.from(new Set([url, ...internalLinks.slice(0, 10)])); // Limit to 10 internal links
            const willCaptureLog = `📄 Will capture ${allUrls.length} unique URLs:`;
            console.log(willCaptureLog);
            sendLogToClients({ type: 'log', message: willCaptureLog, level: 'info' }, sessionId);
            
            allUrls.forEach((link, index) => {
              const urlLog = `   ${index + 1}. ${link}`;
              console.log(urlLog);
              sendLogToClients({ type: 'log', message: urlLog, level: 'info' }, sessionId);
            });
          } catch (error) {
            const errorLog = `⚠️ Failed to fetch internal links: ${error.message}`;
            console.log(errorLog);
            sendLogToClients({ type: 'log', message: errorLog, level: 'warning' }, sessionId);
          }
        }

        // Take screenshots for all URLs (only if capture is true)
        const screenshotResults = [];
        if (capture) {
          for (let j = 0; j < allUrls.length; j++) {
            const screenshotUrl = allUrls[j];
            const captureLog = `   📸 Capturing: ${screenshotUrl}`;
            console.log(captureLog);
            sendLogToClients({ type: 'log', message: captureLog, level: 'info' }, sessionId);
            
            // Add 5-second delay before capturing each URL
            if (j > 0) {
              const delayLog = `   ⏳ Waiting 5 seconds before capturing next URL...`;
              console.log(delayLog);
              sendLogToClients({ type: 'log', message: delayLog, level: 'info' }, sessionId);
              await new Promise(resolve => setTimeout(resolve, 5000));
            }
            
            const screenshotResult = await takeScreenshotAPI(browser, screenshotUrl, outputDir, (logData) => sendLogToClients(logData, sessionId));
            screenshotResults.push({
              url: screenshotUrl,
              success: screenshotResult.success,
              fullPage: screenshotResult.fullPageFile,
              viewport: screenshotResult.viewportFile,
              error: screenshotResult.error
            });
          }
        } else {
          const skipLog = `   ⏭️ Skipping screenshot capture (capture=false)`;
          console.log(skipLog);
          sendLogToClients({ type: 'log', message: skipLog, level: 'info' }, sessionId);
          // Add placeholder results for URLs without capturing
          allUrls.forEach(screenshotUrl => {
            screenshotResults.push({
              url: screenshotUrl,
              success: false,
              fullPage: null,
              viewport: null,
              error: 'Screenshot capture disabled'
            });
          });
        }
        
        let analysisResult = null;
        let analysisFile = null;

        // Analyze if requested (only analyze the main URL)
        if (analyze) {
          const analyzeLog = `🤖 Analyzing web URL: ${url}`;
          console.log(analyzeLog);
          sendLogToClients({ type: 'log', message: analyzeLog, level: 'info' }, sessionId);
          analysisResult = await analyzeUrlWithOpenAI(url, 'web');
          analysisFile = await saveAnalysisToFile(analysisResult, url, projectName, 'web');
          const analyzeCompleteLog = `🤖 Analyzing Completed.`;
          console.log(analyzeCompleteLog);
          sendLogToClients({ type: 'log', message: analyzeCompleteLog, level: 'success' }, sessionId);
        }

        results.push({
          url,
          projectName,
          deepCapture: deep_capture,
          totalUrls: allUrls.length,
          screenshots: screenshotResults,
          analysis: analysisResult,
          analysisFile: analysisFile,
          success: screenshotResults.some(r => r.success),
          error: screenshotResults.every(r => !r.success) ? 'All screenshots failed' : null
        });

        // Random delay between URLs (except for the last one)
        if (i < urls.length - 1) {
          const delay = getRandomDelay();
          const delayLog = `⏳ Waiting ${delay/1000} seconds before next URL...`;
          console.log(delayLog);
          sendLogToClients({ type: 'log', message: delayLog, level: 'info' }, sessionId);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    } finally {
      await browser.close();
    }

    const finishLog = `Finished.`;
    console.log(finishLog);
    sendLogToClients({ type: 'log', message: finishLog, level: 'success' }, sessionId);

    res.json({
      success: true,
      message: `Processed ${urls.length} web URLs`,
      results,
      summary: {
        total: urls.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });

  } catch (error) {
    console.error('Web screenshots API error:', error);
    const errorLog = `❌ Web screenshots API error: ${error.message}`;
    sendLogToClients({ type: 'log', message: errorLog, level: 'error' }, sessionId);
    res.status(500).json({ error: error.message });
  }
});

// API 2: Figma URLs Screenshot API
app.post('/api/figma-screenshots', async (req, res) => {
  try {
    const { urls, analyze = false, capture = true, sessionId } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'URLs array is required and must not be empty' });
    }

    const results = [];
    const puppeteer = require("puppeteer-extra");
    const StealthPlugin = require("puppeteer-extra-plugin-stealth");
    puppeteer.use(StealthPlugin());

    const browser = await puppeteer.launch({ 
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ],
      timeout: 120000 // 2 minutes timeout
    });

    try {
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        const logMessage = `🎨 Processing Figma URL ${i + 1}/${urls.length}: ${url}`;
        console.log(logMessage);
        sendLogToClients({ type: 'log', message: logMessage, level: 'info' }, sessionId);

        const projectName = extractProjectName(url, 'figma');
        const outputDir = path.join(__dirname, 'screenshots', 'figma', projectName);
        
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        // Take Figma screenshot (only if capture is true)
        let screenshotResult = { success: false, filePath: null, error: 'Screenshot capture disabled' };
        if (capture) {
          screenshotResult = await figmaCapture.captureFigma(url, outputDir);
        } else {
          const skipLog = `   ⏭️ Skipping Figma screenshot capture (capture=false)`;
          console.log(skipLog);
          sendLogToClients({ type: 'log', message: skipLog, level: 'info' }, sessionId);
        }
        
        let analysisResult = null;
        let analysisFile = null;

        // Analyze if requested
        if (analyze) {
          const analyzeLog = `🤖 Analyzing Figma URL: ${url}`;
          console.log(analyzeLog);
          sendLogToClients({ type: 'log', message: analyzeLog, level: 'info' }, sessionId);
          analysisResult = await analyzeUrlWithOpenAI(url, 'figma');
          analysisFile = await saveAnalysisToFile(analysisResult, url, projectName, 'figma');
          const analyzeCompleteLog = `🤖 Analyzing Completed.`;
          console.log(analyzeCompleteLog);
          sendLogToClients({ type: 'log', message: analyzeCompleteLog, level: 'success' }, sessionId);
        }

        results.push({
          url,
          projectName,
          screenshot: screenshotResult.success ? {
            file: screenshotResult.filePath
          } : null,
          analysis: analysisResult,
          analysisFile: analysisFile,
          success: screenshotResult.success,
          error: screenshotResult.error
        });

        // Random delay between URLs (except for the last one)
        if (i < urls.length - 1) {
          const delay = getRandomDelay();
          const delayLog = `⏳ Waiting ${delay/1000} seconds before next URL...`;
          console.log(delayLog);
          sendLogToClients({ type: 'log', message: delayLog, level: 'info' }, sessionId);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    } finally {
      await browser.close();
    }

    const finishLog = `Finished.`;
    console.log(finishLog);
    sendLogToClients({ type: 'log', message: finishLog, level: 'success' }, sessionId);

    res.json({
      success: true,
      message: `Processed ${urls.length} Figma URLs`,
      results,
      summary: {
        total: urls.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });

  } catch (error) {
    console.error('Figma screenshots API error:', error);
    const errorLog = `❌ Figma screenshots API error: ${error.message}`;
    sendLogToClients({ type: 'log', message: errorLog, level: 'error' }, sessionId);
    res.status(500).json({ error: error.message });
  }
});

// API 3: App Store URLs Screenshot API
app.post('/api/store-screenshots', async (req, res) => {
  try {
    const { urls, analyze = false, capture = true, sessionId } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'URLs array is required and must not be empty' });
    }

    const results = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const logMessage = `📱 Processing store URL ${i + 1}/${urls.length}: ${url}`;
      console.log(logMessage);
      sendLogToClients({ type: 'log', message: logMessage, level: 'info' }, sessionId);

      const projectName = extractProjectName(url, 'stores');
      const outputDir = path.join(__dirname, 'screenshots', 'stores', projectName);
      
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Extract app store data (only if capture is true)
      let storeResult = { success: false, screenshots: null, info: null, error: 'Screenshot capture disabled' };
      if (capture) {
        try {
          const captureLog = `   📱 Extracting app store data...`;
          console.log(captureLog);
          sendLogToClients({ type: 'log', message: captureLog, level: 'info' }, sessionId);
          
          storeResult = await appStoreExtractor.handleStoreUrl(url, outputDir);
          
          if (storeResult.success) {
            const successLog = `   ✅ App store data extracted successfully`;
            console.log(successLog);
            sendLogToClients({ type: 'log', message: successLog, level: 'success' }, sessionId);
            
            if (storeResult.screenshots && storeResult.screenshots.length > 0) {
              const screenshotsLog = `   📸 Downloaded ${storeResult.screenshots.length} screenshots`;
              console.log(screenshotsLog);
              sendLogToClients({ type: 'log', message: screenshotsLog, level: 'info' }, sessionId);
            } else {
              const noScreenshotsLog = `   ⚠️ No screenshots found or downloaded`;
              console.log(noScreenshotsLog);
              sendLogToClients({ type: 'log', message: noScreenshotsLog, level: 'warning' }, sessionId);
            }
          } else {
            const errorLog = `   ❌ App store extraction failed: ${storeResult.error}`;
            console.log(errorLog);
            sendLogToClients({ type: 'log', message: errorLog, level: 'error' }, sessionId);
          }
        } catch (error) {
          const errorLog = `   ❌ App store extraction error: ${error.message}`;
          console.log(errorLog);
          sendLogToClients({ type: 'log', message: errorLog, level: 'error' }, sessionId);
          storeResult = { success: false, error: error.message };
        }
      } else {
        const skipLog = `   ⏭️ Skipping store screenshot capture (capture=false)`;
        console.log(skipLog);
        sendLogToClients({ type: 'log', message: skipLog, level: 'info' }, sessionId);
      }
    
      let analysisResult = null;
      let analysisFile = null;

      // Analyze if requested
      if (analyze) {
        const analyzeLog = `🤖 Analyzing store URL: ${url}`;
        console.log(analyzeLog);
        sendLogToClients({ type: 'log', message: analyzeLog, level: 'info' }, sessionId);
        analysisResult = await analyzeUrlWithOpenAI(url, 'app store');
        analysisFile = await saveAnalysisToFile(analysisResult, url, projectName, 'stores');
        const analyzeCompleteLog = `🤖 Analyzing Completed.`;
        console.log(analyzeCompleteLog);
        sendLogToClients({ type: 'log', message: analyzeCompleteLog, level: 'success' }, sessionId);
      }

      results.push({
        url,
        projectName,
        screenshots: storeResult.success ? storeResult.screenshots : null,
        info: storeResult.success ? storeResult.info : null,
        analysis: analysisResult,
        analysisFile: analysisFile,
        success: storeResult.success,
        error: storeResult.error
      });

      // Random delay between URLs (except for the last one)
      if (i < urls.length - 1) {
        const delay = getRandomDelay();
        const delayLog = `⏳ Waiting ${delay/1000} seconds before next URL...`;
        console.log(delayLog);
        sendLogToClients({ type: 'log', message: delayLog, level: 'info' }, sessionId);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    const finishLog = `Finished.`;
    console.log(finishLog);
    sendLogToClients({ type: 'log', message: finishLog, level: 'success' }, sessionId);

    res.json({
      success: true,
      message: `Processed ${urls.length} store URLs`,
      results,
      summary: {
        total: urls.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });

  } catch (error) {
    console.error('Store screenshots API error:', error);
    const errorLog = `❌ Store screenshots API error: ${error.message}`;
    sendLogToClients({ type: 'log', message: errorLog, level: 'error' }, sessionId);
    res.status(500).json({ error: error.message });
  }
});

// Gallery API endpoint
app.get('/api/gallery', (req, res) => {
  try {
    const projects = [];
    const screenshotsDir = path.join(__dirname, 'screenshots');
    
    // Check if screenshots directory exists
    if (!fs.existsSync(screenshotsDir)) {
      return res.json({ projects: [] });
    }

    // Process each platform directory
    const platforms = ['web', 'stores', 'figma'];
    
    platforms.forEach(platform => {
      const platformDir = path.join(screenshotsDir, platform);
      if (!fs.existsSync(platformDir)) return;

      const platformFolders = fs.readdirSync(platformDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      platformFolders.forEach(folderName => {
        const projectDir = path.join(platformDir, folderName);
        
        // Handle nested structure for store projects
        let actualProjectDir = projectDir;
        let projectFiles = fs.readdirSync(projectDir);
        
        // For store projects, check if there's a subfolder with the actual project
        if (platform === 'stores') {
          const subFolders = projectFiles
            .filter(item => fs.statSync(path.join(projectDir, item)).isDirectory())
            .map(item => item);
          
          if (subFolders.length > 0) {
            // Use the first subfolder as the actual project directory
            actualProjectDir = path.join(projectDir, subFolders[0]);
            projectFiles = fs.readdirSync(actualProjectDir);
          }
        }
        
        // Find images (jpg, png, jpeg)
        const images = projectFiles
          .filter(file => /\.(jpg|jpeg|png)$/i.test(file))
          .map(file => {
            if (platform === 'stores' && actualProjectDir !== projectDir) {
              // For store projects with nested structure
              const subFolder = path.basename(actualProjectDir);
              return `/screenshots/${platform}/${folderName}/${subFolder}/${file}`;
            } else {
              return `/screenshots/${platform}/${folderName}/${file}`;
            }
          })
          .sort();

        // Find info.json for additional metadata
        let projectInfo = null;
        const infoFile = projectFiles.find(file => file === 'info.json');
        if (infoFile) {
          try {
            const infoPath = path.join(actualProjectDir, infoFile);
            const infoContent = fs.readFileSync(infoPath, 'utf8');
            projectInfo = JSON.parse(infoContent);
          } catch (error) {
            console.error(`Error reading info.json for ${folderName}:`, error);
          }
        }

        // Find analysis file and parse it
        let analysis = null;
        let parsedAnalysis = null;
        const analysisFile = projectFiles.find(file => file.includes('analysis_'));
        if (analysisFile) {
          try {
            const analysisPath = path.join(actualProjectDir, analysisFile);
            const analysisContent = fs.readFileSync(analysisPath, 'utf8');
            analysis = analysisContent;
            
            // Parse the analysis content
            const shortDescriptionMatch = analysis.match(/SHORT DESCRIPTION:\s*([\s\S]*?)(?=\n\n|\n[A-Z\s]+:|$)/i);
            const detailedDescriptionMatch = analysis.match(/DETAILED DESCRIPTION:\s*([\s\S]*?)(?=\n\n|\n[A-Z\s]+:|$)/i);
            const keyFeaturesMatch = analysis.match(/KEY FEATURES:\s*([\s\S]*?)(?=\n\n|\n[A-Z\s]+:|$)/i);
            const techStackMatch = analysis.match(/TECH STACK:\s*([\s\S]*?)(?=\n\n|\n[A-Z\s]+:|$)/i);
            
            parsedAnalysis = {
              shortDescription: shortDescriptionMatch ? shortDescriptionMatch[1].trim() : null,
              detailedDescription: detailedDescriptionMatch ? detailedDescriptionMatch[1].trim() : null,
              keyFeatures: keyFeaturesMatch ? 
                keyFeaturesMatch[1]
                  .split('\n')
                  .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
                  .map(line => line.replace(/^[-•]\s*/, '').trim())
                  .filter(line => line.length > 0)
                  .slice(0, 10) : [],
              techStack: techStackMatch ? techStackMatch[1].trim() : null,
              isAnalyzed: true
            };
          } catch (error) {
            console.error(`Error reading analysis for ${folderName}:`, error);
          }
        }

        if (images.length > 0) {
          // Extract project details
          let title = folderName;
          let url = '';
          let description = '';
          let keyFeatures = [];

          if (projectInfo) {
            title = projectInfo.title || folderName;
            url = projectInfo.url || '';
            description = projectInfo.description || '';
          }

          // Get folder creation time as timestamp
          const stats = fs.statSync(actualProjectDir);
          const timestamp = stats.birthtime.getTime();

          projects.push({
            id: `${platform}_${folderName}`,
            title,
            url,
            description: description.length > 200 ? description.substring(0, 200) + '...' : description,
            platform,
            images,
            keyFeatures: parsedAnalysis?.keyFeatures || keyFeatures,
            folderPath: projectDir,
            timestamp,
            analysis: parsedAnalysis || { isAnalyzed: false }
          });
        }
      });
    });

    // Sort projects by timestamp (newest first)
    projects.sort((a, b) => b.timestamp - a.timestamp);

    res.json({ projects });
  } catch (error) {
    console.error('Gallery API error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    apis: ['/api/web-screenshots', '/api/figma-screenshots', '/api/store-screenshots', '/api/gallery'],
    sse: '/api/logs'
  });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    apis: {
      'web-screenshots': {
        endpoint: 'POST /api/web-screenshots',
        description: 'Capture screenshots from web URLs',
        body: {
          urls: 'Array of web URLs',
          analyze: 'Boolean (optional) - Enable AI analysis',
          deep_capture: 'Boolean (optional) - Capture all internal links (up to 10)',
          capture: 'Boolean (optional) - Enable screenshot capture (default: true)'
        }
      },
      'figma-screenshots': {
        endpoint: 'POST /api/figma-screenshots',
        description: 'Capture screenshots from Figma URLs',
        body: {
          urls: 'Array of Figma URLs',
          analyze: 'Boolean (optional) - Enable AI analysis',
          capture: 'Boolean (optional) - Enable screenshot capture (default: true)'
        }
      },
      'store-screenshots': {
        endpoint: 'POST /api/store-screenshots',
        description: 'Extract screenshots and info from app store URLs',
        body: {
          urls: 'Array of app store URLs',
          analyze: 'Boolean (optional) - Enable AI analysis',
          capture: 'Boolean (optional) - Enable screenshot capture (default: true)'
        }
      },
      'logs': {
        endpoint: 'GET /api/logs',
        description: 'Server-Sent Events endpoint for real-time logging',
        type: 'SSE'
      },
      'gallery': {
        endpoint: 'GET /api/gallery',
        description: 'Get all processed projects for the gallery view',
        response: {
          projects: 'Array of project objects with images, metadata, and analysis'
        }
      }
    }
  });
});

// Serve static files
app.use('/screenshots', express.static(path.join(__dirname, 'screenshots')));

const PORT = process.env.PORT || 9000;
app.listen(PORT, () => {
  console.log(`🚀 Portfolio Screenshot API running on http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
  console.log(`📊 Real-time Logs: http://localhost:${PORT}/api/logs`);
});
