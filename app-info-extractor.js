const appstore = require('app-store-scraper');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

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

    const downloadedScreenshots = [];
    for (let i = 0; i < app.screenshots.length; i++) {
      const screenshotPath = await downloadImage(app.screenshots[i], folder, i);
      if (screenshotPath) {
        downloadedScreenshots.push(screenshotPath);
      }
    }

    return {
      success: true,
      info: info,
      screenshots: downloadedScreenshots,
      folder: folder
    };

  } catch (error) {
    console.error(`❌ Play Store error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function handleAppStore(url, outputDir) {
  try {
    const appId = getAppIdFromAppleUrl(url);
    if (!appId) {
      return { success: false, error: 'Invalid App Store URL' };
    }

    console.log(`🔵 App Store: ${appId}`);
    const app = await appstore.app({ id: appId });

    const folder = path.join(outputDir, `AppStore-${app.title.replace(/\s+/g, '_')}`);
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    const info = {
      platform: 'Apple Store',
      title: app.title,
      description: app.description,
      screenshots: app.screenshots,
      appId: appId,
      url: url
    };

    fs.writeFileSync(path.join(folder, 'info.json'), JSON.stringify(info, null, 2));

    const downloadedScreenshots = [];
    for (let i = 0; i < app.screenshots.length; i++) {
      const screenshotPath = await downloadImage(app.screenshots[i], folder, i);
      if (screenshotPath) {
        downloadedScreenshots.push(screenshotPath);
      }
    }

    return {
      success: true,
      info: info,
      screenshots: downloadedScreenshots,
      folder: folder
    };

  } catch (error) {
    console.error(`❌ App Store error: ${error.message}`);
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
