# 🚀 Portfolio Screenshot Tool - API Documentation

This tool now provides 3 specialized APIs for capturing screenshots and analyzing different types of URLs.

## 📋 API Overview

| API | Endpoint | Purpose | Analysis Support |
|-----|----------|---------|------------------|
| **Web Screenshots** | `POST /api/web-screenshots` | Capture website screenshots | ✅ |
| **Figma Screenshots** | `POST /api/figma-screenshots` | Capture Figma design screenshots | ✅ |
| **Store Screenshots** | `POST /api/store-screenshots` | Extract app store screenshots & info | ✅ |

## 🏗️ Directory Structure

```
screenshots/
├── web/
│   ├── github/
│   │   ├── homepage_viewport_[timestamp].jpg
│   │   ├── homepage_full_[timestamp].jpg
│   │   └── analysis_[timestamp].txt
│   └── stackoverflow/
│       └── ...
├── figma/
│   ├── Test_Design_System/
│   │   ├── Page_1_-_Frame_1.png
│   │   ├── Page_1_-_Component_1.png
│   │   └── analysis_[timestamp].txt
│   └── ...
└── stores/
    ├── playstore_com_whatsapp/
    │   ├── screenshot_1.jpg
    │   ├── screenshot_2.jpg
    │   ├── info.json
    │   └── analysis_[timestamp].txt
    └── ...
```

## 🔧 Setup

### 1. Environment Variables
Create a `.env` file with:

```bash
# Required for AI analysis
OPENAI_API_KEY=your-openai-api-key-here

# Required for Figma API access (recommended)
FIGMA_PERSONAL_TOKEN=your-figma-personal-access-token-here

# Server configuration
PORT=4000
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Server
```bash
npm start
# or
node server.js
```

## 📡 API Endpoints

### 1. Web Screenshots API

**Endpoint:** `POST /api/web-screenshots`

**Purpose:** Capture screenshots from web URLs using Puppeteer with stealth mode.

**Request Body:**
```json
{
  "urls": [
    "https://github.com",
    "https://stackoverflow.com",
    "https://example.com"
  ],
  "analyze": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Processed 3 web URLs",
  "results": [
    {
      "url": "https://github.com",
      "projectName": "github",
      "screenshot": {
        "fullPage": "screenshots/web/github/homepage_full_1234567890.jpg",
        "viewport": "screenshots/web/github/homepage_viewport_1234567890.jpg"
      },
      "analysis": "SHORT DESCRIPTION: GitHub is a...",
      "analysisFile": "screenshots/web/github/analysis_2024-01-15T10-30-00-000Z.txt",
      "success": true
    }
  ],
  "summary": {
    "total": 3,
    "successful": 3,
    "failed": 0
  }
}
```

### 2. Figma Screenshots API

**Endpoint:** `POST /api/figma-screenshots`

**Purpose:** Capture screenshots from Figma URLs using API or browser fallback.

**Request Body:**
```json
{
  "urls": [
    "https://www.figma.com/file/abc123/Design-System",
    "https://www.figma.com/proto/xyz789/Prototype"
  ],
  "analyze": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Processed 2 Figma URLs",
  "results": [
    {
      "url": "https://www.figma.com/file/abc123/Design-System",
      "projectName": "Design_System",
      "screenshot": {
        "file": "screenshots/figma/Design_System/Page_1_-_Frame_1.png"
      },
      "analysis": "SHORT DESCRIPTION: A comprehensive design system...",
      "analysisFile": "screenshots/figma/Design_System/analysis_2024-01-15T10-30-00-000Z.txt",
      "success": true
    }
  ],
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0
  }
}
```

### 3. Store Screenshots API

**Endpoint:** `POST /api/store-screenshots`

**Purpose:** Extract screenshots and metadata from app store URLs.

**Request Body:**
```json
{
  "urls": [
    "https://play.google.com/store/apps/details?id=com.whatsapp",
    "https://apps.apple.com/us/app/whatsapp-messenger/id310633997"
  ],
  "analyze": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Processed 2 store URLs",
  "results": [
    {
      "url": "https://play.google.com/store/apps/details?id=com.whatsapp",
      "projectName": "playstore_com_whatsapp",
      "screenshots": [
        "screenshots/stores/playstore_com_whatsapp/screenshot_1.jpg",
        "screenshots/stores/playstore_com_whatsapp/screenshot_2.jpg"
      ],
      "info": {
        "platform": "Google Play",
        "title": "WhatsApp Messenger",
        "description": "WhatsApp Messenger is a FREE messaging app...",
        "appId": "com.whatsapp"
      },
      "analysis": "SHORT DESCRIPTION: WhatsApp is a popular messaging app...",
      "analysisFile": "screenshots/stores/playstore_com_whatsapp/analysis_2024-01-15T10-30-00-000Z.txt",
      "success": true
    }
  ],
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0
  }
}
```

## 🤖 AI Analysis

When `analyze: true` is set, each URL is analyzed using OpenAI GPT-4 with the following structure:

### Analysis Output Format:
```
SHORT DESCRIPTION:
[2-line concise description]

DETAILED DESCRIPTION:
[5-10 detailed paragraphs covering:
- Purpose and functionality
- Target audience
- Key features and capabilities
- Design and user experience
- Business model (if applicable)
- Technical implementation
- Market positioning
- Unique selling points
- User engagement strategies
- Overall quality assessment]

KEY FEATURES:
• Feature 1
• Feature 2
• Feature 3
• Feature 4
• Feature 5

TECH STACK:
[Identified technologies, frameworks, platforms, and tools]
```

## ⏱️ Rate Limiting & Delays

- **Random Delays:** 5-10 seconds between each URL processing
- **Respectful Crawling:** Built-in delays to avoid overwhelming servers
- **Stealth Mode:** Uses Puppeteer stealth plugin for anti-detection

## 🔍 Additional Endpoints

### Health Check
```bash
GET /health
```

### API Documentation
```bash
GET /api/docs
```

### Static File Serving
```bash
GET /screenshots/[type]/[project]/[filename]
```

## 🧪 Testing

Run the test script to verify all APIs:

```bash
node test-apis.js
```

## 📝 Usage Examples

### cURL Examples

**Web Screenshots:**
```bash
curl -X POST http://localhost:4000/api/web-screenshots \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://github.com"],
    "analyze": true
  }'
```

**Figma Screenshots:**
```bash
curl -X POST http://localhost:4000/api/figma-screenshots \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://www.figma.com/file/abc123/Design-System"],
    "analyze": true
  }'
```

**Store Screenshots:**
```bash
curl -X POST http://localhost:4000/api/store-screenshots \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://play.google.com/store/apps/details?id=com.whatsapp"],
    "analyze": true
  }'
```

### JavaScript Examples

```javascript
const axios = require('axios');

// Web screenshots
const webResult = await axios.post('http://localhost:4000/api/web-screenshots', {
  urls: ['https://github.com', 'https://stackoverflow.com'],
  analyze: true
});

// Figma screenshots
const figmaResult = await axios.post('http://localhost:4000/api/figma-screenshots', {
  urls: ['https://www.figma.com/file/abc123/Design-System'],
  analyze: true
});

// Store screenshots
const storeResult = await axios.post('http://localhost:4000/api/store-screenshots', {
  urls: ['https://play.google.com/store/apps/details?id=com.whatsapp'],
  analyze: true
});
```

## 🚨 Error Handling

All APIs return consistent error responses:

```json
{
  "error": "Error message description"
}
```

Common error scenarios:
- Invalid URLs
- Network timeouts
- Missing API keys (for analysis)
- File access issues
- Rate limiting

## 🔧 Configuration

### Environment Variables
- `OPENAI_API_KEY`: Required for AI analysis
- `FIGMA_PERSONAL_TOKEN`: Recommended for Figma API access
- `PORT`: Server port (default: 4000)

### Timeouts
- **Web screenshots:** 30 seconds per URL
- **Figma screenshots:** 2 minutes per URL
- **Store screenshots:** 60 seconds per URL
- **AI analysis:** 30 seconds per URL

## 📊 Performance

- **Concurrent processing:** Sequential processing with delays
- **Memory usage:** Optimized for large batches
- **File storage:** Organized by type and project name
- **Error recovery:** Continues processing even if individual URLs fail

## 🔒 Security

- **Input validation:** All URLs are validated
- **File system isolation:** Screenshots stored in dedicated directories
- **API key protection:** Environment variables for sensitive data
- **CORS enabled:** For cross-origin requests 