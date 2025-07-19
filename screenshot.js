require('dotenv').config();

const fs = require("fs");
const path = require("path");
const { createObjectCsvWriter } = require("csv-writer");
const cliProgress = require("cli-progress");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

// Import shared core functionality
const {
  sanitizeFolderName,
  getInternalLinks,
  takeScreenshot,
  takeFigmaScreenshot,
  isFigmaUrl,
  analyzeScreenshot,
  findHomepageScreenshot,
  saveAnalysisToFile,
  DEFAULT_CONFIG
} = require('./screenshot-core');

// Parse command line arguments
const args = process.argv.slice(2);
const shouldTakeScreenshots = args.includes('--screenshots');
const shouldAnalyze = args.includes('--analyze');

// Validate arguments
if (!shouldTakeScreenshots && !shouldAnalyze) {
  console.log(`
🚀 Portfolio Screenshot Tool

Usage: node screenshot.js [options]

Options:
  --screenshots    Take screenshots of websites
  --analyze       Analyze homepage screenshots with AI
  
Examples:
  node screenshot.js --screenshots                    # Take screenshots only
  node screenshot.js --analyze                        # Analyze existing screenshots
  node screenshot.js --screenshots --analyze          # Take screenshots and analyze

Configuration:
  - Modify AI_CONFIG.preScreenshotDelay in the script to adjust the delay before screenshots
  - Default is 3000ms (3 seconds) - increase for complex websites with slow rendering

At least one option is required.
`);
  process.exit(1);
}

console.log(`
🎯 Running with options:
  📸 Screenshots: ${shouldTakeScreenshots ? '✅ Enabled' : '❌ Disabled'}
  🤖 AI Analysis: ${shouldAnalyze ? '✅ Enabled' : '❌ Disabled'}
`);

const OUTPUT_DIR = "screenshots";
const REPORTS = [];

// Configuration based on command line arguments
const AI_CONFIG = {
  analyzeScreenshots: shouldAnalyze,
  generateImages: false,
  crawlInternalLinks: shouldTakeScreenshots,
  enhancedLoading: shouldTakeScreenshots,
  preScreenshotDelay: 3000,
  ...DEFAULT_CONFIG // Use shared config for analysis prompt
};

async function analyzeHomepageScreenshot(baseUrl, siteDir) {
  if (!AI_CONFIG.analyzeScreenshots) return null;
  
  try {
    console.log(`🤖 Analyzing homepage screenshot for ${baseUrl}...`);
    
    const screenshotPath = await findHomepageScreenshot(baseUrl, siteDir);
    
    if (!screenshotPath) {
      console.warn(`⚠️ No homepage screenshot found for ${baseUrl}`);
      return null;
    }

    console.log(`📸 Found screenshot: ${path.basename(screenshotPath)}`);
    
    const analysisResult = await analyzeScreenshot(screenshotPath, baseUrl, AI_CONFIG);
    
    if (analysisResult.success) {
      // Save analysis to file
      await saveAnalysisToFile(analysisResult.analysis, baseUrl, screenshotPath, siteDir);
      return analysisResult.analysis;
    }
    
    return null;
    
  } catch (error) {
    console.error(`❌ Failed to analyze homepage for ${baseUrl}:`, error.message);
    return null;
  }
}

async function processWebsite(baseUrl) {
  const domainName = sanitizeFolderName(baseUrl);
  const siteDir = path.join(OUTPUT_DIR, domainName);
  if (!fs.existsSync(siteDir)) fs.mkdirSync(siteDir, { recursive: true });

  // Take screenshots if requested
  if (shouldTakeScreenshots) {
    let links = [baseUrl]; // Always include the main URL
    
    if (AI_CONFIG.crawlInternalLinks) {
      const internalLinks = await getInternalLinks(baseUrl);
      links = Array.from(new Set([baseUrl, ...internalLinks]));
    }

    if (links.length === 0) {
      console.log(`⚠️ No links found for ${baseUrl}`);
      return;
    }

    const browser = await puppeteer.launch({ headless: "new" });
    const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    bar.start(links.length, 0);

    for (let i = 0; i < links.length; i++) {
      const result = isFigmaUrl(links[i]) 
        ? await takeFigmaScreenshot(browser, links[i], siteDir, AI_CONFIG)
        : await takeScreenshot(browser, links[i], siteDir, AI_CONFIG);
      
      // Add to reports (convert to old format for compatibility)
      if (result.success) {
        REPORTS.push({ 
          url: result.url, 
          fullPageFile: result.fullPageFile,
          viewportFile: result.viewportFile,
          aiAnalysis: null, // Will be filled later for homepage only
          customImage: null 
        });
      }
      
      bar.update(i + 1);
    }

    bar.stop();
    await browser.close();
    console.log(`✅ Screenshots completed for ${baseUrl}`);
  }

  // Analyze homepage screenshot if requested
  if (shouldAnalyze) {
    const analysis = await analyzeHomepageScreenshot(baseUrl, siteDir);
    if (analysis) {
      console.log(`🤖 Analysis completed for ${baseUrl}`);
      
      // Update the report with analysis
      const report = REPORTS.find(r => r.url === baseUrl);
      if (report) {
        report.aiAnalysis = analysis;
      }
    }
  }
}

async function writeReports() {
  const timestamp = Math.floor(Date.now() / 1000);
  const jsonPath = path.join(OUTPUT_DIR, `report_${timestamp}.json`);
  const csvPath = path.join(OUTPUT_DIR, `report_${timestamp}.csv`);

  fs.writeFileSync(jsonPath, JSON.stringify(REPORTS, null, 2));

  const csvWriter = createObjectCsvWriter({
    path: csvPath,
    header: [
      { id: "url", title: "URL" },
      { id: "fullPageFile", title: "Full Page Screenshot" },
      { id: "viewportFile", title: "Viewport Screenshot" },
      { id: "aiAnalysis", title: "AI Analysis" },
      { id: "customImage", title: "Custom AI Image" },
    ],
  });
  await csvWriter.writeRecords(REPORTS);
}

async function main() {
  // Validate AI analysis requirements
  if (shouldAnalyze && !process.env.OPENAI_API_KEY) {
    console.error(`
❌ OpenAI API key required for analysis!

Please set your OpenAI API key:
  export OPENAI_API_KEY="your-api-key-here"

Or create a .env file:
  echo "OPENAI_API_KEY=your-api-key-here" > .env
`);
    process.exit(1);
  }

  // Create output directory if taking screenshots
  if (shouldTakeScreenshots && !fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
  }

  // Check if analyzing existing screenshots
  if (shouldAnalyze && !shouldTakeScreenshots && !fs.existsSync(OUTPUT_DIR)) {
    console.error(`
❌ No screenshots directory found!

To analyze existing screenshots, the '${OUTPUT_DIR}' directory must exist.
Run with --screenshots first to generate screenshots, or run both together:
  node screenshot.js --screenshots --analyze
`);
    process.exit(1);
  }

  // Read URLs
  if (!fs.existsSync("urls.txt")) {
    console.error(`
❌ urls.txt file not found!

Please create a urls.txt file with the websites you want to process:
  https://example.com
  https://github.com
  # Comments start with #
`);
    process.exit(1);
  }

  const urls = fs
    .readFileSync("urls.txt", "utf-8")
    .split("\n")
    .map((line) => line.trim())
    .filter(line => line && !line.startsWith('#'));

  if (urls.length === 0) {
    console.error(`❌ No valid URLs found in urls.txt`);
    process.exit(1);
  }

  console.log(`📋 Found ${urls.length} URL(s) to process\n`);

  // If only analyzing, check which URLs actually have screenshots
  if (shouldAnalyze && !shouldTakeScreenshots) {
    const availableScreenshots = [];
    for (const url of urls) {
      const domainName = sanitizeFolderName(url);
      const siteDir = path.join(OUTPUT_DIR, domainName);
      if (fs.existsSync(siteDir)) {
        availableScreenshots.push(url);
      } else {
        console.log(`⚠️ No screenshots found for ${url} (skipping)`);
      }
    }
    
    if (availableScreenshots.length === 0) {
      console.error(`❌ No screenshots found for any of the URLs in urls.txt`);
      process.exit(1);
    }
    
    console.log(`📸 Found screenshots for ${availableScreenshots.length} URL(s)\n`);
    
    for (const url of availableScreenshots) {
      console.log(`🌐 Analyzing site: ${url}`);
      await processWebsite(url);
      console.log(''); // Add spacing between sites
    }
  } else {
    for (const url of urls) {
      console.log(`🌐 Processing site: ${url}`);
      await processWebsite(url);
      console.log(''); // Add spacing between sites
    }
  }

  if (shouldTakeScreenshots) {
    await writeReports();
    console.log(`📊 Reports saved in ${OUTPUT_DIR}/`);
  }

  console.log(`✅ All done!`);
}

main();
