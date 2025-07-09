# 🚀 Portfolio Screenshot Tool

A powerful, automated website screenshot and AI analysis tool built with Puppeteer and OpenAI. Perfect for portfolio documentation, competitive analysis, and website audits.

## ✨ Features

- 📸 **High-Quality Screenshots**: Full-page and viewport screenshots with enhanced loading detection
- 🤖 **AI-Powered Analysis**: Comprehensive website analysis using GPT-4 Vision
- 🔍 **Smart Link Crawling**: Automatically discovers and screenshots internal pages
- 🛡️ **Anti-Detection**: Stealth mode with human-like headers and timing
- ⚙️ **Configurable**: Customizable delays, quality settings, and analysis depth
- 📊 **Multiple Output Formats**: JSON and CSV reports for easy data processing
- 🎯 **Flexible Usage**: Screenshot-only mode or analysis-only mode

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

3. **Set up environment variables** (optional, required for AI analysis)
```bash
# Option 1: Export environment variable
export OPENAI_API_KEY="your-openai-api-key-here"

# Option 2: Create .env file
echo "OPENAI_API_KEY=your-openai-api-key-here" > .env
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

## 🎯 Usage

### Basic Commands

```bash
# Take screenshots only (no AI analysis needed)
node screenshot.js --screenshots

# Analyze existing screenshots (requires OpenAI API key)
node screenshot.js --analyze

# Take screenshots AND analyze homepages (recommended workflow)
node screenshot.js --screenshots --analyze
```

### Command Line Options

| Option | Description |
|--------|-------------|
| `--screenshots` | Take screenshots of all websites in urls.txt |
| `--analyze` | Analyze homepage screenshots with AI (requires OpenAI API key) |

### Examples

```bash
# Complete workflow: capture + analyze
node screenshot.js --screenshots --analyze

# Just capture screenshots for later analysis
node screenshot.js --screenshots

# Analyze previously captured screenshots
export OPENAI_API_KEY="sk-..."
node screenshot.js --analyze

# Show help and usage information
node screenshot.js
```

## 📁 Output Structure

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

## 🤖 AI Analysis Features

When using `--analyze`, the tool provides comprehensive reports including:

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

### Performance Tips

- **Faster Processing**: Set `enhancedLoading: false` and `preScreenshotDelay: 1000`
- **Higher Quality**: Increase `preScreenshotDelay` to 5000+ for complex sites
- **Batch Processing**: Process large URL lists in smaller chunks
- **Memory Usage**: Screenshots are high-resolution; monitor disk space

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
  "dotenv": "^16.3.1"
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

---

**Made with ❤️ using Puppeteer and OpenAI GPT-4 Vision** 