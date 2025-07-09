require('dotenv').config();

const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");
const { createObjectCsvWriter } = require("csv-writer");
const cliProgress = require("cli-progress");
const OpenAI = require("openai");

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

// OpenAI Configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "your-openai-api-key-here"
});

// Configuration based on command line arguments
const AI_CONFIG = {
  analyzeScreenshots: shouldAnalyze, // Based on --analyze flag
  generateImages: false,    // Set to true to enable image generation
  crawlInternalLinks: shouldTakeScreenshots, // Only crawl if taking screenshots
  enhancedLoading: shouldTakeScreenshots,    // Only use enhanced loading for screenshots
  preScreenshotDelay: 3000, // Additional delay in milliseconds before taking screenshots (increase for complex sites)
  analysisPrompt: `Analyze this website homepage screenshot and provide a comprehensive analysis:

📝 **SHORT DESCRIPTION:**
Provide a concise 1-2 sentence summary of what this website is about and who it's for.

📖 **LONG DESCRIPTION:**
Provide a detailed 3-4 paragraph description covering the website's purpose, target audience, business model, and overall value proposition based on what's visible in the screenshot.

🔧 **KEY FEATURES:**
List the main features and functionalities visible on the homepage:
- Primary navigation options
- Key services or products offered
- Interactive elements (buttons, forms, search, etc.)
- Content sections and their purposes
- Social proof elements (testimonials, logos, etc.)
- Contact or conversion opportunities

💻 **TECH STACK ANALYSIS:**
Based on visual clues, design patterns, and any visible elements, identify potential technologies:
- Frontend framework indicators (React/Vue/Angular patterns)
- UI library suggestions (Bootstrap, Material UI, custom design)
- CMS indicators (WordPress, Shopify, custom build)
- E-commerce platform clues (if applicable)
- Design framework patterns
- Any visible third-party integrations

🎨 **Design & Visual Elements:**
- Overall design style and aesthetic
- Color scheme and branding approach
- Layout structure and organization
- Typography choices and hierarchy
- Image and media usage

👤 **User Experience Assessment:**
- Navigation clarity and accessibility
- Call-to-action effectiveness and placement
- Mobile responsiveness indicators
- Information architecture quality
- User flow optimization

📊 **Professional Assessment:**
- Professional rating (1-10) with justification
- Industry standards comparison
- Strengths and areas for improvement
- Target audience alignment effectiveness
- Conversion optimization observations

Keep the analysis detailed, well-structured, and professional.`,
  imagePrompt: "Create a modern, clean website design based on this screenshot"
};

function sanitizeFolderName(url) {
  // Remove protocol (http:// or https://)
  let domain = url.replace(/https?:\/\//, "");

  // Remove www. prefix
  domain = domain.replace(/^www\./, "");

  // Remove domain extensions (.com, .co, .org, .net, .io, etc.)
  domain = domain.replace(/\.[a-z]{2,}.*$/, "");

  // Clean any remaining non-word characters
  return domain.replace(/[^\w]/g, "");
}

function sanitizeFilename(urlPath) {
  const parsed = new URL(urlPath);
  let page = parsed.pathname.replace(/\/$/, "").split("/").pop() || "home";
  return page.replace(/[^\w]/g, "_"); // only letters, numbers, underscores
}

// OpenAI Functions
function encodeImageToBase64(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  return imageBuffer.toString('base64');
}

async function analyzeScreenshot(imagePath, url) {
  if (!AI_CONFIG.analyzeScreenshots) return null;
  
  try {
    const base64Image = encodeImageToBase64(imagePath);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${AI_CONFIG.analysisPrompt}\n\nWebsite URL: ${url}`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error(`❌ Failed to analyze screenshot for ${url}:`, error.message);
    return null;
  }
}

async function generateCustomImage(originalImagePath, prompt) {
  if (!AI_CONFIG.generateImages) return null;
  
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt || AI_CONFIG.imagePrompt,
      size: "1024x1024",
      quality: "standard",
      n: 1
    });

    const imageUrl = response.data[0].url;
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    
    const customImagePath = originalImagePath.replace('.jpg', '_ai_generated.jpg');
    fs.writeFileSync(customImagePath, imageResponse.data);
    
    return customImagePath;
  } catch (error) {
    console.error(`❌ Failed to generate custom image:`, error.message);
    return null;
  }
}

async function analyzeHomepageScreenshot(baseUrl, siteDir) {
  if (!AI_CONFIG.analyzeScreenshots) return null;
  
  try {
    console.log(`🤖 Analyzing homepage screenshot for ${baseUrl}...`);
    
    // Find the homepage full screenshot
    const files = fs.readdirSync(siteDir);
    const homepageScreenshot = files.find(file => {
      // Look for files that represent the homepage (main URL)
      const isFullScreenshot = file.includes('_full_');
      const isJpeg = file.endsWith('.jpg') || file.endsWith('.jpeg');
      // For homepage, look for files that would be generated from the base URL
      const baseUrlName = sanitizeFilename(baseUrl);
      const isHomepage = file.startsWith(baseUrlName) || file.startsWith('home_');
      
      return isFullScreenshot && isJpeg && isHomepage;
    });

    if (!homepageScreenshot) {
      // Fallback: find the first full screenshot (likely homepage)
      const firstFullScreenshot = files.find(file => 
        file.includes('_full_') && (file.endsWith('.jpg') || file.endsWith('.jpeg'))
      );
      
      if (!firstFullScreenshot) {
        console.warn(`⚠️ No homepage screenshot found for ${baseUrl}`);
        return null;
      }
      
      console.log(`📸 Using first available screenshot: ${firstFullScreenshot}`);
      const screenshotPath = path.join(siteDir, firstFullScreenshot);
      return await performAnalysis(screenshotPath, baseUrl, siteDir);
    }

    console.log(`📸 Found homepage screenshot: ${homepageScreenshot}`);
    const screenshotPath = path.join(siteDir, homepageScreenshot);
    return await performAnalysis(screenshotPath, baseUrl, siteDir);
    
  } catch (error) {
    console.error(`❌ Failed to analyze homepage for ${baseUrl}:`, error.message);
    return null;
  }
}

async function performAnalysis(screenshotPath, baseUrl, siteDir) {
  try {
    const base64Image = encodeImageToBase64(screenshotPath);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${AI_CONFIG.analysisPrompt}\n\nWebsite URL: ${baseUrl}`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 2000
    });

    const analysis = response.choices[0].message.content;
    
    // Save analysis to txt file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const domain = sanitizeFolderName(baseUrl);
    const analysisFileName = `${domain}_analysis_${timestamp}.txt`;
    const analysisFilePath = path.join(siteDir, analysisFileName);
    
    const analysisContent = `
🌐 WEBSITE ANALYSIS REPORT
═══════════════════════════════════════════════════════════════

📅 Analysis Date: ${new Date().toLocaleString()}
🔗 Website URL: ${baseUrl}
📸 Screenshot: ${path.basename(screenshotPath)}

${analysis}

═══════════════════════════════════════════════════════════════
Generated by Portfolio Screenshot Tool
`;

    fs.writeFileSync(analysisFilePath, analysisContent.trim());
    console.log(`✅ Analysis saved to: ${analysisFileName}`);
    
    return analysis;
    
  } catch (error) {
    console.error(`❌ Analysis failed:`, error.message);
    return null;
  }
}

async function getInternalLinks(baseUrl) {
  try {
    console.log(`   🔍 Fetching internal links from ${baseUrl}`);
    const res = await axios.get(baseUrl, { timeout: 30000 }); // 30 second timeout
    const $ = cheerio.load(res.data);
    const links = new Set();

    $("a[href]").each((_, el) => {
      let href = $(el).attr("href");
      if (href.startsWith("/")) href = baseUrl + href;
      if (href.startsWith(baseUrl)) {
        // Filter out problematic URLs
        if (!href.includes('#') && !href.includes('javascript:') && !href.includes('mailto:')) {
          links.add(href.split("#")[0]);
        }
      }
    });

    const linkArray = Array.from(links);
    console.log(`   📊 Found ${linkArray.length} internal links`);
    return linkArray;
  } catch (e) {
    console.error(`❌ Failed to fetch links from ${baseUrl}: ${e.message}`);
    return [];
  }
}

async function takeScreenshot(browser, url, saveDir) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    // Set human-like headers
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({ 
      "Accept-Language": "en-US,en;q=0.9",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      "DNT": "1",
      "Connection": "keep-alive",
      "Upgrade-Insecure-Requests": "1"
    });

    console.log(`   📄 Loading page: ${url}`);
    
    // Enhanced page loading with comprehensive error handling
    let pageLoaded = false;
    try {
      await page.goto(url, { 
        waitUntil: ["networkidle2", "domcontentloaded"], 
        timeout: 90000 // Increased timeout to 90 seconds
      });
      pageLoaded = true;
      console.log(`   ✅ Page loaded successfully`);
    } catch (timeoutError) {
      console.error(`   ⏰ Page load timeout for ${url}: ${timeoutError.message}`);
      return false; // Exit early on timeout
    }

    // Only proceed if page actually loaded
    if (!pageLoaded) {
      console.error(`   ❌ Page failed to load: ${url}`);
      return false;
    }

    console.log(`   ⏳ Waiting for page to stabilize...`);
    
    // Wait for initial stabilization
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Enhanced selector detection with more comprehensive checks
    const selectors = [
      "body", "main", "div", "section", "article", "header", 
      ".App", "#app", "#root", "#__next", // Common React/Vue/Next.js containers
      "nav", "footer", "h1", "h2", ".container", ".content",
      "[class*='content']", "[class*='main']", "[id*='content']"
    ];
    
    let contentFound = false;
    let foundSelector = null;
    
    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 8000 });
        foundSelector = selector;
        contentFound = true;
        console.log(`   ✅ Found content with selector: ${selector}`);
        break;
      } catch (e) {
        // Continue to next selector
      }
    }

    // If no basic selectors found, try waiting for any visible text content
    if (!contentFound) {
      console.log(`   🔍 No standard selectors found, checking for text content...`);
      try {
        await page.waitForFunction(
          () => {
            const body = document.body;
            return body && body.innerText && body.innerText.trim().length > 100;
          },
          { timeout: 10000 }
        );
        contentFound = true;
        console.log(`   ✅ Found sufficient text content`);
      } catch (e) {
        console.warn(`   ⚠️ Could not detect meaningful content for: ${url}`);
      }
    }

    // Final check: ensure page isn't blank or showing error
    const pageContent = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      
      return {
        hasBody: !!body,
        bodyText: body ? body.innerText.trim() : '',
        title: document.title || '',
        hasImages: document.images.length > 0,
        hasLinks: document.links.length > 0,
        bodyHeight: body ? body.scrollHeight : 0,
        documentHeight: html ? html.scrollHeight : 0
      };
    });

    // Validate page content quality
    const isValidPage = pageContent.hasBody && 
                       (pageContent.bodyText.length > 50 || 
                        pageContent.hasImages || 
                        pageContent.hasLinks) &&
                       pageContent.bodyHeight > 100;

    if (!isValidPage) {
      console.error(`   ❌ Page appears to be empty or invalid for: ${url}`);
      console.error(`   📊 Page stats:`, {
        textLength: pageContent.bodyText.length,
        hasImages: pageContent.hasImages,
        hasLinks: pageContent.hasLinks,
        height: pageContent.bodyHeight
      });
      return false;
    }

    console.log(`   📊 Page validation successful - Text: ${pageContent.bodyText.length} chars, Images: ${pageContent.hasImages}, Links: ${pageContent.hasLinks}, Height: ${pageContent.bodyHeight}px`);

    // Enhanced loading features (optional for better quality)
    if (AI_CONFIG.enhancedLoading) {
      // Wait for JavaScript frameworks to fully render
      console.log(`   ⚛️ Waiting for JavaScript frameworks...`);
      await page.evaluate(async () => {
        // Wait for multiple render cycles
        await new Promise(resolve => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              requestAnimationFrame(resolve);
            });
          });
        });
        
        // Additional wait for React/Vue/Angular
        if (window.React || window.Vue || window.ng || window.angular) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      });

      // Wait for images to load
      console.log(`   🖼️ Waiting for images to load...`);
      await page.evaluate(async () => {
        const images = Array.from(document.images);
        await Promise.all(
          images.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => {
              img.addEventListener('load', resolve);
              img.addEventListener('error', resolve);
              // Timeout after 5 seconds per image
              setTimeout(resolve, 5000);
            });
          })
        );
      });

      // Wait for fonts to load
      try {
        await page.evaluateHandle(() => document.fonts.ready);
        console.log(`   🔤 Fonts loaded successfully`);
      } catch (e) {
        console.log(`   ⚠️ Font loading check failed, continuing...`);
      }
    } else {
      console.log(`   ⚡ Using fast loading mode (enhanced loading disabled)`);
      // Simple React render pass for basic compatibility
      await page.evaluate(() => new Promise(resolve => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }));
    }

    // Final stabilization wait
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const pageName = sanitizeFilename(url);
    const timestamp = Math.floor(Date.now() / 1000);
    const fullPageFilename = `${pageName}_full_${timestamp}.jpg`;
    const viewportFilename = `${pageName}_viewport_${timestamp}.jpg`;
    const fullPageFilepath = path.join(saveDir, fullPageFilename);
    const viewportFilepath = path.join(saveDir, viewportFilename);

    // Scroll to trigger lazy loading, then return to top
    if (AI_CONFIG.enhancedLoading) {
      console.log(`   📜 Performing smart scroll to trigger lazy loading...`);
      await smartScroll(page);
      // Final wait after scrolling
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } else {
      console.log(`   📜 Skipping scroll (fast mode)`);
    }

    // Additional safety delay before screenshots
    // This helps with websites that have delayed JavaScript rendering or animations
    if (AI_CONFIG.preScreenshotDelay > 0) {
      console.log(`   ⏰ Waiting additional ${AI_CONFIG.preScreenshotDelay/1000}s for full render...`);
      
      try {
        // Simple final render check (safer approach)
        await page.evaluate(async () => {
          // Final render cycle
          await new Promise(resolve => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                requestAnimationFrame(resolve);
              });
            });
          });
        });
      } catch (e) {
        console.log(`   ⚠️ Render check failed, continuing anyway...`);
      }
      
      await new Promise((resolve) => setTimeout(resolve, AI_CONFIG.preScreenshotDelay));
    }

    console.log(`   📸 Taking screenshots...`);
    
    // Take full page screenshot
    await page.screenshot({
      path: fullPageFilepath,
      fullPage: true,
      type: "jpeg",
      quality: 85, // Slightly higher quality
    });

    // Take viewport-only screenshot (first fold)
    await page.screenshot({
      path: viewportFilepath,
      fullPage: false,
      type: "jpeg",
      quality: 85,
    });

    console.log(`   ✅ Screenshots saved successfully`);

    REPORTS.push({ 
      url, 
      fullPageFile: fullPageFilepath,
      viewportFile: viewportFilepath,
      aiAnalysis: null, // Will be filled later for homepage only
      customImage: null 
    });
    return true;
  } catch (err) {
    console.error(`❌ Failed to screenshot ${url}`);
    console.error(`   Error: ${err.message}`);
    console.error(`   Stack: ${err.stack}`);
    return false;
  } finally {
    await page.close();
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
      await takeScreenshot(browser, links[i], siteDir);
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

async function smartScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      const scrollHeight = document.body.scrollHeight;
      const viewportHeight = window.innerHeight;
      const distance = Math.min(300, viewportHeight / 3); // Gentler scrolling
      let currentPosition = 0;
      
      // If page is short, no need to scroll
      if (scrollHeight <= viewportHeight * 1.5) {
        resolve();
        return;
      }

      const scrollDown = () => {
        window.scrollBy(0, distance);
        currentPosition += distance;
        
        // Stop when we've seen most of the page
        if (currentPosition >= scrollHeight - viewportHeight) {
          clearInterval(scrollTimer);
          
          // Wait a bit for any lazy loading, then scroll back to top
          setTimeout(() => {
            // Smooth scroll back to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
            // Wait for smooth scroll to complete
            setTimeout(resolve, 1000);
          }, 1000);
        }
      };

      const scrollTimer = setInterval(scrollDown, 300); // Slower, gentler scrolling
    });
  });
}
  

main();
