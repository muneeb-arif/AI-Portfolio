require('dotenv').config();

const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");
const OpenAI = require("openai");
const { URL } = require('url');

// Import Figma API functions
let figmaApiModule = null;
try {
  figmaApiModule = require('./figma-api-capture');
} catch (e) {
  console.log('⚠️ Figma API module not available');
}

// OpenAI Configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Shared Configuration
const DEFAULT_CONFIG = {
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

// Figma-specific configuration
const FIGMA_CONFIG = {
  preScreenshotDelay: 8000, // Longer delay for Figma to load
  viewport: { width: 1920, height: 1080 }, // Larger viewport for designs
  waitForSelector: 'canvas, .prototype--documentationContainer---zYeR, .prototype--suppressFocusRings--uoAQT, .figma-canvas, .canvas-container, [data-testid="canvas"], .view-layers',
  scrollBehavior: 'none', // Don't scroll Figma designs
  timeout: 120000 // 2 minutes timeout
};

// Detect if URL is a Figma link
function isFigmaUrl(url) {
  return url.includes('figma.com') || url.includes('figjam.com');
}

// Enhanced Figma screenshot with API fallback
async function takeFigmaScreenshot(browser, url, saveDir, config = DEFAULT_CONFIG) {
  // Try API method first if available and token exists
  if (figmaApiModule && process.env.FIGMA_PERSONAL_TOKEN) {
    console.log(`   🔑 Attempting Figma API method...`);
    try {
      const apiResult = await figmaApiModule.captureFigma(url, saveDir);
      if (apiResult.success) {
        console.log(`   ✅ Figma screenshot captured via API`);
        return {
          success: true,
          fullPageFile: apiResult.filePath,
          viewportFile: apiResult.filePath, // API gives us one image
          url: url,
          method: 'api'
        };
      } else {
        console.log(`   ⚠️ API method failed: ${apiResult.error}, falling back to browser method`);
      }
    } catch (error) {
      console.log(`   ⚠️ API method error: ${error.message}, falling back to browser method`);
    }
  }
  
  // Fallback to browser method
  console.log(`   🌐 Using browser method for Figma...`);
  return await takeScreenshot(browser, url, saveDir, config);
}

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

// Core Screenshot Functions
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

async function getInternalLinks(baseUrl) {
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

async function takeScreenshot(browser, url, saveDir, config = DEFAULT_CONFIG) {
  const page = await browser.newPage();
  
  // Apply Figma-specific settings if it's a Figma URL
  const isFigma = isFigmaUrl(url);
  const screenshotConfig = isFigma ? { ...config, ...FIGMA_CONFIG } : config;
  
  await page.setViewport(screenshotConfig.viewport || { width: 1440, height: 900 });

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
    if (isFigma) {
      console.log(`   🎨 Figma URL detected - applying special configuration`);
    }
    
    // Enhanced page loading with comprehensive error handling
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
    const delay = isFigma ? screenshotConfig.preScreenshotDelay : config.preScreenshotDelay;
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Enhanced selector detection with Figma-specific selectors
    const selectors = isFigma ? [
      ...screenshotConfig.waitForSelector.split(', '),
      "body", "main", "div", "section", "article", "header", 
      ".App", "#app", "#root", "#__next",
      "nav", "footer", "h1", "h2", ".container", ".content",
      "[class*='content']", "[class*='main']", "[id*='content']"
    ] : [
      "body", "main", "div", "section", "article", "header", 
      ".App", "#app", "#root", "#__next",
      "nav", "footer", "h1", "h2", ".container", ".content",
      "[class*='content']", "[class*='main']", "[id*='content']"
    ];

    // Additional Figma-specific canvas detection
    if (isFigma) {
      try {
        await page.waitForFunction(() => {
          const canvases = document.querySelectorAll('canvas');
          return canvases.length > 0 && Array.from(canvases).some(canvas => {
            return canvas.width > 0 && canvas.height > 0;
          });
        }, { timeout: 10000 });
        console.log(`   ✅ Canvas content detected and rendered`);
      } catch (e) {
        console.log(`   ⚠️ Canvas content wait failed: ${e.message}`);
      }
    }
    
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

    console.log(`   📊 Page validation successful - Text: ${pageContent.bodyText.length} chars, Images: ${pageContent.hasImages}, Links: ${pageContent.hasLinks}, Height: ${pageContent.bodyHeight}px`);

    // Enhanced loading features
    if (config.enhancedLoading) {
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
    } else {
      console.log(`   ⚡ Using fast loading mode (enhanced loading disabled)`);
      await page.evaluate(() => new Promise(resolve => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }));
    }

    // Pre-screenshot delay
    if (config.preScreenshotDelay > 0) {
      console.log(`   ⏰ Waiting additional ${config.preScreenshotDelay/1000}s for full render...`);
      
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
      
      await new Promise((resolve) => setTimeout(resolve, config.preScreenshotDelay));
    }

    // Smart scrolling
    if (config.enhancedLoading && !isFigma) {
      console.log(`   📜 Performing smart scroll to trigger lazy loading...`);
      await smartScroll(page);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } else if (isFigma) {
      console.log(`   🎨 Figma detected - skipping scroll to preserve design view`);
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
      pageStats: pageContent,
      url
    };

  } catch (err) {
    console.error(`❌ Failed to screenshot ${url}:`, err.message);
    return { success: false, error: err.message, url };
  } finally {
    await page.close();
  }
}

async function analyzeScreenshot(imagePath, url, config = DEFAULT_CONFIG) {
  try {
    console.log(`🤖 Analyzing screenshot for ${url}...`);
    
    const base64Image = encodeImageToBase64(imagePath);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${config.analysisPrompt}\n\nWebsite URL: ${url}`
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

async function findHomepageScreenshot(baseUrl, siteDir) {
  if (!fs.existsSync(siteDir)) {
    return null;
  }

  const files = fs.readdirSync(siteDir);
  
  // First try to find homepage screenshot by name
  const homepageScreenshot = files.find(file => {
    const isFullScreenshot = file.includes('_full_');
    const isJpeg = file.endsWith('.jpg') || file.endsWith('.jpeg');
    const baseUrlName = sanitizeFilename(baseUrl);
    const isHomepage = file.startsWith(baseUrlName) || file.startsWith('home_');
    
    return isFullScreenshot && isJpeg && isHomepage;
  });

  if (homepageScreenshot) {
    return path.join(siteDir, homepageScreenshot);
  }

  // Fallback: find the first full screenshot
  const firstFullScreenshot = files.find(file => 
    file.includes('_full_') && (file.endsWith('.jpg') || file.endsWith('.jpeg'))
  );
  
  if (firstFullScreenshot) {
    return path.join(siteDir, firstFullScreenshot);
  }

  return null;
}

async function saveAnalysisToFile(analysis, url, screenshotPath, outputDir, jobId = null, userId = null) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const domain = sanitizeFolderName(url);
  const analysisFileName = `${domain}_analysis_${timestamp}.txt`;
  const analysisFilePath = path.join(outputDir, analysisFileName);
  
  const isApiGenerated = jobId && userId;
  const headerTitle = isApiGenerated ? 
    '🌐 WEBSITE ANALYSIS REPORT (API Generated)' : 
    '🌐 WEBSITE ANALYSIS REPORT';
  
  let analysisContent = `
${headerTitle}
═══════════════════════════════════════════════════════════════

📅 Analysis Date: ${new Date().toLocaleString()}
🔗 Website URL: ${url}
📸 Screenshot: ${path.basename(screenshotPath)}`;

  if (isApiGenerated) {
    analysisContent += `
🆔 Job ID: ${jobId}
👤 User ID: ${userId}`;
  }

  analysisContent += `

${analysis}

═══════════════════════════════════════════════════════════════
Generated by Portfolio Screenshot Tool${isApiGenerated ? ' API' : ''}
`;

  fs.writeFileSync(analysisFilePath, analysisContent.trim());
  console.log(`✅ Analysis saved to: ${analysisFileName}`);
  
  return analysisFilePath;
}

module.exports = {
  sanitizeFolderName,
  sanitizeFilename,
  encodeImageToBase64,
  validateUrls,
  smartScroll,
  getInternalLinks,
  takeScreenshot,
  takeFigmaScreenshot,
  analyzeScreenshot,
  findHomepageScreenshot,
  saveAnalysisToFile,
  DEFAULT_CONFIG,
  isFigmaUrl,
  FIGMA_CONFIG
}; 