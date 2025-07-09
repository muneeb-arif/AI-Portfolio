require('dotenv').config();

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const OpenAI = require('openai');
const axios = require('axios');

// Configuration
const SCREENSHOTS_DIR = 'screenshots';
const OUTPUT_DIR = 'ai-generated-images';
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Utility functions
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function getAllScreenshots() {
  const screenshots = [];
  
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    console.log(`❌ Screenshots directory not found: ${SCREENSHOTS_DIR}`);
    return screenshots;
  }

  // Get all subdirectories
  const domains = fs.readdirSync(SCREENSHOTS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  domains.forEach(domain => {
    const domainPath = path.join(SCREENSHOTS_DIR, domain);
    const files = fs.readdirSync(domainPath)
      .filter(file => file.match(/\.(jpg|jpeg|png)$/i))
      .map(file => ({
        domain,
        filename: file,
        fullPath: path.join(domainPath, file),
        displayName: `${domain}/${file}`
      }));
    screenshots.push(...files);
  });

  return screenshots;
}

function displayScreenshots(screenshots) {
  console.log('\n📸 Available Screenshots:');
  screenshots.forEach((screenshot, index) => {
    console.log(`  ${index + 1}. ${screenshot.displayName}`);
  });
  console.log('');
}

function encodeImageToBase64(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  return imageBuffer.toString('base64');
}

async function analyzeMultipleImagesWithGPT4Vision(imagePaths, customPrompt) {
  try {
    // Create content array starting with the text prompt
    const content = [
      {
        type: "text",
        text: `Analyze these ${imagePaths.length} website screenshots and create a detailed description that will be used to generate a new image with DALL-E. Focus on the visual elements, layouts, colors, styles, and design elements from all the screenshots. Then incorporate this user request: "${customPrompt}"`
      }
    ];

    // Add each image to the content array
    imagePaths.forEach((imagePath, index) => {
      const base64Image = encodeImageToBase64(imagePath);
      content.push({
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${base64Image}`,
          detail: "high"
        }
      });
    });
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: content
        }
      ],
      max_tokens: 1500
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('❌ Error analyzing images:', error.message);
    return null;
  }
}

async function generateImageWithDALLE(prompt, originalImageName) {
  try {
    console.log('🎨 Generating image with DALL-E...');
    
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      size: "1024x1024",
      quality: "standard",
      style: "vivid", // Optional: vivid or natural
      n: 1
    });

    const imageUrl = response.data[0].url;
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    
    const timestamp = Date.now();
    const outputFileName = `generated_${originalImageName.replace(/\.[^/.]+$/, '')}_${timestamp}.png`;
    const outputPath = path.join(OUTPUT_DIR, outputFileName);
    
    fs.writeFileSync(outputPath, imageResponse.data);
    
    return outputPath;
  } catch (error) {
    console.error('❌ Error generating image:', error.message);
    return null;
  }
}

async function processImageGeneration(selectedScreenshots, userPrompt) {
  ensureOutputDir();
  
  console.log('\n🚀 Starting AI image generation...\n');
  console.log(`Processing ${selectedScreenshots.length} screenshots together with your custom prompt...`);
  
  // Step 1: Analyze ALL images together with GPT-4 Vision
  console.log('🔍 Analyzing all screenshots together...');
  const imagePaths = selectedScreenshots.map(s => s.fullPath);
  const imageAnalysis = await analyzeMultipleImagesWithGPT4Vision(imagePaths, userPrompt);
  
  if (!imageAnalysis) {
    console.log('❌ Failed to analyze screenshots');
    return [];
  }
  
  console.log('✅ Analysis completed!');
  
  // Step 2: Generate ONE image with DALL-E using all screenshots
  console.log('🎨 Generating combined image with DALL-E...');
  const combinedName = selectedScreenshots.map(s => s.domain).join('_');
  const generatedImagePath = await generateImageWithDALLE(imageAnalysis, combinedName);
  
  if (generatedImagePath) {
    console.log(`✅ Generated: ${generatedImagePath}`);
    return [{
      originalScreenshots: selectedScreenshots.map(s => s.fullPath),
      generated: generatedImagePath,
      prompt: userPrompt,
      analysis: imageAnalysis,
      screenshotCount: selectedScreenshots.length
    }];
  } else {
    console.log('❌ Failed to generate image');
    return [];
  }
}

function saveResults(results) {
  const timestamp = Date.now();
  const reportPath = path.join(OUTPUT_DIR, `generation_report_${timestamp}.json`);
  
  const report = {
    timestamp: new Date().toISOString(),
    totalGenerated: results.length,
    results: results
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📊 Report saved: ${reportPath}`);
}

async function main() {
  console.log('🎨 AI Image Generator');
  console.log('=====================\n');
  
  // Check if OpenAI API key is set
  if (!process.env.OPENAI_API_KEY) {
    console.log('❌ OpenAI API key not found. Please set OPENAI_API_KEY in your .env file');
    rl.close();
    return;
  }
  
  // Get all available screenshots
  const screenshots = getAllScreenshots();
  
  if (screenshots.length === 0) {
    console.log('❌ No screenshots found. Run screenshot.js first to capture some websites.');
    rl.close();
    return;
  }
  
  // Display available screenshots
  displayScreenshots(screenshots);
  
  // Get user input for screenshot selection
  const selectionInput = await question('Enter screenshot numbers (comma-separated, e.g., 1,3,5) or "all" for all screenshots: ');
  
  let selectedScreenshots = [];
  
  if (selectionInput.toLowerCase() === 'all') {
    selectedScreenshots = screenshots;
  } else {
    const indices = selectionInput.split(',').map(s => parseInt(s.trim()) - 1);
    selectedScreenshots = indices
      .filter(i => i >= 0 && i < screenshots.length)
      .map(i => screenshots[i]);
  }
  
  if (selectedScreenshots.length === 0) {
    console.log('❌ No valid screenshots selected.');
    rl.close();
    return;
  }
  
  console.log(`\n📋 Selected ${selectedScreenshots.length} screenshot(s):`);
  selectedScreenshots.forEach(s => console.log(`  - ${s.displayName}`));
  
  // Get custom prompt from user
  const userPrompt = await question('\n💭 Enter your custom prompt for image generation: ');
  
  if (!userPrompt.trim()) {
    console.log('❌ No prompt provided.');
    rl.close();
    return;
  }
  
  console.log(`\n🎯 Your prompt: "${userPrompt}"`);
  
  const confirm = await question('\nProceed with generation? (y/n): ');
  if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
    console.log('❌ Generation cancelled.');
    rl.close();
    return;
  }
  
  // Process the generation
  const results = await processImageGeneration(selectedScreenshots, userPrompt);
  
  // Save results
  if (results.length > 0) {
    saveResults(results);
    console.log(`\n🎉 Successfully generated 1 combined image using ${results[0].screenshotCount} screenshots!`);
    console.log(`📁 Image saved in: ${OUTPUT_DIR}/`);
  } else {
    console.log('\n😞 No images were generated.');
  }
  
  rl.close();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!');
  rl.close();
  process.exit(0);
});

main().catch(console.error); 