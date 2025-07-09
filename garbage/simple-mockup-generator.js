const fs = require("fs");
const sharp = require("sharp");
const Replicate = require("replicate");
const fetch = require("node-fetch");
require("dotenv").config();

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Simple function to generate 3D mockup from 3 images
async function generateMockup(imagePaths, customPrompt = null) {
  console.log("🎨 Starting 3D mockup generation...");
  
  // Step 1: Combine the 3 images horizontally
  const combinedPath = await combineImages(imagePaths);
  
  // Step 2: Generate 3D mockup using AI
  const mockupPath = await generateAIMockup(combinedPath, customPrompt);
  
  console.log(`✅ 3D mockup generated: ${mockupPath}`);
  return mockupPath;
}

async function combineImages(imagePaths) {
  if (imagePaths.length !== 3) {
    throw new Error("Please provide exactly 3 images");
  }
  
  // Resize all images to same height
  const images = await Promise.all(
    imagePaths.map(path => 
      sharp(path)
        .resize({ height: 768, fit: 'contain' })
        .toBuffer()
    )
  );
  
  // Get width of first image to calculate total width
  const { width } = await sharp(images[0]).metadata();
  const totalWidth = width * 3;
  
  // Combine images horizontally
  const combinedPath = `combined_${Date.now()}.jpg`;
  await sharp({
    create: {
      width: totalWidth,
      height: 768,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .composite([
    { input: images[0], left: 0, top: 0 },
    { input: images[1], left: width, top: 0 },
    { input: images[2], left: width * 2, top: 0 }
  ])
  .jpeg({ quality: 90 })
  .toFile(combinedPath);
  
  return combinedPath;
}

async function generateAIMockup(combinedImagePath, customPrompt) {
  const imageBuffer = fs.readFileSync(combinedImagePath);
  const imageBase64 = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
  
  const prompt = customPrompt || 
    `A clean digital 3D render of a modern UI/UX portfolio presentation using selected website screenshots. Three floating website mockups showcase actual web pages with realistic content. The center screen faces forward, while the left and right screens are slightly tilted. Each mockup displays a different page design with real layout sections and screenshots. All three float in front of a smooth, colorful gradient background. Subtle shadows and soft reflections are visible beneath them on a semi-glossy surface. The scene is ambient-lit with a futuristic tech style.`;
  
  console.log("🚀 Sending to AI model...");
  
  const output = await replicate.run(
    "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
    {
      input: {
        prompt: prompt,
        image: imageBase64,
        negative_prompt: "blurry, low quality, distorted, pixelated, ugly, text, watermark, signature, flat, 2d",
        width: 1344,
        height: 768,
        num_inference_steps: 30,
        guidance_scale: 7.5,
        prompt_strength: 0.8,
        scheduler: "K_EULER_ANCESTRAL",
        seed: -1
      },
    }
  );
  
  // Download generated image
  if (output && output.length > 0) {
    const imageUrl = output[0];
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    
    const outputPath = `3d_mockup_${Date.now()}.png`;
    fs.writeFileSync(outputPath, Buffer.from(buffer));
    
    return outputPath;
  } else {
    throw new Error("No output received from AI model");
  }
}

// Example usage
async function example() {
  try {
    const imagePaths = [
      "./path/to/image1.png",
      "./path/to/image2.png", 
      "./path/to/image3.png"
    ];
    
    const mockupPath = await generateMockup(imagePaths);
    console.log(`🎉 Success! Generated: ${mockupPath}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

module.exports = { generateMockup, combineImages, generateAIMockup };

// Uncomment to run example
// example(); 