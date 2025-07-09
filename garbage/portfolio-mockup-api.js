require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const Replicate = require("replicate");
const fetch = require("node-fetch");

const app = express();
const PORT = 3000;

// ✅ Using the standard SDXL model with img2img functionality
const MODEL_ID = "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b";

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

// Read ALL images from directory - no combining, pass each separately to AI
async function getAllImages(folderPath) {
  const files = fs.readdirSync(folderPath).filter(file => /\.(jpg|jpeg|png)$/i.test(file));
  if (files.length === 0) throw new Error("Please add at least 1 image in the folder.");
  
  console.log(`📸 Found ${files.length} images in ${folderPath}`);
  
  const imageData = [];
  for (const file of files) {
    const filePath = path.join(folderPath, file);
    
    // Resize image to reduce memory usage before sending to AI
    const resizedBuffer = await sharp(filePath)
      .resize({ width: 768, height: 512, fit: 'cover' })
      .jpeg({ quality: 85 })
      .toBuffer();
    
    const imageBase64 = resizedBuffer.toString('base64');
    imageData.push({
      filename: file,
      base64: `data:image/jpeg;base64,${imageBase64}`
    });
    console.log(`✅ Loaded and resized image: ${file}`);
  }
  
  return imageData;
}

// Generate mockup using img2img with ALL your screenshots
async function generateMockupFromImages(imageDataArray, prompt, outputFile = "") {
  console.log(`🎨 Generating portfolio mockup with ${imageDataArray.length} screenshots using AI...`);
  
  try {
    // Use the first image as the main reference for img2img
    const mainImage = imageDataArray[0].base64;
    
    // Enhanced prompt that mentions multiple websites/screenshots
    const enhancedPrompt = `${prompt}. Create a professional portfolio showcase displaying ${imageDataArray.length} different website screenshots: ${imageDataArray.map(img => img.filename).join(', ')}. Show each website on separate devices like MacBooks, tablets, and phones in an elegant modern studio setting.`;
    
    console.log(`📝 Using enhanced prompt: ${enhancedPrompt}`);
    console.log(`🖼️ Using main reference image: ${imageDataArray[0].filename}`);
    
    const output = await replicate.run(MODEL_ID, {
      input: {
        prompt: enhancedPrompt,
        negative_prompt: "low quality, blurry, pixelated, distorted, ugly, watermark, text, poor composition, bad screens, duplicate content",
        image: mainImage,
        prompt_strength: 0.7, // Perfect for complex scene transformation
        num_inference_steps: 40, // Higher for complex prompt quality
        guidance_scale: 8.0,     // Higher for complex prompts  
        width: 1024,  // Better resolution for portfolio displays
        height: 768,  // Better resolution for portfolio displays
        scheduler: "DPMSolverMultistep",
        seed: Math.floor(Math.random() * 1000000)
      },
    });

    // Handle different response formats from Replicate
    let imageUrl;
    if (Array.isArray(output)) {
      imageUrl = output[0];
    } else if (typeof output === 'string') {
      imageUrl = output;
    } else if (output && output.url) {
      imageUrl = output.url;
    } else {
      console.log("🔍 Full output:", JSON.stringify(output, null, 2));
      throw new Error("Unexpected output format from Replicate API");
    }
    
    console.log("📸 Image URL received:", imageUrl);
    
    // Download and save the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }
    
    const buffer = await response.buffer();
    const fileName = `portfolio-mockup-${Date.now()}.jpg`;
    const fullPath = path.join(process.cwd(), fileName);
    
    fs.writeFileSync(fullPath, buffer);
    console.log("💾 Portfolio mockup saved to:", fullPath);
    
    return fileName;
  } catch (error) {
    console.error("❌ Error generating portfolio mockup:", error.message);
    throw error;
  }
}

// API endpoint
app.get("/generate", async (req, res) => {
  try {
    const folder = req.query.folder || "./images";
    const prompt = req.query.prompt || `A digital art render of a modern UI/UX designer's portfolio showcase. Use selected images for webpages. Three glossy web page mockups floating in front of a soft, abstract coloful gradient background. The center page is facing forward, while the left page is slightly rotated left and the right page tilted to the right. All pages have dark shadows with good spread and subtle reflections below them on a semi-glossy surface, giving a 3D floating effect. Lighting is ambient with a tech-inspired, futuristic mood.`;

    console.log("📁 Loading ALL images from folder:", folder);
    const allImages = await getAllImages(folder);
    console.log(`✅ Loaded ${allImages.length} individual images`);
    
    console.log("🎨 Creating AI portfolio mockup with ALL your screenshots...");
    const finalImage = await generateMockupFromImages(allImages, prompt);

    // Get full paths for response
    const fullFinalPath = path.join(process.cwd(), finalImage);

    res.json({ 
      message: `✅ AI Portfolio mockup created with ${allImages.length} screenshots!`, 
      files: {
        source_images: allImages.map(img => ({
          filename: img.filename,
          status: "processed"
        })),
        ai_portfolio_mockup: {
          filename: finalImage,
          full_path: fullFinalPath
        }
      },
      settings: {
        total_images: allImages.length,
        prompt: prompt,
        model: "stability-ai/sdxl"
      },
      note: `AI transformed ${allImages.length} website screenshots into professional portfolio mockups!`,
      instructions: "Check the generated file in your project directory!"
    });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 AI Portfolio Mockup API running at http://localhost:${PORT}/generate`);
  console.log(`🤖 Model: stability-ai/sdxl (img2img)`);
  console.log(`📁 Reads ALL images from ./images directory`);
  console.log(`💡 Add custom prompt with ?prompt="your custom prompt"`);
  console.log(`🎨 AI will transform ALL your screenshots into professional portfolio mockups!`);
});
