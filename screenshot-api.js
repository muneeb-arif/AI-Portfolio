require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// Import existing screenshot functionality
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

const axios = require("axios");
const cheerio = require("cheerio");
const OpenAI = require("openai");

// OpenAI Configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Configuration for API mode
const API_CONFIG = {
  enhancedLoading: true,
  preScreenshotDelay: 3000,
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

Keep the analysis detailed, well-structured, and professional.`
};

// Utility Functions
function sanitizeFolderName(url) {
  let domain = url.replace(/https?:\/\//, "");
  domain = domain.replace(/^www\./, "");
  domain = domain.replace(/\.[a-z]{2,}.*$/, "");
  return domain.replace(/[^\w]/g, "");
}

function sanitizeFilename(urlPath) {
  const parsed = new URL(urlPath);
  let page = parsed.pathname.replace(/\/$/, "").split("/").pop() || "home";
  return page.replace(/[^\w]/g, "_");
}

function encodeImageToBase64(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  return imageBuffer.toString('base64');
}

// URL Validation
function validateUrls(urls) {
  const valid = [];
  const invalid = [];
  
  urls.forEach(url => {
    try {
      const urlObj = new URL(url);
      if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
        valid.push(url);
      } else {
        invalid.push({ url, reason: 'Invalid protocol' });
      }
    } catch (error) {
      invalid.push({ url, reason: 'Invalid URL format' });
    }
  });
  
  return { valid, invalid };
}

// Screenshot Functions
async function smartScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      const scrollHeight = document.body.scrollHeight;
      const viewportHeight = window.innerHeight;
      const distance = Math.min(300, viewportHeight / 3);
      let currentPosition = 0;
      
      if (scrollHeight <= viewportHeight * 1.5) {
        resolve();
        return;
      }

      const scrollDown = () => {
        window.scrollBy(0, distance);
        currentPosition += distance;
        
        if (currentPosition >= scrollHeight - viewportHeight) {
          clearInterval(scrollTimer);
          
          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(resolve, 1000);
          }, 1000);
        }
      };

      const scrollTimer = setInterval(scrollDown, 300);
    });
  });
}

async function takeScreenshotAPI(browser, url, saveDir) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
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
    
    let pageLoaded = false;
    try {
      await page.goto(url, { 
        waitUntil: ["networkidle2", "domcontentloaded"], 
        timeout: 90000 
      });
      pageLoaded = true;
      console.log(`   ✅ Page loaded successfully`);
    } catch (timeoutError) {
      console.error(`   ⏰ Page load timeout for ${url}: ${timeoutError.message}`);
      return { success: false, error: timeoutError.message };
    }

    if (!pageLoaded) {
      console.error(`   ❌ Page failed to load: ${url}`);
      return { success: false, error: 'Page failed to load' };
    }

    console.log(`   ⏳ Waiting for page to stabilize...`);
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Enhanced selector detection
    const selectors = [
      "body", "main", "div", "section", "article", "header", 
      ".App", "#app", "#root", "#__next",
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

    // Validate page content
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

    const isValidPage = pageContent.hasBody && 
                       (pageContent.bodyText.length > 50 || 
                        pageContent.hasImages || 
                        pageContent.hasLinks) &&
                       pageContent.bodyHeight > 100;

    if (!isValidPage) {
      console.error(`   ❌ Page appears to be empty or invalid for: ${url}`);
      return { 
        success: false, 
        error: 'Page appears to be empty or invalid',
        pageStats: pageContent
      };
    }

    console.log(`   📊 Page validation successful`);

    // Enhanced loading features
    if (API_CONFIG.enhancedLoading) {
      console.log(`   ⚛️ Waiting for JavaScript frameworks...`);
      await page.evaluate(async () => {
        await new Promise(resolve => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              requestAnimationFrame(resolve);
            });
          });
        });
        
        if (window.React || window.Vue || window.ng || window.angular) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      });

      console.log(`   🖼️ Waiting for images to load...`);
      await page.evaluate(async () => {
        const images = Array.from(document.images);
        await Promise.all(
          images.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => {
              img.addEventListener('load', resolve);
              img.addEventListener('error', resolve);
              setTimeout(resolve, 5000);
            });
          })
        );
      });

      try {
        await page.evaluateHandle(() => document.fonts.ready);
        console.log(`   🔤 Fonts loaded successfully`);
      } catch (e) {
        console.log(`   ⚠️ Font loading check failed, continuing...`);
      }
    }

    // Pre-screenshot delay
    if (API_CONFIG.preScreenshotDelay > 0) {
      console.log(`   ⏰ Waiting additional ${API_CONFIG.preScreenshotDelay/1000}s for full render...`);
      
      try {
        await page.evaluate(async () => {
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
      
      await new Promise((resolve) => setTimeout(resolve, API_CONFIG.preScreenshotDelay));
    }

    // Smart scrolling
    if (API_CONFIG.enhancedLoading) {
      console.log(`   📜 Performing smart scroll to trigger lazy loading...`);
      await smartScroll(page);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const pageName = sanitizeFilename(url);
    const timestamp = Math.floor(Date.now() / 1000);
    const fullPageFilename = `${pageName}_full_${timestamp}.jpg`;
    const viewportFilename = `${pageName}_viewport_${timestamp}.jpg`;
    const fullPageFilepath = path.join(saveDir, fullPageFilename);
    const viewportFilepath = path.join(saveDir, viewportFilename);

    console.log(`   📸 Taking screenshots...`);
    
    await page.screenshot({
      path: fullPageFilepath,
      fullPage: true,
      type: "jpeg",
      quality: 85,
    });

    await page.screenshot({
      path: viewportFilepath,
      fullPage: false,
      type: "jpeg",
      quality: 85,
    });

    console.log(`   ✅ Screenshots saved successfully`);

    return {
      success: true,
      fullPageFile: fullPageFilepath,
      viewportFile: viewportFilepath,
      pageStats: pageContent
    };

  } catch (err) {
    console.error(`❌ Failed to screenshot ${url}:`, err.message);
    return { success: false, error: err.message };
  } finally {
    await page.close();
  }
}

async function analyzeHomepageScreenshotAPI(url, screenshotPath) {
  try {
    console.log(`🤖 Analyzing homepage screenshot for ${url}...`);
    
    const base64Image = encodeImageToBase64(screenshotPath);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${API_CONFIG.analysisPrompt}\n\nWebsite URL: ${url}`
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
    console.log(`✅ Analysis completed for ${url}`);
    
    return { success: true, analysis };
    
  } catch (error) {
    console.error(`❌ Analysis failed for ${url}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function getInternalLinksAPI(baseUrl) {
  try {
    console.log(`   🔍 Fetching internal links from ${baseUrl}`);
    const res = await axios.get(baseUrl, { timeout: 30000 });
    const $ = cheerio.load(res.data);
    const links = new Set();

    $("a[href]").each((_, el) => {
      let href = $(el).attr("href");
      if (href.startsWith("/")) href = baseUrl + href;
      if (href.startsWith(baseUrl)) {
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
          const files = fs.existsSync(siteDir) ? fs.readdirSync(siteDir) : [];
          const screenshotFile = files.find(file => 
            file.includes('_full_') && (file.endsWith('.jpg') || file.endsWith('.jpeg'))
          );
          if (screenshotFile) {
            homepageScreenshot = path.join(siteDir, screenshotFile);
          }
        }

        if (homepageScreenshot && fs.existsSync(homepageScreenshot)) {
          analysisResult = await analyzeHomepageScreenshotAPI(url, homepageScreenshot);
          
          // Save analysis to file
          if (analysisResult.success) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const domain = sanitizeFolderName(url);
            const analysisFileName = `${domain}_analysis_${timestamp}.txt`;
            const analysisFilePath = path.join(siteDir, analysisFileName);
            
            const analysisContent = `
🌐 WEBSITE ANALYSIS REPORT (API Generated)
═══════════════════════════════════════════════════════════════

📅 Analysis Date: ${new Date().toLocaleString()}
🔗 Website URL: ${url}
📸 Screenshot: ${path.basename(homepageScreenshot)}
🆔 Job ID: ${jobId}
👤 User ID: ${userId}

${analysisResult.analysis}

═══════════════════════════════════════════════════════════════
Generated by Portfolio Screenshot Tool API
`;
            
            fs.writeFileSync(analysisFilePath, analysisContent.trim());
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