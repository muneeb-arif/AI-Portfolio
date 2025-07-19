const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const figmaUrl = 'https://www.figma.com/proto/9aITbs6hlkJLzwiKeWlOM7/Travel---Tours--Copy-?page-id=0%3A1&node-id=1-2&viewport=420%2C364%2C0.2&scaling=min-zoom&hide-ui=1';

  // 🌍 Save to Desktop instead of __dirname (safer on macOS)
  const screenshotPath = path.resolve(process.env.HOME, 'Desktop', 'figma-prototype-full.png');

  console.log('📁 __dirname:', __dirname);
  console.log('📍 Screenshot will be saved to:', screenshotPath);

  // 🧪 Test file write permission
  const testPath = path.resolve(process.env.HOME, 'Desktop', 'puppeteer-test.txt');
  try {
    fs.writeFileSync(testPath, 'Puppeteer write test successful!');
    console.log('✅ Test file written:', testPath);
    fs.unlinkSync(testPath); // cleanup
  } catch (err) {
    console.error('❌ File write failed:', err.message);
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      width: 1600,
      height: 1000,
      deviceScaleFactor: 2,
    },
  });

  const page = await browser.newPage();

  // 🔍 Log console messages from page
  page.on('console', msg => {
    console.log('🧩 Page log:', msg.text());
  });

  try {
    console.log('⏳ Loading Figma prototype...');
    await page.goto(figmaUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    console.log('⏱️ Waiting 10 seconds for full render...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    try {
      await page.waitForSelector('canvas', { timeout: 5000 });
    } catch {
      console.warn('⚠️ Warning: Canvas not detected — screenshot may be empty.');
    }

    console.log('📸 Capturing screenshot...');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    if (fs.existsSync(screenshotPath)) {
      console.log(`✅ Screenshot successfully saved at: ${screenshotPath}`);
    } else {
      console.error('❌ Screenshot NOT saved. Possible issues:');
      console.error('- Figma content didn’t render correctly');
      console.error('- Permissions problem with save location');
      console.error('- Screenshot silently failed');
    }

  } catch (err) {
    console.error('❌ Puppeteer error:', err.message);
  } finally {
    await browser.close();
  }
})();
