const fs = require("fs");
const fetch = require("node-fetch");
const sharp = require("sharp");
const Replicate = require("replicate");
require("dotenv").config();

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Option 1: Enhanced SDXL with better settings
async function generateMockupSDXLEnhanced(combinedImagePath) {
  const imageBuffer = fs.readFileSync(combinedImagePath);
  const imageBase64 = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
  
  const prompt = `A clean digital 3D render of a modern UI/UX portfolio presentation using selected website screenshots. Three floating website mockups showcase actual web pages with realistic content. The center screen faces forward, while the left and right screens are slightly tilted. Each mockup displays a different page design with real layout sections and screenshots. All three float in front of a smooth, colorful gradient background. Subtle shadows and soft reflections are visible beneath them on a semi-glossy surface. The scene is ambient-lit with a futuristic tech style.`;
  
  const output = await replicate.run(
    "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
    {
      input: {
        prompt: prompt,
        image: imageBase64,
        negative_prompt: "blurry, low quality, distorted, pixelated, ugly, text, watermark, signature, flat, 2d, cartoon, anime",
        width: 1344,
        height: 768,
        num_inference_steps: 40,
        guidance_scale: 8.0,
        prompt_strength: 0.75,
        scheduler: "DDIM",
        seed: -1,
        refine: "expert_ensemble_refiner",
        high_noise_frac: 0.8
      },
    }
  );
  
  return output;
}

// Option 2: ControlNet for better composition control
async function generateMockupControlNet(combinedImagePath) {
  const imageBuffer = fs.readFileSync(combinedImagePath);
  const imageBase64 = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
  
  const prompt = `A professional 3D rendered scene showcasing website mockups. Three floating screens displaying web interfaces in a modern presentation style. Perspective view with depth, realistic lighting, gradient background, studio quality, 8k resolution.`;
  
  // Using ControlNet for better structural control
  const output = await replicate.run(
    "jagilley/controlnet-depth2img:435061a1b5a4c1e26740464bf786efdfa9cb3a3ac488c8b3eca5e19cdcfd248a",
    {
      input: {
        image: imageBase64,
        prompt: prompt,
        negative_prompt: "blurry, low quality, distorted, text overlay, watermark",
        num_inference_steps: 30,
        guidance_scale: 7.5,
        prompt_strength: 0.8,
        controlnet_conditioning_scale: 1.0
      },
    }
  );
  
  return output;
}

// Option 3: Leonardo.AI alternative (requires different API)
async function generateMockupLeonardo(combinedImagePath) {
  const imageBuffer = fs.readFileSync(combinedImagePath);
  const imageBase64 = imageBuffer.toString('base64');
  
  const prompt = `A clean digital 3D render of a modern UI/UX portfolio presentation using selected website screenshots. Three floating website mockups showcase actual web pages with realistic content. The center screen faces forward, while the left and right screens are slightly tilted. Each mockup displays a different page design with real layout sections and screenshots. All three float in front of a smooth, colorful gradient background. Subtle shadows and soft reflections are visible beneath them on a semi-glossy surface. The scene is ambient-lit with a futuristic tech style.`;
  
  const response = await fetch('https://cloud.leonardo.ai/api/rest/v1/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.LEONARDO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: prompt,
      negative_prompt: "blurry, low quality, distorted, pixelated, ugly, text, watermark, signature, flat, 2d",
      modelId: "6bef9f1b-29cb-40c7-b9df-32b51c1f67d3", // Leonardo Creative model
      width: 1344,
      height: 768,
      num_images: 1,
      guidance_scale: 7,
      num_inference_steps: 30,
      init_image_id: imageBase64, // Upload image first via upload endpoint
      init_strength: 0.3,
      presetStyle: "PHOTOREALISTIC"
    })
  });
  
  return await response.json();
}

// Option 4: Multiple model ensemble approach
async function generateMockupEnsemble(combinedImagePath) {
  console.log("🚀 Generating with multiple models for best quality...");
  
  try {
    // Try SDXL enhanced first
    const sdxlResult = await generateMockupSDXLEnhanced(combinedImagePath);
    console.log("✅ SDXL Enhanced completed");
    
    // Try ControlNet as backup/alternative
    const controlNetResult = await generateMockupControlNet(combinedImagePath);
    console.log("✅ ControlNet completed");
    
    return {
      sdxl: sdxlResult,
      controlnet: controlNetResult,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error("❌ Ensemble generation failed:", error);
    throw error;
  }
}

// Option 5: Custom composition with better image arrangement
async function createOptimalComposition(imagePaths) {
  const images = await Promise.all(
    imagePaths.map(async (p, i) => {
      const img = sharp(p);
      const metadata = await img.metadata();
      
      // Create perspective effect for left and right images
      const angle = i === 0 ? -15 : i === 2 ? 15 : 0;
      
      return img
        .resize({ width: 400, height: 300, fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .rotate(angle, { background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .toBuffer();
    })
  );
  
  // Create composition with proper spacing and depth
  const canvas = sharp({
    create: {
      width: 1600,
      height: 900,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    }
  });
  
  const composite = [
    { input: images[0], left: 100, top: 200 },  // Left image
    { input: images[1], left: 600, top: 150 },  // Center image (forward)
    { input: images[2], left: 1100, top: 200 }  // Right image
  ];
  
  const outputPath = `optimal_composition_${Date.now()}.png`;
  await canvas.composite(composite).toFile(outputPath);
  
  return outputPath;
}

// Main function with multiple options
async function generateMockupWithOptions(imagePaths, method = 'enhanced') {
  let compositionPath;
  
  if (method === 'optimal') {
    compositionPath = await createOptimalComposition(imagePaths);
  } else {
    // Use your existing horizontal combination
    compositionPath = await combineImagesHorizontally(imagePaths);
  }
  
  switch (method) {
    case 'enhanced':
      return await generateMockupSDXLEnhanced(compositionPath);
    case 'controlnet':
      return await generateMockupControlNet(compositionPath);
    case 'ensemble':
      return await generateMockupEnsemble(compositionPath);
    default:
      return await generateMockupSDXLEnhanced(compositionPath);
  }
}

module.exports = {
  generateMockupSDXLEnhanced,
  generateMockupControlNet,
  generateMockupEnsemble,
  createOptimalComposition,
  generateMockupWithOptions
}; 