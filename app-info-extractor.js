const appstore = require('app-store-scraper');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Add Puppeteer for fallback screenshot capture
let puppeteer = null;
async function getPuppeteer() {
  if (!puppeteer) {
    puppeteer = await import('puppeteer-extra');
    const StealthPlugin = await import('puppeteer-extra-plugin-stealth');
    puppeteer.default.use(StealthPlugin.default());
  }
  return puppeteer.default;
}

function getAppIdFromPlayUrl(url) {
  const match = url.match(/id=([\w\.]+)/);
  return match ? match[1] : null;
}

function getAppIdFromAppleUrl(url) {
  const match = url.match(/id(\d+)/);
  return match ? match[1] : null;
}

async function downloadImage(url, folder, index) {
  try {
    const res = await fetch(url);
    const buffer = await res.buffer();
    const file = path.join(folder, `screenshot_${index + 1}.jpg`);
    fs.writeFileSync(file, buffer);
    console.log(`🖼️  Saved: ${file}`);
    return file;
  } catch (error) {
    console.error(`❌ Failed to download image: ${error.message}`);
    return null;
  }
}

// Fallback method: Capture App Store page screenshots using Puppeteer
async function captureAppStoreScreenshots(url, folder, appTitle) {
  try {
    console.log(`   🌐 Attempting fallback: Capturing App Store page directly...`);
    
    const puppeteerInstance = await getPuppeteer();
    const browser = await puppeteerInstance.launch({ 
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log(`   📄 Loading App Store page: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for initial page load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Scroll down to trigger lazy loading of screenshots
    console.log(`   📜 Scrolling to trigger lazy loading...`);
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Scroll back up and wait for images to load
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Try to find screenshot elements with better selectors
    const screenshotSelectors = [
      'picture[class*="screenshot"] img',
      'picture[class*="we-artwork--screenshot"] img',
      '[class*="screenshot"] img',
      '[class*="we-artwork--screenshot"] img',
      'img[class*="we-artwork__image"]',
      'picture img[src*="image"]'
    ];
    
    let screenshots = [];
    for (const selector of screenshotSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          console.log(`   📸 Found ${elements.length} screenshots with selector: ${selector}`);
          
          for (let i = 0; i < Math.min(elements.length, 10); i++) { // Limit to 10 screenshots
            try {
              const imgInfo = await elements[i].evaluate(el => ({
                src: el.src,
                alt: el.alt || '',
                className: el.className || '',
                parentClass: el.parentElement ? el.parentElement.className : ''
              }));
              
              // Filter out placeholder images and only include actual screenshots
              if (imgInfo.src && 
                  imgInfo.src.includes('http') && 
                  !imgInfo.src.includes('1x1-42817eea7ade52607a760cbee00d1495.gif') &&
                  (imgInfo.parentClass.includes('screenshot') || imgInfo.className.includes('screenshot'))) {
                screenshots.push(imgInfo.src);
              }
            } catch (e) {
              // Continue to next element
            }
          }
          if (screenshots.length > 0) break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    // If no screenshots found with selectors, try a more comprehensive approach
    if (screenshots.length === 0) {
      console.log(`   🔍 No screenshots found with selectors, trying comprehensive search...`);
      
      try {
        const allImages = await page.evaluate(() => {
          const images = [];
          const allImgs = document.querySelectorAll('img');
          
          allImgs.forEach(img => {
            if (img.src && 
                img.src.includes('http') && 
                !img.src.includes('1x1-42817eea7ade52607a760cbee00d1495.gif') &&
                img.src.includes('image') &&
                (img.parentElement && img.parentElement.className.includes('screenshot'))) {
              images.push(img.src);
            }
          });
          
          return images;
        });
        
        if (allImages.length > 0) {
          console.log(`   📸 Found ${allImages.length} screenshots with comprehensive search`);
          screenshots = allImages.slice(0, 10); // Limit to 10
        }
      } catch (e) {
        console.log(`   ⚠️ Comprehensive search failed: ${e.message}`);
      }
    }
    
    if (screenshots.length === 0) {
      console.log(`   ⚠️ No screenshots found, taking full page screenshot...`);
      
      // Take a full page screenshot as last resort
      const fullPagePath = path.join(folder, 'app_store_page.jpg');
      await page.screenshot({
        path: fullPagePath,
        fullPage: true,
        type: 'jpeg',
        quality: 85
      });
      
      await browser.close();
      return [fullPagePath];
    }
    
    // Download found screenshots
    const downloadedScreenshots = [];
    for (let i = 0; i < screenshots.length; i++) {
      console.log(`   📥 Downloading fallback screenshot ${i + 1}/${screenshots.length}...`);
      const screenshotPath = await downloadImage(screenshots[i], folder, i);
      if (screenshotPath) {
        downloadedScreenshots.push(screenshotPath);
      }
    }
    
    await browser.close();
    return downloadedScreenshots;
    
  } catch (error) {
    console.error(`   ❌ Fallback capture failed: ${error.message}`);
    return [];
  }
}

// Fallback method: Capture Play Store page screenshots using Puppeteer
async function capturePlayStoreScreenshots(url, folder, appTitle) {
  try {
    console.log(`   🌐 Attempting fallback: Capturing Play Store page directly...`);
    
    const puppeteerInstance = await getPuppeteer();
    const browser = await puppeteerInstance.launch({ 
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log(`   📄 Loading Play Store page: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for screenshots to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Try to find screenshot elements - Play Store specific selectors
    const screenshotSelectors = [
      '[data-testid="screenshot"] img',
      '.screenshot img',
      '.we-screenshot img',
      '[data-testid="screenshot-container"] img',
      '.screenshot-container img',
      'img[alt*="screenshot"]',
      'img[alt*="Screenshot"]',
      '[data-testid="screenshot"] picture img',
      '.screenshot picture img'
    ];
    
    let screenshots = [];
    for (const selector of screenshotSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          console.log(`   📸 Found ${elements.length} screenshots with selector: ${selector}`);
          
          for (let i = 0; i < Math.min(elements.length, 10); i++) { // Limit to 10 screenshots
            try {
              const src = await elements[i].evaluate(el => el.src);
              if (src && src.includes('http')) {
                screenshots.push(src);
              }
            } catch (e) {
              // Continue to next element
            }
          }
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    // If no screenshots found with selectors, try to find any images in the screenshots section
    if (screenshots.length === 0) {
      console.log(`   🔍 No screenshots found with selectors, searching for images in screenshots section...`);
      
      try {
        // Look for images within screenshot-related containers
        const screenshotImages = await page.evaluate(() => {
          const images = [];
          // Look for common screenshot container patterns
          const containers = document.querySelectorAll('[class*="screenshot"], [id*="screenshot"], [data-testid*="screenshot"]');
          
          containers.forEach(container => {
            const imgs = container.querySelectorAll('img');
            imgs.forEach(img => {
              if (img.src && img.src.includes('http') && img.src.includes('image')) {
                images.push(img.src);
              }
            });
          });
          
          return images;
        });
        
        if (screenshotImages.length > 0) {
          console.log(`   📸 Found ${screenshotImages.length} screenshots in containers`);
          screenshots = screenshotImages.slice(0, 10); // Limit to 10
        }
      } catch (e) {
        console.log(`   ⚠️ Container search failed: ${e.message}`);
      }
    }
    
    if (screenshots.length === 0) {
      console.log(`   ⚠️ No screenshots found, taking full page screenshot...`);
      
      // Take a full page screenshot as last resort
      const fullPagePath = path.join(folder, 'play_store_page.jpg');
      await page.screenshot({
        path: fullPagePath,
        fullPage: true,
        type: 'jpeg',
        quality: 85
      });
      
      await browser.close();
      return [fullPagePath];
    }
    
    // Download found screenshots
    const downloadedScreenshots = [];
    for (let i = 0; i < screenshots.length; i++) {
      console.log(`   📥 Downloading fallback screenshot ${i + 1}/${screenshots.length}...`);
      const screenshotPath = await downloadImage(screenshots[i], folder, i);
      if (screenshotPath) {
        downloadedScreenshots.push(screenshotPath);
      }
    }
    
    await browser.close();
    return downloadedScreenshots;
    
  } catch (error) {
    console.error(`   ❌ Fallback capture failed: ${error.message}`);
    return [];
  }
}

async function handlePlayStore(url, outputDir) {
  try {
    const appId = getAppIdFromPlayUrl(url);
    if (!appId) {
      return { success: false, error: 'Invalid Play Store URL' };
    }

    console.log(`🟢 Play Store: ${appId}`);
    const gplay = await import('google-play-scraper');
    const app = await gplay.default.app({ appId });

    const folder = path.join(outputDir, `PlayStore-${app.title.replace(/\s+/g, '_')}`);
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    const info = {
      platform: 'Google Play',
      title: app.title,
      description: app.description,
      screenshots: app.screenshots,
      appId: appId,
      url: url
    };

    fs.writeFileSync(path.join(folder, 'info.json'), JSON.stringify(info, null, 2));

    let downloadedScreenshots = [];
    
    if (!app.screenshots || app.screenshots.length === 0) {
      console.log(`   ⚠️ No screenshots found for app: ${app.title}`);
      console.log(`   💡 This may be due to Play Store API limitations. The app likely has screenshots on the store page.`);
      
      // Try fallback method
      downloadedScreenshots = await capturePlayStoreScreenshots(url, folder, app.title);
      
      if (downloadedScreenshots.length === 0) {
        info.note = 'Screenshots may be available on the Play Store page but not accessible via API or web scraping';
        return { 
          success: true, 
          info: info,
          screenshots: [],
          folder: folder,
          error: 'No screenshots available via API or web scraping (may exist on store page)'
        };
      } else {
        console.log(`   ✅ Fallback method captured ${downloadedScreenshots.length} screenshots`);
        info.note = 'Screenshots captured via web scraping fallback method';
      }
    } else {
      console.log(`   📸 Found ${app.screenshots.length} screenshots to download`);

      for (let i = 0; i < app.screenshots.length; i++) {
        const screenshotPath = await downloadImage(app.screenshots[i], folder, i);
        if (screenshotPath) {
          downloadedScreenshots.push(screenshotPath);
        }
      }
    }

    console.log(`   ✅ Downloaded ${downloadedScreenshots.length} screenshots total`);

    return {
      success: true,
      info: info,
      screenshots: downloadedScreenshots,
      folder: folder
    };

  } catch (error) {
    console.error(`❌ Play Store error: ${error.message}`);
    
    // If API fails completely, try fallback method
    try {
      console.log(`   🔄 API failed, attempting fallback method...`);
      const appId = getAppIdFromPlayUrl(url);
      if (!appId) {
        return { success: false, error: 'Invalid Play Store URL' };
      }
      
      const folder = path.join(outputDir, `PlayStore-Fallback-${appId}`);
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
      }
      
      const downloadedScreenshots = await capturePlayStoreScreenshots(url, folder, `App-${appId}`);
      
      if (downloadedScreenshots.length > 0) {
        const info = {
          platform: 'Google Play',
          title: `App (ID: ${appId})`,
          description: 'App information could not be retrieved via API',
          screenshots: [],
          appId: appId,
          url: url,
          note: 'Screenshots captured via web scraping fallback method due to API failure'
        };
        
        fs.writeFileSync(path.join(folder, 'info.json'), JSON.stringify(info, null, 2));
        
        return {
          success: true,
          info: info,
          screenshots: downloadedScreenshots,
          folder: folder
        };
      }
    } catch (fallbackError) {
      console.error(`   ❌ Fallback method also failed: ${fallbackError.message}`);
    }
    
    return { success: false, error: error.message };
  }
}

// Enhanced App Store extraction with multiple fallback methods
async function handleAppStore(url, outputDir) {
  try {
    const appId = getAppIdFromAppleUrl(url);
    if (!appId) {
      console.log(`❌ Invalid App Store URL - could not extract app ID from: ${url}`);
      return { success: false, error: 'Invalid App Store URL' };
    }

    console.log(`🔵 App Store: ${appId}`);
    
    // Try multiple countries and methods
    const countries = ['us', 'gb', 'ae', 'au', 'ca'];
    let app = null;
    let screenshots = [];
    
    for (const country of countries) {
      try {
        console.log(`   🔍 Trying country: ${country.toUpperCase()}`);
        app = await appstore.app({ id: appId, country: country });
        
        if (app.screenshots && app.screenshots.length > 0) {
          screenshots = app.screenshots;
          console.log(`   ✅ Found ${screenshots.length} screenshots using country: ${country.toUpperCase()}`);
          break;
        } else {
          console.log(`   ⚠️ No screenshots found for country: ${country.toUpperCase()}`);
        }
      } catch (error) {
        console.log(`   ❌ Failed for country ${country}: ${error.message}`);
        continue;
      }
    }
    
    if (!app) {
      console.log(`   ❌ Could not fetch app data from any country`);
      return { success: false, error: 'Could not fetch app data from App Store' };
    }
    
    console.log(`   ✅ App data fetched: ${app.title}`);
    
    const folder = path.join(outputDir, `AppStore-${app.title.replace(/\s+/g, '_')}`);
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    const info = {
      platform: 'Apple Store',
      title: app.title,
      description: app.description,
      screenshots: screenshots,
      appId: appId,
      url: url
    };

    fs.writeFileSync(path.join(folder, 'info.json'), JSON.stringify(info, null, 2));
    console.log(`   💾 App info saved to: ${path.join(folder, 'info.json')}`);

    let downloadedScreenshots = [];
    
    if (screenshots.length === 0) {
      console.log(`   ⚠️ No screenshots found for app: ${app.title}`);
      console.log(`   💡 This may be due to App Store API limitations. The app likely has screenshots on the store page.`);
      
      // Try fallback method
      downloadedScreenshots = await captureAppStoreScreenshots(url, folder, app.title);
      
      if (downloadedScreenshots.length === 0) {
        info.note = 'Screenshots may be available on the App Store page but not accessible via API or web scraping';
        return { 
          success: true, 
          info: info,
          screenshots: [],
          folder: folder,
          error: 'No screenshots available via API or web scraping (may exist on store page)'
        };
      } else {
        console.log(`   ✅ Fallback method captured ${downloadedScreenshots.length} screenshots`);
        info.note = 'Screenshots captured via web scraping fallback method';
      }
    } else {
      console.log(`   📸 Found ${screenshots.length} screenshots to download`);

      for (let i = 0; i < screenshots.length; i++) {
        console.log(`   📥 Downloading screenshot ${i + 1}/${screenshots.length}...`);
        const screenshotPath = await downloadImage(screenshots[i], folder, i);
        if (screenshotPath) {
          downloadedScreenshots.push(screenshotPath);
        }
      }
    }

    console.log(`   ✅ Downloaded ${downloadedScreenshots.length} screenshots total`);

    return {
      success: true,
      info: info,
      screenshots: downloadedScreenshots,
      folder: folder
    };

  } catch (error) {
    console.error(`❌ App Store error: ${error.message}`);
    console.error(`   Stack trace: ${error.stack}`);
    return { success: false, error: error.message };
  }
}

// Main function to handle any store URL
async function handleStoreUrl(url, outputDir) {
  try {
    if (url.includes('play.google.com')) {
      return await handlePlayStore(url, outputDir);
    } else if (url.includes('apps.apple.com')) {
      return await handleAppStore(url, outputDir);
    } else {
      return { success: false, error: 'Unsupported store URL' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  handlePlayStore,
  handleAppStore,
  handleStoreUrl,
  getAppIdFromPlayUrl,
  getAppIdFromAppleUrl
};
