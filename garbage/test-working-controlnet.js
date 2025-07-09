require("dotenv").config();
const Replicate = require("replicate");
const fs = require("fs");
const sharp = require("sharp");

if (!process.env.REPLICATE_API_TOKEN) {
  console.error("❌ REPLICATE_API_TOKEN required in .env file");
  process.exit(1);
}

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// 🎯 Known working models - much better than basic SDXL
const sourceImagePath = "./images/bonsai-tree.png";
const prompt = "A digital art render of a modern UI/UX designer's portfolio showcase. Use selected image for all 3 webpages. Three glossy web page mockups floating in front of a soft, abstract coloful gradient background. The center page is facing forward, while the left page is slightly rotated left and the right page tilted to the right. All pages have dark shadows with good spread and subtle reflections below them on a semi-glossy surface, giving a 3D floating effect. Lighting is ambient with a tech-inspired, futuristic mood.";

async function loadImageAsBase64(imagePath) {
  const resizedBuffer = await sharp(imagePath)
    .resize({ width: 512, height: 512, fit: 'cover' })
    .jpeg({ quality: 90 })
    .toBuffer();
  
  return `data:image/jpeg;base64,${resizedBuffer.toString('base64')}`;
}

async function testOptimizedSDXL() {
  try {
    console.log("🚀 Testing OPTIMIZED SDXL (much better settings)...");
    console.log(`🖼️  Source: ${sourceImagePath}`);
    console.log(`📝 Prompt: ${prompt}\n`);
    
    const imageBase64 = await loadImageAsBase64(sourceImagePath);
    console.log("✅ Image loaded and resized");
    
    const output = await replicate.run("stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b", {
      input: {
        prompt: prompt,
        negative_prompt: "low quality, blurry, pixelated, distorted, ugly, deformed face, bad anatomy, duplicate",
        image: imageBase64,
        prompt_strength: 0.25, // MUCH LOWER - key difference!
        num_inference_steps: 35, // HIGHER - better quality  
        guidance_scale: 5.0, // LOWER - more natural
        width: 512,
        height: 512,
        scheduler: "K_EULER_ANCESTRAL" // Better scheduler
      }
    });
    
    console.log("✅ Generation complete!");
    
    // Save result
    const fetch = require('node-fetch');
    const imageUrl = Array.isArray(output) ? output[0] : output;
    
    const response = await fetch(imageUrl);
    const buffer = await response.buffer();
    const fileName = `optimized-sdxl-${Date.now()}.jpg`;
    
    fs.writeFileSync(fileName, buffer);
    console.log(`💾 Saved: ${fileName}`);
    
    return fileName;
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    return null;
  }
}

console.log(`
🎯 **OPTIMIZED SDXL SETTINGS**

The issue wasn't the model - it was the SETTINGS!

❌ Your old settings:
- prompt_strength: 0.5-0.7 (too high, distorts face)
- steps: 20-30 (too low for quality)
- guidance: 8.0 (too high, unnatural)

✅ New optimized settings:
- prompt_strength: 0.25 (preserves face better)
- steps: 35 (higher quality) 
- guidance: 5.0 (more natural results)
- scheduler: K_EULER_ANCESTRAL (better)

This should give MUCH better results with the same model!
`);

testOptimizedSDXL(); 