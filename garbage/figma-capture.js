const puppeteer = require('puppeteer');

(async () => {
  const figmaUrl = 'https://www.figma.com/proto/9aITbs6hlkJLzwiKeWlOM7/Travel---Tours--Copy-?page-id=0%3A1&node-id=1-2&viewport=420%2C364%2C0.2&scaling=min-zoom&hide-ui=1';

  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1600, height: 1000 },
  });

  const page = await browser.newPage();

  console.log('⏳ Loading Figma prototype...');
  await page.goto(figmaUrl, { waitUntil: 'networkidle2' });

  // ⏱️ Replace waitForTimeout with a Promise-based delay
  console.log('⏱️ Waiting 10 seconds for full render...');
  await new Promise(resolve => setTimeout(resolve, 10000));

  await page.screenshot({ path: 'figma-prototype-full.png', fullPage: true });

  console.log('✅ Screenshot saved as figma-prototype-full.png');

  await browser.close();
})();
