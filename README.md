# 🚀 Portfolio Screenshot Tool

A powerful, automated website screenshot and AI analysis tool built with Puppeteer and OpenAI. Perfect for portfolio documentation, competitive analysis, and website audits.

## ✨ Features

- 📸 **High-Quality Screenshots**: Full-page and viewport screenshots with enhanced loading detection
- 🤖 **AI-Powered Analysis**: Comprehensive website analysis using GPT-4 Vision
- 🔍 **Smart Link Crawling**: Automatically discovers and screenshots internal pages (up to 10)
- 🎨 **Figma Support**: Capture screenshots from Figma files using API or browser methods
- 📱 **App Store Integration**: Extract screenshots and metadata from Play Store and Apple App Store
- 🛡️ **Anti-Detection**: Stealth mode with human-like headers and timing
- ⚙️ **Configurable**: Customizable delays, quality settings, and analysis depth
- 📊 **Multiple Output Formats**: JSON and CSV reports for easy data processing
- 🎯 **Flexible Usage**: Screenshot-only mode, analysis-only mode, or combined
- 🌐 **RESTful APIs**: Three separate APIs for web, Figma, and app store screenshots
- 🔄 **Deep Capture**: Automatically crawl and capture internal links from websites
- ⏱️ **Smart Delays**: Random delays between requests to avoid rate limiting
- 📁 **Structured Output**: Organized directory structure with project-based naming

## 🛠️ Installation

### Prerequisites
- **Node.js** 14+ 
- **npm** or **yarn**
- **OpenAI API Key** (required for `--analyze` option)

### Setup

1. **Clone or download the project**
```bash
git clone <repository-url>
cd portfolio-screenshot-tool
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
# Copy example environment file
cp example.env .env

# Edit .env file with your actual values
# Required for CLI analysis and API server:
OPENAI_API_KEY=your-openai-api-key-here

# Required for API server:
API_KEY=your-secure-api-key-here
JWT_SECRET=your-jwt-secret-key-here

# Optional - for Figma API access (recommended for private files):
FIGMA_PERSONAL_TOKEN=your-figma-personal-access-token-here

# Optional:
REPLICATE_API_TOKEN=your-replicate-api-token-here
PORT=3000
```

4. **Create URLs file**
```bash
# Create urls.txt with websites to process
echo "https://example.com
https://github.com
https://stackoverflow.com
# Comments start with #
https://your-website.com" > urls.txt
```

## 🎨 Figma Support

The tool includes enhanced support for capturing screenshots from Figma files:

### Method 1: API Method (Recommended for Private Files)
```bash
# Use the dedicated Figma API tool
node figma-api.js "https://www.figma.com/file/abc123/Design-System"

# Or add Figma URLs to urls.txt for batch processing
echo "https://www.figma.com/proto/xyz789/Prototype?node-id=0%3A1" >> urls.txt
```

**Requirements:**
- `FIGMA_PERSONAL_TOKEN` in your `.env` file
- File must be accessible with your token

### Method 2: Browser Method (Works with Public Files)
```bash
# Use the browser-based Figma tool
node figma-test.js "https://www.figma.com/proto/abc123/Prototype"
```

### Setup Figma API Access
See [FIGMA_API_SETUP.md](FIGMA_API_SETUP.md) for detailed instructions on:
- Getting a personal access token
- Setting up file permissions
- Troubleshooting common issues

## 🎯 Usage

### 🖥️ Command Line Interface

#### Basic Commands

```bash
# Take screenshots only (no AI analysis needed)
node screenshot.js --screenshots

# Analyze existing screenshots (requires OpenAI API key)
node screenshot.js --analyze

# Take screenshots AND analyze homepages (recommended workflow)
node screenshot.js --screenshots --analyze
```

#### NPM Scripts

```bash
# Using npm scripts (easier)
npm run screenshot          # Take screenshots only
npm run analyze            # Analyze existing screenshots
npm run full              # Screenshots + analysis
```

#### Command Line Options

| Option | Description |
|--------|-------------|
| `--screenshots` | Take screenshots of all websites in urls.txt |
| `--analyze` | Analyze homepage screenshots with AI (requires OpenAI API key) |

### 🌐 RESTful API Server

Start the API server for remote access and integrations:

```bash
# Start API server
npm start
# or
node server.js

# Development mode
npm run dev
```

#### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /api/web-screenshots` | POST | Capture screenshots from web URLs |
| `POST /api/figma-screenshots` | POST | Capture screenshots from Figma URLs |
| `POST /api/store-screenshots` | POST | Extract screenshots from app store URLs |
| `GET /api/docs` | GET | API documentation |
| `GET /health` | GET | Server health check |

#### API 1: Web Screenshots API

**Endpoint**: `POST /api/web-screenshots`

**Features**:
- Capture full-page and viewport screenshots
- Deep capture mode to crawl internal links (up to 10)
- AI analysis with detailed reports
- Configurable capture and analysis options

**Request Body**:
```json
{
  "urls": ["https://example.com", "https://oso.nyc/"],
  "analyze": true,
  "deep_capture": true,
  "capture": true
}
```

**Parameters**:
- `urls` (required): Array of web URLs to process
- `analyze` (optional): Enable AI analysis (default: false)
- `deep_capture` (optional): Capture internal links (default: false)
- `capture` (optional): Enable screenshot capture (default: true)

**Response**:
```json
{
  "success": true,
  "message": "Processed 2 web URLs",
  "results": [
    {
      "url": "https://oso.nyc/",
      "projectName": "oso",
      "deepCapture": true,
      "totalUrls": 8,
      "screenshots": [
        {
          "url": "https://oso.nyc/",
          "success": true,
          "fullPage": "/path/to/home_full.jpg",
          "viewport": "/path/to/home_viewport.jpg"
        }
      ],
      "analysis": "AI analysis text...",
      "analysisFile": "/path/to/analysis.txt"
    }
  ]
}
```

#### API 2: Figma Screenshots API

**Endpoint**: `POST /api/figma-screenshots`

**Features**:
- Export individual layers as PNG images
- Support for both API and browser methods
- AI analysis of Figma designs
- Configurable capture options

**Request Body**:
```json
{
  "urls": ["https://www.figma.com/proto/abc123/Design"],
  "analyze": true,
  "capture": true
}
```

**Parameters**:
- `urls` (required): Array of Figma URLs to process
- `analyze` (optional): Enable AI analysis (default: false)
- `capture` (optional): Enable screenshot capture (default: true)

#### API 3: App Store Screenshots API

**Endpoint**: `POST /api/store-screenshots`

**Features**:
- Extract screenshots from Play Store and Apple App Store
- Get app metadata and information
- AI analysis of app store listings
- Support for both platforms

**Request Body**:
```json
{
  "urls": [
    "https://play.google.com/store/apps/details?id=com.example.app",
    "https://apps.apple.com/app/example-app/id123456789"
  ],
  "analyze": true,
  "capture": true
}
```

**Parameters**:
- `urls` (required): Array of app store URLs to process
- `analyze` (optional): Enable AI analysis (default: false)
- `capture` (optional): Enable screenshot capture (default: true)

#### API Usage Examples

**Web Screenshots with Deep Capture**:
```bash
curl -X POST http://localhost:3000/api/web-screenshots \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://oso.nyc/"],
    "deep_capture": true,
    "analyze": true,
    "capture": true
  }'
```

**Figma Screenshots**:
```bash
curl -X POST http://localhost:3000/api/figma-screenshots \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://www.figma.com/proto/abc123/Design"],
    "analyze": true,
    "capture": true
  }'
```

**App Store Screenshots**:
```bash
curl -X POST http://localhost:3000/api/store-screenshots \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://play.google.com/store/apps/details?id=com.example.app"],
    "analyze": true,
    "capture": true
  }'
```

**Analysis Only (No Screenshots)**:
```bash
curl -X POST http://localhost:3000/api/web-screenshots \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://oso.nyc/"],
    "capture": false,
    "analyze": true
  }'
```

## 📁 Output Structure

### CLI Mode Output
```
screenshots/
├── example-com/
│   ├── home_full_1673123456.jpg           # Homepage full screenshot
│   ├── home_viewport_1673123456.jpg       # Homepage viewport screenshot
│   ├── about_full_1673123456.jpg          # About page full screenshot
│   ├── about_viewport_1673123456.jpg      # About page viewport screenshot
│   └── example-com_analysis_2024-01-15.txt # 🤖 AI Analysis Report
├── github-com/
│   ├── home_full_1673123456.jpg
│   ├── home_viewport_1673123456.jpg
│   └── github-com_analysis_2024-01-15.txt
├── report_1673123456.json                 # Detailed JSON report
└── report_1673123456.csv                  # CSV report for spreadsheets
```

### API Mode Output
```
screenshots/
├── web/
│   ├── oso/
│   │   ├── home_full_1752938608.jpg
│   │   ├── home_viewport_1752938608.jpg
│   │   ├── about_us_full_1752938635.jpg
│   │   ├── about_us_viewport_1752938635.jpg
│   │   ├── services_full_1752938657.jpg
│   │   ├── services_viewport_1752938657.jpg
│   │   └── analysis_2025-07-19T15-30-15-144Z.txt
├── figma/
│   ├── Travel___Tours__Copy_/
│   │   ├── Page_1 - Home_page_.png
│   │   └── Page_1 - Frame_1.png
│   └── My_Medi_Logs__Copy_/
│       ├── iPhone_16_Pro_Max_-_1.png
│       ├── iPhone_16_Pro_Max_-_2.png
│       └── ...
└── stores/
    ├── playstore_com.gohomie.app/
    │   └── PlayStore-Homie/
    │       ├── screenshot_1.jpg
    │       ├── screenshot_2.jpg
    │       └── ...
    └── appstore_6450675083/
        └── AppStore-Homie/
            ├── screenshot_1.jpg
            ├── screenshot_2.jpg
            └── ...
```

## ⚙️ Configuration

Edit the `AI_CONFIG` object in `screenshot.js` to customize behavior:

```javascript
const AI_CONFIG = {
  analyzeScreenshots: shouldAnalyze,         // Based on --analyze flag
  generateImages: false,                     // Enable AI image generation
  crawlInternalLinks: shouldTakeScreenshots, // Crawl internal pages
  enhancedLoading: shouldTakeScreenshots,    // Use enhanced loading detection
  preScreenshotDelay: 3000,                  // Extra delay before screenshots (ms)
  
  // Customize analysis depth and focus
  analysisPrompt: "...",                     // AI analysis instructions
};
```

### Configuration Options

| Setting | Default | Description |
|---------|---------|-------------|
| `preScreenshotDelay` | `3000` | Additional delay in ms before taking screenshots |
| `enhancedLoading` | `true` | Wait for images, fonts, and JS frameworks |
| `crawlInternalLinks` | `true` | Discover and screenshot internal pages |
| `generateImages` | `false` | Generate AI variations using DALL-E |

## 🔍 Deep Capture Features

The deep capture functionality automatically discovers and captures internal links from websites:

### How It Works
1. **Link Discovery**: Crawls the main page to find internal links
2. **Smart Filtering**: Filters out external links, anchors, and duplicates
3. **Limit Control**: Captures up to 10 internal links maximum
4. **Structured Output**: Organizes screenshots by page type
5. **Delay Management**: Adds 5-second delays between captures

### Deep Capture Example
```bash
curl -X POST http://localhost:3000/api/web-screenshots \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://oso.nyc/"],
    "deep_capture": true,
    "analyze": false
  }'
```

**Output**: Captures homepage + about, services, portfolio, contact, etc.

## 🤖 AI Analysis Features

When using `--analyze` or `analyze: true`, the tool provides comprehensive reports including:

### 📝 Analysis Sections
- **Short Description**: Concise 1-2 sentence summary
- **Long Description**: Detailed 3-4 paragraph analysis
- **Key Features**: Visible functionality and interactive elements
- **Tech Stack Analysis**: Technology identification from visual clues
- **Design & Visual Elements**: Aesthetic and branding assessment
- **User Experience Assessment**: Navigation and usability evaluation
- **Professional Assessment**: Rating and improvement recommendations

### 💻 Tech Stack Detection
The AI attempts to identify:
- Frontend frameworks (React, Vue, Angular)
- UI libraries (Bootstrap, Material UI, Tailwind)
- CMS platforms (WordPress, Shopify)
- E-commerce indicators
- Third-party integrations

## 📊 Reports & Output

### JSON Report Structure
```json
{
  "url": "https://example.com",
  "fullPageFile": "screenshots/example-com/home_full_1673123456.jpg",
  "viewportFile": "screenshots/example-com/home_viewport_1673123456.jpg",
  "aiAnalysis": "Comprehensive AI analysis text...",
  "customImage": null
}
```

### Analysis Report Format
```
🌐 WEBSITE ANALYSIS REPORT
═══════════════════════════════════════════════════════════════

📅 Analysis Date: 1/15/2024, 10:30:45 AM
🔗 Website URL: https://example.com
📸 Screenshot: home_full_1673123456.jpg

📝 SHORT DESCRIPTION:
[AI-generated short description]

📖 LONG DESCRIPTION:
[AI-generated detailed analysis]

🔧 KEY FEATURES:
[Identified features and functionality]

💻 TECH STACK ANALYSIS:
[Technology identification]

[Additional sections...]

═══════════════════════════════════════════════════════════════
Generated by Portfolio Screenshot Tool
```

## 🔧 Troubleshooting

### Common Issues

**Screenshots appear broken or incomplete:**
- Increase `preScreenshotDelay` to 5000ms or higher
- Enable `enhancedLoading` for better compatibility
- Check if the website blocks automated browsers

**Analysis fails:**
- Verify your OpenAI API key is set correctly
- Check your OpenAI account has sufficient credits
- Ensure the screenshots directory exists

**Browser launch errors:**
- Install Chromium dependencies: `npx puppeteer browsers install chrome`
- On Linux: `sudo apt-get install -y chromium-browser`
- On macOS: Ensure Xcode command line tools are installed

**No screenshots generated:**
- Verify urls.txt exists and contains valid URLs
- Check that URLs are accessible (not behind authentication)
- Ensure sufficient disk space for screenshots

**Deep capture not working:**
- Check if the website allows crawling
- Verify internal links are properly formatted
- Ensure the website doesn't block automated access

**Figma API errors:**
- Verify your Figma personal access token is valid
- Check if the file is accessible with your token
- Ensure the file is not private or restricted

**App Store extraction fails:**
- Verify the app store URLs are valid and accessible
- Check if the app is available in the specified region
- Ensure the app store doesn't block automated access

### Performance Tips

- **Faster Processing**: Set `enhancedLoading: false` and `preScreenshotDelay: 1000`
- **Higher Quality**: Increase `preScreenshotDelay` to 5000+ for complex sites
- **Batch Processing**: Process large URL lists in smaller chunks
- **Memory Usage**: Screenshots are high-resolution; monitor disk space
- **Deep Capture**: Use sparingly as it can generate many screenshots
- **API Rate Limits**: Add delays between requests to avoid being blocked

## 📋 Requirements

### Dependencies
```json
{
  "puppeteer-extra": "^3.3.6",
  "puppeteer-extra-plugin-stealth": "^2.11.2",
  "axios": "^1.6.0",
  "cheerio": "^1.0.0-rc.12",
  "csv-writer": "^1.6.0",
  "cli-progress": "^3.12.0",
  "openai": "^4.20.0",
  "dotenv": "^16.3.1",
  "express": "^4.18.2",
  "cors": "^2.8.5"
}
```

### System Requirements
- **RAM**: 2GB+ recommended (4GB+ for large batches)
- **Storage**: ~5-10MB per website (full + viewport screenshots)
- **Network**: Stable internet connection
- **OS**: Windows, macOS, or Linux

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly with various websites
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙋‍♂️ Support

- **Issues**: Report bugs via GitHub Issues
- **Questions**: Check existing issues or create a new one
- **Feature Requests**: Open an issue with the `enhancement` label

## 📞 Contact Us

If you need any help, contact at:

- 📱 **WhatsApp**: [+92-333-8238308](https://wa.me/923338238308)
- 💼 **LinkedIn**: [https://www.linkedin.com/in/muneebarif11/](https://www.linkedin.com/in/muneebarif11/)
- 📧 **Email**: [muneebarif11@gmail.com](mailto:muneebarif11@gmail.com)

## 🎯 Use Cases

- **Portfolio Documentation**: Capture your work for presentations
- **Competitive Analysis**: Analyze competitor websites systematically  
- **Website Audits**: Document client sites before/after changes
- **Design Research**: Collect visual inspiration and patterns
- **Quality Assurance**: Automated visual regression testing
- **Client Reports**: Generate professional analysis reports
- **App Store Research**: Analyze competitor apps and their store presence
- **Figma Design Documentation**: Export and analyze design prototypes
- **Deep Website Analysis**: Comprehensive internal page documentation

---

**Made with ❤️ using Puppeteer and OpenAI GPT-4 Vision** 