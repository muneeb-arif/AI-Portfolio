// figma-api-capture.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const FIGMA_TOKEN = process.env.FIGMA_PERSONAL_TOKEN;
const EXPORTABLE_TYPES = ['FRAME', 'GROUP', 'COMPONENT', 'INSTANCE'];

// Extract file key from Figma URL
function extractFileKey(url) {
  const match = url.match(/figma\.com\/(?:file|proto|design)\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

// Capture Figma via API
async function captureFigmaViaAPI(url, outputDir) {
  try {
    const FILE_KEY = extractFileKey(url);
    if (!FILE_KEY) {
      return { success: false, error: 'Could not extract FILE_KEY from URL' };
    }

    if (!FIGMA_TOKEN) {
      return { success: false, error: 'FIGMA_PERSONAL_TOKEN not configured' };
    }

    console.log(`🔑 Processing Figma file: ${FILE_KEY}`);

    // Get full document
    const { data } = await axios.get(`https://api.figma.com/v1/files/${FILE_KEY}`, {
      headers: { 'X-Figma-Token': FIGMA_TOKEN }
    });

    const pages = data.document.children;
    const page1 = pages.find(p => p.name === 'Page 1');
    if (!page1) {
      return { success: false, error: 'Page 1 not found in this file' };
    }

    const exportables = (page1.children || []).filter(node =>
      EXPORTABLE_TYPES.includes(node.type)
    );

    console.log(`📦 Found ${exportables.length} exportable layers in Page 1`);

    // Create output dir if not exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const savedFiles = [];

    for (const node of exportables) {
      const imageUrlRes = await axios.get(`https://api.figma.com/v1/images/${FILE_KEY}`, {
        headers: { 'X-Figma-Token': FIGMA_TOKEN },
        params: {
          ids: node.id,
          format: 'png',
          scale: 2
        }
      });

      const imageUrl = imageUrlRes.data.images[node.id];
      if (!imageUrl) {
        console.warn(`⚠️ No image URL found for ${node.name}`);
        continue;
      }

      const imageRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const filename = `${page1.name.replace(/\s+/g, '_')} - ${node.name.replace(/\s+/g, '_')}.png`;
      const filepath = path.join(outputDir, filename);

      fs.writeFileSync(filepath, imageRes.data);
      savedFiles.push(filepath);
      console.log(`✅ Saved: ${filepath}`);
    }

    console.log(`🎉 All layers downloaded to: ${outputDir}`);
    return { 
      success: true, 
      filePath: savedFiles[0] || null, // Return first file as main screenshot
      allFiles: savedFiles,
      totalFiles: savedFiles.length
    };

  } catch (err) {
    console.error('❌ Figma API Error:', err.message);
    return { success: false, error: err.message };
  }
}

// Capture Figma via browser (fallback method)
async function captureFigmaViaBrowser(url, outputDir) {
  try {
    const puppeteer = require("puppeteer-extra");
    const StealthPlugin = require("puppeteer-extra-plugin-stealth");
    puppeteer.use(StealthPlugin());

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    // Set larger viewport for Figma
    await page.setViewport({ width: 1920, height: 1080 });

    console.log(`🌐 Loading Figma URL: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });

    // Wait for Figma to load
    await page.waitForTimeout(8000);

    // Wait for Figma-specific elements
    try {
      await page.waitForSelector('canvas, .prototype--documentationContainer---zYeR, .prototype--suppressFocusRings--uoAQT, .figma-canvas, .canvas-container, [data-testid="canvas"], .view-layers', { timeout: 30000 });
    } catch (e) {
      console.log('⚠️ No Figma-specific elements found, proceeding anyway...');
    }

    // Create output dir if not exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = Date.now();
    const filename = `figma_screenshot_${timestamp}.png`;
    const filepath = path.join(outputDir, filename);

    // Take screenshot
    await page.screenshot({ 
      path: filepath, 
      fullPage: true,
      quality: 90
    });

    await browser.close();

    console.log(`✅ Figma screenshot saved: ${filepath}`);
    return { success: true, filePath: filepath };

  } catch (err) {
    console.error('❌ Figma browser capture error:', err.message);
    return { success: false, error: err.message };
  }
}

// Main capture function with fallback
async function captureFigma(url, outputDir) {
  // Try API method first
  if (FIGMA_TOKEN) {
    console.log('🔑 Attempting Figma API method...');
    const apiResult = await captureFigmaViaAPI(url, outputDir);
    if (apiResult.success) {
      return apiResult;
    }
    console.log('⚠️ API method failed, falling back to browser method...');
  }

  // Fallback to browser method
  console.log('🌐 Using browser method for Figma...');
  return await captureFigmaViaBrowser(url, outputDir);
}

module.exports = {
  captureFigmaViaAPI,
  captureFigmaViaBrowser,
  captureFigma,
  extractFileKey
};
