const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");
const { createObjectCsvWriter } = require("csv-writer");
const cliProgress = require("cli-progress");

const OUTPUT_DIR = "screenshots";
const REPORTS = [];

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

async function getInternalLinks(baseUrl) {
  try {
    const res = await axios.get(baseUrl);
    const $ = cheerio.load(res.data);
    const links = new Set();

    $("a[href]").each((_, el) => {
      let href = $(el).attr("href");
      if (href.startsWith("/")) href = baseUrl + href;
      if (href.startsWith(baseUrl)) links.add(href.split("#")[0]);
    });

    return Array.from(links);
  } catch (e) {
    console.error(`❌ Failed to fetch links from ${baseUrl}`, e.message);
    return [];
  }
}

async function takeScreenshot(browser, url, saveDir) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    // Set human-like headers
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    await new Promise((resolve) => setTimeout(resolve, 7000)); // wait for Cloudflare
    const selectors = ["body", "div", "section", "article", "header", ".App", "#root > div", "main", "h1", "footer"];
    let found = false;
    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        found = true;
        break;
      } catch (e) {}
    }
    if (!found) {
      console.warn(`⚠️ Could not detect fully rendered page for: ${url}`);
    }

     // Double-check React render pass
    await page.evaluate(() => new Promise(resolve => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
    }));

    const pageName = sanitizeFilename(url);
    const timestamp = Math.floor(Date.now() / 1000);
    const filename = `${pageName}_${timestamp}.jpg`;
    const filepath = path.join(saveDir, filename);

    await autoScroll(page);

    await page.screenshot({
      path: filepath,
      fullPage: true,
      type: "jpeg",
      quality: 80,
    });

    REPORTS.push({ url, file: filepath });
    return true;
  } catch (err) {
    console.error(`❌ Failed to screenshot ${url}`, err.message);
    return false;
  } finally {
    await page.close();
  }
}

async function processWebsite(baseUrl) {
  const domainName = sanitizeFolderName(baseUrl);
  const siteDir = path.join(OUTPUT_DIR, domainName);
  if (!fs.existsSync(siteDir)) fs.mkdirSync(siteDir, { recursive: true });

  const internalLinks = await getInternalLinks(baseUrl);
  const links = Array.from(new Set([baseUrl, ...internalLinks]));

  if (links.length === 0) {
    console.log(`⚠️ No internal links found for ${baseUrl}`);
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
      { id: "file", title: "Screenshot File" },
    ],
  });
  await csvWriter.writeRecords(REPORTS);
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

  const urls = fs
    .readFileSync("urls.txt", "utf-8")
    .split("\n")
    .map((line) => line.trim())
    .filter(line => line && !line.startsWith('#'));

  for (const url of urls) {
    console.log(`🌐 Processing site: ${url}`);
    await processWebsite(url);
  }

  await writeReports();
  console.log(`✅ All done. Reports saved in ${OUTPUT_DIR}/`);
}

async function autoScroll(page) {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 500;
  
        const scrollDown = () => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
  
          if (totalHeight >= scrollHeight - window.innerHeight) {
            clearInterval(downTimer);
  
            // Scroll back to top after 500ms
            setTimeout(() => {
              const scrollUp = () => {
                const y = window.scrollY;
                if (y > 0) {
                  window.scrollBy(0, -distance);
                  requestAnimationFrame(scrollUp);
                } else {
                  resolve();
                }
              };
              scrollUp();
            }, 500);
          }
        };
  
        const downTimer = setInterval(scrollDown, 200);
      });
    });
  }
  

main();
