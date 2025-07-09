require("dotenv").config();
const Replicate = require("replicate");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

if (!process.env.REPLICATE_API_TOKEN) {
  console.error("❌ REPLICATE_API_TOKEN required in .env file");
  process.exit(1);
}

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// 🚀 FLUX.1-dev - Much better than SDXL for img2img
const MODEL_ID = "black-forest-labs/flux.1-dev";

const sourceImagePath = "./images/person2.png";

// 🎨 FLUX works better with more descriptive prompts
const prompt = "dramatic black and white portrait photography, professional studio lighting, high contrast, film noir aesthetic, cinematic mood";

async function loadImageAsBase64(imagePath, maxSize = 1024) {
  const resizedBuffer = await sharp(imagePath)
    .resize({ width: maxSize, height: maxSize, fit: 'inside' })
    .jpeg({ quality: 90 })
    .toBuffer();
  
  return `data:image/jpeg;base64,${resizedBuffer.toString('base64')}`;
}

async function generateWithFlux() {
  try {
    console.log("🚀 Testing FLUX.1-dev img2img...");
    console.log(`🖼️  Source: ${sourceImagePath}`);
    console.log(`📝 Prompt: ${prompt}\n`);
    
    const imageBase64 = await loadImageAsBase64(sourceImagePath);
    console.log("✅ Image loaded and resized");
    
    const output = await replicate.run(MODEL_ID, {
      input: {
        prompt: prompt,
        image: imageBase64,
        num_inference_steps: 28,
        guidance_scale: 3.5,
        strength: 0.4, // How much to change the image
        seed: Math.floor(Math.random() * 1000000)
      }
    });
    
    console.log("✅ Generation complete!");
    
    // Save the result
    const fetch = require('node-fetch');
    const imageUrl = Array.isArray(output) ? output[0] : output;
    
    const response = await fetch(imageUrl);
    const buffer = await response.buffer();
    const fileName = `flux-result-${Date.now()}.jpg`;
    
    fs.writeFileSync(fileName, buffer);
    console.log(`💾 Saved: ${fileName}`);
    
    return fileName;
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    
    if (error.message.includes("not found")) {
      console.log("\n💡 FLUX.1-dev might not be available on your plan.");
      console.log("🔄 Trying FLUX.1-schnell (faster, free alternative)...");
      
      // Fallback to free FLUX model
      const freeOutput = await replicate.run("black-forest-labs/flux.1-schnell", {
        input: {
          prompt: prompt,
          image: await loadImageAsBase64(sourceImagePath),
          num_inference_steps: 4, // Schnell is optimized for 4 steps
          seed: Math.floor(Math.random() * 1000000)
        }
      });
      
      const fetch = require('node-fetch');
      const imageUrl = Array.isArray(freeOutput) ? freeOutput[0] : freeOutput;
      const response = await fetch(imageUrl);
      const buffer = await response.buffer();
      const fileName = `flux-schnell-result-${Date.now()}.jpg`;
      
      fs.writeFileSync(fileName, buffer);
      console.log(`💾 Saved (free version): ${fileName}`);
      
      return fileName;
    }
    
    throw error;
  }
}

console.log(`
🆚 **MODEL COMPARISON FOR YOUR USE CASE**

Current SDXL:     ⭐⭐  (basic img2img, limited quality)
FLUX.1-schnell:   ⭐⭐⭐⭐ (free, fast, good quality)  
FLUX.1-dev:       ⭐⭐⭐⭐⭐ (paid, best quality)
InstantID:        ⭐⭐⭐⭐⭐ (specialized for faces)

🚀 Testing FLUX model now...
`);

generateWithFlux(); 