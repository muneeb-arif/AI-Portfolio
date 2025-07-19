const appstore = require('app-store-scraper');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// ✅ Use your app links here
const urls = [
  'https://play.google.com/store/apps/details?id=com.gohomie.app&hl=en&pli=1',
  'https://apps.apple.com/ae/app/homie/id6450675083'
];

const OUTPUT_DIR = path.resolve(__dirname, 'app-store-data');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function getAppIdFromPlayUrl(url) {
  const match = url.match(/id=([\w\.]+)/);
  return match ? match[1] : null;
}

function getAppIdFromAppleUrl(url) {
  const match = url.match(/id(\d+)/);
  return match ? match[1] : null;
}

async function downloadImage(url, folder, index) {
  const res = await fetch(url);
  const buffer = await res.buffer();
  const file = path.join(folder, `screenshot_${index + 1}.jpg`);
  fs.writeFileSync(file, buffer);
  console.log(`🖼️  Saved: ${file}`);
}

async function handlePlayStore(url) {
  const appId = getAppIdFromPlayUrl(url);
  if (!appId) return console.error('❌ Invalid Play Store URL:', url);

  console.log(`🟢 Play Store: ${appId}`);
  const gplay = await import('google-play-scraper');
  const app = await gplay.default.app({ appId });

  const folder = path.join(OUTPUT_DIR, `PlayStore-${app.title.replace(/\s+/g, '_')}`);
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

  fs.writeFileSync(path.join(folder, 'info.json'), JSON.stringify({
    platform: 'Google Play',
    title: app.title,
    description: app.description,
    screenshots: app.screenshots
  }, null, 2));

  for (let i = 0; i < app.screenshots.length; i++) {
    await downloadImage(app.screenshots[i], folder, i);
  }
}

async function handleAppStore(url) {
  const appId = getAppIdFromAppleUrl(url);
  if (!appId) return console.error('❌ Invalid App Store URL:', url);

  console.log(`🔵 App Store: ${appId}`);
  const app = await appstore.app({ id: appId });

  const folder = path.join(OUTPUT_DIR, `AppStore-${app.title.replace(/\s+/g, '_')}`);
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

  fs.writeFileSync(path.join(folder, 'info.json'), JSON.stringify({
    platform: 'Apple Store',
    title: app.title,
    description: app.description,
    screenshots: app.screenshots
  }, null, 2));

  for (let i = 0; i < app.screenshots.length; i++) {
    await downloadImage(app.screenshots[i], folder, i);
  }
}

(async () => {
  for (const url of urls) {
    try {
      if (url.includes('play.google.com')) {
        await handlePlayStore(url);
      } else if (url.includes('apps.apple.com')) {
        await handleAppStore(url);
      } else {
        console.log(`⚠️ Unknown URL type: ${url}`);
      }
    } catch (err) {
      console.error(`❌ Failed to process ${url}:`, err.message);
    }
  }

  console.log('✅ Done');
})();
