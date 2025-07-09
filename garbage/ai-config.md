# OpenAI Integration Setup

## 1. Get Your OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key

## 2. Set Up Environment Variables
Create a `.env` file in your project root with:
```
OPENAI_API_KEY=your-actual-api-key-here
REPLICATE_API_TOKEN=your-replicate-api-token-here
```

### Get Replicate API Token:
1. Go to [Replicate](https://replicate.com)
2. Sign up/Login
3. Go to [Account Settings](https://replicate.com/account/api-tokens)
4. Create a new API token

## 3. Configure AI Features
Edit the `AI_CONFIG` object in `screenshot.js`:

```javascript
const AI_CONFIG = {
  analyzeScreenshots: true,  // Enable GPT-4 Vision analysis
  generateImages: false,     // Enable DALL-E image generation
  analysisPrompt: "Your custom analysis prompt...",
  imagePrompt: "Your custom image generation prompt..."
};
```

## 4. Available Features

### Screenshot Analysis (GPT-4 Vision)
- Analyzes each screenshot automatically
- Provides insights about design, UX, functionality
- Saves analysis in JSON and CSV reports

### Custom Image Generation (DALL-E 3)
- Generates new images based on screenshots
- Creates variations or improvements
- Saves generated images alongside originals

## 5. Cost Considerations
- GPT-4 Vision: ~$0.01-0.03 per image analysis
- DALL-E 3: ~$0.04 per generated image
- Monitor your usage at [OpenAI Usage Dashboard](https://platform.openai.com/usage)

## 6. Run the Tools

### Screenshot Tool (Original)
```bash
node screenshot.js
```

The tool will:
1. Take screenshots of all URLs
2. Analyze them with AI (if enabled)
3. Generate custom images (if enabled)
4. Save everything in organized folders with detailed reports

### Interactive AI Image Generator (OpenAI)
```bash
node ai-image-generator.js
```

This tool allows you to:
1. **Select specific screenshots** from your existing collection
2. **Provide custom prompts** for image generation
3. **Generate AI images** based on your screenshots + prompts
4. **Save results** in organized folders with detailed reports

### Folder Mockup Generator (Replicate) - Alternative!
```bash
node generateMockupFromFolder.js
```

This alternative tool uses **Replicate AI** and allows you to:
1. **Select a folder** containing screenshots (e.g., `blueriveranalytics`)
2. **Choose specific images** from that folder with interactive checkboxes
3. **Automatically combines** images horizontally into one image
4. **Generates 3D mockups** using ControlNet SDXL (`lucataco/sdxl-controlnet`)
5. **Downloads and saves** the generated mockup locally
6. **No quota issues** - uses Replicate's pay-per-use model

#### How it works:
1. Enter folder name (from `screenshots/` directory)
2. Select images with arrow keys and spacebar
3. Tool combines images horizontally
4. Sends to Replicate for 3D processing
5. Downloads and saves the final mockup

#### Example Usage:
```
🎨 AI Image Generator
=====================

📸 Available Screenshots:
  1. nationalbonsairegistry/home_1735589573.jpg
  2. nationalbonsairegistry/about_us_1735589574.jpg
  3. vistaoaksrealty/home_1735589575.jpg

Enter screenshot numbers (1,3) or "all": 1,2
💭 Enter your custom prompt: Make this website design more modern with dark theme and neon accents
🎯 Your prompt: "Make this website design more modern with dark theme and neon accents"

Proceed with generation? (y/n): y
```

#### Process:
1. **GPT-4 Vision** analyzes your selected screenshots
2. **Combines** the analysis with your custom prompt
3. **DALL-E 3** generates new images based on the combined prompt
4. **Saves** generated images in `ai-generated-images/` folder 