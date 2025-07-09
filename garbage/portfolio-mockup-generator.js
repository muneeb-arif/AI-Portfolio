require("dotenv").config();
const Replicate = require("replicate");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const fetch = require('node-fetch');

if (!process.env.REPLICATE_API_TOKEN) {
  console.error("❌ REPLICATE_API_TOKEN required in .env file");
  process.exit(1);
}

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// 🎯 Perfect model for complex portfolio mockups
const MODEL_ID = "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b";

// 🎨 Your portfolio mockup prompt
const DEFAULT_PROMPT = "1 mac-book-pro, full sceen with attached image. no text. no any other elements. do not change original image.";

// Command line arguments
const sourceImagePath = process.argv[2] || "./images/bonsai-tree.png";
const customPrompt = process.argv.slice(3).join(' ') || DEFAULT_PROMPT;

async function loadImageAsBase64(imagePath) {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image file not found: ${imagePath}`);
  }
  
  const resizedBuffer = await sharp(imagePath)
    .resize({ width: 1024, height: 768, fit: 'inside' })
    .jpeg({ quality: 90 })
    .toBuffer();
  
  console.log(`📏 Resized image: ${Math.round(resizedBuffer.length / 1024)}KB`);
  
  return `data:image/jpeg;base64,${resizedBuffer.toString('base64')}`;
}

async function generatePortfolioMockup() {
  try {
    console.log("🚀 Portfolio Mockup Generator");
    console.log(`🖼️  Source: ${sourceImagePath}`);
    console.log(`📝 Prompt: ${customPrompt.substring(0, 100)}...`);
    console.log(`⚙️  Using optimized settings for complex prompts...\n`);
    
    const imageBase64 = await loadImageAsBase64(sourceImagePath);
    console.log("✅ Image loaded and processed");
    
    console.log("🎨 Generating portfolio mockup (this may take 30-60 seconds)...");
    
    const output = await replicate.run(MODEL_ID, {
      input: {
        prompt: customPrompt,
        negative_prompt: "low quality, blurry, pixelated, distorted, ugly, bad composition, messy layout, amateur design, poor lighting",
        image: imageBase64,
        prompt_strength: 0.9,    // Perfect for scene transformation
        num_inference_steps: 40, // High quality for complex details  
        guidance_scale: 10.0,     // Strong prompt following
        width: 1024,
        height: 768,             // Ideal for portfolio displays
        scheduler: "DPMSolverMultistep",
        seed: Math.floor(Math.random() * 1000000)
      }
    });
    
    console.log("✅ Generation complete!");
    
    // Download and save
    const imageUrl = Array.isArray(output) ? output[0] : output;
    const response = await fetch(imageUrl);
    const buffer = await response.buffer();
    
    const timestamp = Date.now();
    const fileName = `portfolio-mockup-${timestamp}.jpg`;
    const fullPath = path.resolve(fileName);
    
    fs.writeFileSync(fileName, buffer);
    
    const fileSizeMB = (buffer.length / 1024 / 1024).toFixed(2);
    
    console.log(`💾 Portfolio mockup saved: ${fileName}`);
    console.log(`📂 Full path: ${fullPath}`);
    console.log(`📊 File size: ${fileSizeMB}MB`);
    console.log(`🎯 Result: Professional portfolio mockup with 3D floating effect!`);
    console.log(`\n💡 TIP: Open file location with: open "${path.dirname(fullPath)}"`);
    
    return fileName;
    
  } catch (error) {
    console.error("❌ Error generating portfolio mockup:", error.message);
    throw error;
  }
}

// Show help if no arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🎨 **PORTFOLIO MOCKUP GENERATOR**

Generate professional portfolio mockups with 3D floating webpage effects!

📋 USAGE:
  node portfolio-mockup-generator.js [image_path] [custom_prompt]

🎯 EXAMPLES:

  # Use default settings
  node portfolio-mockup-generator.js

  # Custom image
  node portfolio-mockup-generator.js ./my-screenshot.png

  # Custom image + prompt  
  node portfolio-mockup-generator.js ./screenshot.png "Modern mobile app showcase with floating phone mockups"

  # Just custom prompt (default image)
  node portfolio-mockup-generator.js "" "Elegant website gallery with laptop displays"

✨ FEATURES:
- ⭐ Optimized for complex portfolio mockups
- 🎨 3D floating effects with shadows & reflections  
- 💻 Professional UI/UX presentation style
- 📱 Works with any screenshot or design
- 🚀 High-quality 1024x768 output

💡 TIP: Use screenshots of your websites, apps, or designs as input!
`);
  process.exit(0);
}

console.log(`
🎨 **PORTFOLIO MOCKUP GENERATOR**

✅ Optimized SDXL settings for complex prompts
🎯 Perfect for UI/UX portfolio presentations  
💎 Professional 3D floating mockup effects

🚀 Starting generation...
`);

generatePortfolioMockup(); 