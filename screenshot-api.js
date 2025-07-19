require('dotenv').config();

const fs = require('fs');
const path = require('path');
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

// Import shared core functionality
const {
  sanitizeFolderName,
  validateUrls,
  getInternalLinks,
  takeScreenshot,
  analyzeScreenshot,
  findHomepageScreenshot,
  saveAnalysisToFile,
  DEFAULT_CONFIG
} = require('./screenshot-core');

// Configuration for API mode
const API_CONFIG = {
  enhancedLoading: true,
  preScreenshotDelay: 3000,
  ...DEFAULT_CONFIG // Use shared config for analysis prompt
};

// API-specific wrapper functions
async function takeScreenshotAPI(browser, url, saveDir) {
  return await takeScreenshot(browser, url, saveDir, API_CONFIG);
}

async function analyzeHomepageScreenshotAPI(url, screenshotPath) {
  const analysisResult = await analyzeScreenshot(screenshotPath, url, API_CONFIG);
  return analysisResult;
}

async function getInternalLinksAPI(baseUrl) {
  return await getInternalLinks(baseUrl);
}

// Main API Processing Function
async function processWebsiteAPI({ urls, screenshots, analyze, jobId, userId }) {
  console.log(`🚀 Starting API job ${jobId} for user ${userId}`);
  
  const results = [];
  const OUTPUT_DIR = "screenshots";
  const API_RESULTS_DIR = path.join(OUTPUT_DIR, "api-results");
  
  // Ensure directories exist
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  if (!fs.existsSync(API_RESULTS_DIR)) fs.mkdirSync(API_RESULTS_DIR, { recursive: true });

  const browser = screenshots ? await puppeteer.launch({ headless: "new" }) : null;

  try {
    for (const url of urls) {
      console.log(`🌐 Processing ${url}...`);
      
      const domainName = sanitizeFolderName(url);
      const siteDir = path.join(OUTPUT_DIR, domainName);
      if (!fs.existsSync(siteDir)) fs.mkdirSync(siteDir, { recursive: true });

      let screenshotResult = null;
      let analysisResult = null;

      // Take screenshots if requested
      if (screenshots && browser) {
        // Get internal links
        const internalLinks = await getInternalLinksAPI(url);
        const allLinks = Array.from(new Set([url, ...internalLinks.slice(0, 10)])); // Limit to 10 internal links
        
        const screenshotResults = [];
        for (const link of allLinks) {
          const result = await takeScreenshotAPI(browser, link, siteDir);
          screenshotResults.push({ url: link, ...result });
        }
        
        screenshotResult = {
          mainUrl: url,
          screenshots: screenshotResults,
          totalPages: allLinks.length
        };
      }

      // Analyze homepage if requested
      if (analyze) {
        // Find homepage screenshot
        let homepageScreenshot = null;
        
        if (screenshots && screenshotResult) {
          // Use the just-taken screenshot
          const mainScreenshot = screenshotResult.screenshots.find(s => s.url === url && s.success);
          if (mainScreenshot) {
            homepageScreenshot = mainScreenshot.fullPageFile;
          }
        } else {
          // Look for existing screenshot
          homepageScreenshot = await findHomepageScreenshot(url, siteDir);
        }

        if (homepageScreenshot && fs.existsSync(homepageScreenshot)) {
          analysisResult = await analyzeHomepageScreenshotAPI(url, homepageScreenshot);
          
          // Save analysis to file
          if (analysisResult.success) {
            const analysisFilePath = await saveAnalysisToFile(
              analysisResult.analysis, 
              url, 
              homepageScreenshot, 
              siteDir, 
              jobId, 
              userId
            );
            analysisResult.filePath = analysisFilePath;
          }
        } else {
          analysisResult = { 
            success: false, 
            error: 'No screenshot found for analysis' 
          };
        }
      }

      results.push({
        url,
        screenshots: screenshotResult,
        analysis: analysisResult,
        processedAt: new Date().toISOString()
      });
    }

    // Save job results
    const jobResult = {
      jobId,
      userId,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      options: { screenshots, analyze },
      results,
      summary: {
        totalUrls: urls.length,
        successful: results.filter(r => 
          (!screenshots || r.screenshots?.screenshots?.some(s => s.success)) &&
          (!analyze || r.analysis?.success)
        ).length,
        failed: results.filter(r => 
          (screenshots && !r.screenshots?.screenshots?.some(s => s.success)) ||
          (analyze && !r.analysis?.success)
        ).length
      }
    };

    const resultPath = path.join(API_RESULTS_DIR, `${jobId}.json`);
    fs.writeFileSync(resultPath, JSON.stringify(jobResult, null, 2));

    console.log(`✅ API job ${jobId} completed successfully`);
    return jobResult;

  } catch (error) {
    console.error(`❌ API job ${jobId} failed:`, error);
    
    // Save error result
    const errorResult = {
      jobId,
      userId,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      error: error.message,
      results
    };

    const resultPath = path.join(API_RESULTS_DIR, `${jobId}.json`);
    fs.writeFileSync(resultPath, JSON.stringify(errorResult, null, 2));
    
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = {
  processWebsiteAPI,
  validateUrls,
  takeScreenshotAPI,
  analyzeHomepageScreenshotAPI,
  getInternalLinksAPI
}; 