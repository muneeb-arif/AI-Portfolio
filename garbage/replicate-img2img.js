require("dotenv").config();
const axios = require("axios");
const Replicate = require("replicate");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

// Check for required API token
if (!process.env.REPLICATE_API_TOKEN) {
  console.error("❌ REPLICATE_API_TOKEN environment variable is required!");
  console.error("📝 Get your token from: https://replicate.com/account/api-tokens");
  console.error("💡 Create a .env file with: REPLICATE_API_TOKEN=your_token_here");
  process.exit(1);
}

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// ✅ Using the working SDXL model we verified earlier
const MODEL_ID = "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b";

// Load local image, resize for memory efficiency, and convert to base64
async function loadLocalImageAsBase64(imagePath, maxWidth = 768, maxHeight = 512) {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image file not found: ${imagePath}`);
  }
  
  // Resize image to reduce memory usage
  const resizedBuffer = await sharp(imagePath)
    .resize({ 
      width: maxWidth, 
      height: maxHeight, 
      fit: 'inside', // Maintain aspect ratio
      withoutEnlargement: true // Don't upscale if already smaller
    })
    .jpeg({ quality: 85 }) // Convert to JPEG for smaller size
    .toBuffer();
  
  console.log(`📏 Resized image: ${Math.round(resizedBuffer.length / 1024)}KB (was ${Math.round(fs.statSync(imagePath).size / 1024)}KB)`);
  
  return `data:image/jpeg;base64,${resizedBuffer.toString('base64')}`;
}

const sourceImagePath = "./images/person2.png";

// ✅ GOOD img2img prompts - Focus on STYLE/MOOD, not detailed descriptions
// const prompt = "professional headshot, studio lighting, clean background, corporate style";

// ❌ BAD img2img prompts (too detailed, contradicts source image):
// "A hyper-realistic close-up portrait of a young man's face, with only the left half visible and partially submerged in water..."

// 🎨 Other good examples you can try:
// const prompt = "oil painting style, artistic portrait";
// const prompt = "vintage sepia photograph, 1940s style"; 
// const prompt = "digital art, cyberpunk aesthetic, neon colors";
const prompt = "black and white photography, dramatic lighting";
// const prompt = "watercolor painting, soft artistic style";

async function generateImage() {
    try {
        console.log("🚀 Starting img2img generation with SDXL...");
        console.log(`🖼️  Source image: ${sourceImagePath}`);
        console.log(`📝 Style prompt: ${prompt}`);
        console.log(`\n🎛️  img2img Settings:`);
        console.log(`   • prompt_strength: 0.3 (how much to change - lower = keeps original better)`);
        console.log(`   • guidance_scale: 6.0 (how closely to follow prompt - lower = more natural)`);
        console.log(`   • steps: 20 (quality vs speed trade-off)`);
        console.log(`   • size: 768x768 (square works well for portraits)\n`);
        
        // Load and encode local image with resizing for memory efficiency
        console.log("📂 Loading and resizing local image...");
        const sourceImageBase64 = await loadLocalImageAsBase64(sourceImagePath, 512, 384); // Smaller input
        console.log(`✅ Image loaded (${Math.round(sourceImageBase64.length / 1024)}KB base64)`);
        
        const output = await replicate.run(MODEL_ID, {
            input: {
                prompt: prompt,
                negative_prompt: "low quality, blurry, pixelated, distorted, ugly, watermark, deformed face, duplicate, bad anatomy",
                image: sourceImageBase64,
                prompt_strength: 0.5, // ✅ MUCH LOWER for portraits (0.2-0.4 works best)
                num_inference_steps: 30, // Slightly higher for better quality
                guidance_scale: 8.0,     // Lower guidance for more natural results
                width: 768,  
                height: 768, // Square for portraits often works better
                scheduler: "DPMSolverMultistep",
                seed: Math.floor(Math.random() * 1000000)
            },
        });

        // Handle different response formats
        let generatedImageUrl;
        if (Array.isArray(output)) {
            generatedImageUrl = output[0];
        } else if (typeof output === 'string') {
            generatedImageUrl = output;
        } else if (output && output.url) {
            generatedImageUrl = output.url;
        } else {
            console.log("🔍 Full output:", JSON.stringify(output, null, 2));
            throw new Error("Unexpected output format from Replicate API");
        }
        
        console.log("\n✅ Generation complete!");
        console.log("🎨 Generated Image URL:", generatedImageUrl);
        
        // Download and save the image
        const fetch = require('node-fetch');
        
        console.log("⬇️ Downloading generated image...");
        const response = await fetch(generatedImageUrl);
        if (!response.ok) {
            throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
        }
        
        const buffer = await response.buffer();
        const fileName = `img2img-result-${Date.now()}.jpg`;
        const fullPath = path.join(process.cwd(), fileName);
        
        fs.writeFileSync(fullPath, buffer);
        console.log("💾 Image saved to:", fullPath);
        
        return { generatedImageUrl, savedPath: fullPath };
        
    } catch (err) {
        console.error("❌ Error generating image:", err.message);
        if (err.response) {
            console.error("📋 Response data:", err.response.data);
        }
        throw err;
    }
}

// 📚 img2img Prompt Guide:
console.log(`
🎨 **SDXL img2img PROMPT GUIDE**

✅ GOOD prompts (focus on STYLE/MOOD):
• "professional headshot, studio lighting"
• "oil painting style, renaissance art"  
• "black and white photography, film noir"
• "digital art, cyberpunk neon colors"
• "watercolor painting, soft brushstrokes"
• "vintage photograph, 1950s fashion"

❌ BAD prompts (too descriptive):
• "A person with brown hair and blue eyes sitting..."
• "Close-up of face with water droplets and neon lighting..."

🎛️ Parameter Tips:
• prompt_strength: 0.2-0.4 for portraits, 0.5-0.8 for landscapes
• Lower values = keeps original image better
• Higher values = more dramatic changes

💡 Think of img2img as applying a "style filter" to your existing image!
`);

generateImage();
