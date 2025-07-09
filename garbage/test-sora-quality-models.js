require("dotenv").config();
const Replicate = require("replicate");
const fs = require("fs");
const sharp = require("sharp");
const fetch = require('node-fetch');
const path = require('path');

if (!process.env.REPLICATE_API_TOKEN) {
  console.error("❌ REPLICATE_API_TOKEN required in .env file");
  process.exit(1);
}

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Your simple MacBook prompt
const MACBOOK_PROMPT = "1 mac-book-pro, full screen with attached image. no text. no any other elements. do not change original image.";
const sourceImagePath = "./images/bonsai-tree.png";

// 🚀 HIGH-QUALITY MODELS FOR SORA.AI-LEVEL RESULTS
const MODELS = {
  "flux_ultra": {
    id: "black-forest-labs/flux-1.1-pro-ultra",
    name: "FLUX 1.1 Pro Ultra",
    description: "Latest FLUX model, 4MP resolution, raw mode for maximum realism",
    cost: "$0.06/image",
    quality: "⭐⭐⭐⭐⭐⭐"
  },
  "flux_realism": {
    id: "xlabs-ai/flux-dev-realism",
    name: "FLUX Dev Realism",
    description: "FLUX enhanced with realism LORA for photorealistic outputs",
    cost: "$0.03/image", 
    quality: "⭐⭐⭐⭐⭐"
  },
  "realistic_vision": {
    id: "adirik/realistic-vision-v6.0",
    name: "Realistic Vision v6.0",
    description: "Specialized for photorealism, excellent for realistic scenes",
    cost: "$0.063/image",
    quality: "⭐⭐⭐⭐⭐"
  },
  "juggernaut_xl": {
    id: "asiryan/juggernaut-xl-v7",
    name: "Juggernaut XL v7",
    description: "Powerful model for detailed, photorealistic images",
    cost: "$0.04/image",
    quality: "⭐⭐⭐⭐⭐"
  },
  "turbo_enigma": {
    id: "shefa/turbo-enigma",
    name: "Turbo Enigma",
    description: "Fast but high quality, rivals SDXL-Turbo with better quality",
    cost: "$0.02/image",
    quality: "⭐⭐⭐⭐"
  }
};

async function loadImageAsBase64(imagePath, maxSize = 1024) {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image file not found: ${imagePath}`);
  }
  
  const resizedBuffer = await sharp(imagePath)
    .resize({ width: maxSize, height: maxSize, fit: 'inside' })
    .jpeg({ quality: 95 })
    .toBuffer();
  
  return `data:image/jpeg;base64,${resizedBuffer.toString('base64')}`;
}

// Test FLUX 1.1 Pro Ultra (Best Quality)
async function testFluxUltra() {
  try {
    console.log("🚀 Testing FLUX 1.1 Pro Ultra (Best Quality)...");
    
    const imageBase64 = await loadImageAsBase64(sourceImagePath, 1024);
    
    const output = await replicate.run(MODELS.flux_ultra.id, {
      input: {
        prompt: MACBOOK_PROMPT,
        image: imageBase64,
        raw: true, // Enable raw mode for maximum realism
        aspect_ratio: "16:9",
        output_format: "jpg",
        output_quality: 95,
        seed: Math.floor(Math.random() * 1000000)
      }
    });
    
    const imageUrl = Array.isArray(output) ? output[0] : output;
    const response = await fetch(imageUrl);
    const buffer = await response.buffer();
    const fileName = `flux-ultra-${Date.now()}.jpg`;
    
    fs.writeFileSync(fileName, buffer);
    console.log(`✅ FLUX Ultra: SUCCESS! Saved: ${fileName} (${Math.round(buffer.length/1024/1024*100)/100}MB)`);
    
    return fileName;
    
  } catch (error) {
    console.log(`❌ FLUX Ultra: Failed - ${error.message}`);
    return null;
  }
}

// Test FLUX Dev Realism 
async function testFluxRealism() {
  try {
    console.log("🚀 Testing FLUX Dev Realism (Photorealistic)...");
    
    const imageBase64 = await loadImageAsBase64(sourceImagePath);
    
    const output = await replicate.run(MODELS.flux_realism.id, {
      input: {
        prompt: MACBOOK_PROMPT,
        image: imageBase64,
        lora_strength: 0.8, // High realism
        aspect_ratio: "16:9",
        output_format: "jpg",
        output_quality: 95,
        seed: Math.floor(Math.random() * 1000000)
      }
    });
    
    const imageUrl = Array.isArray(output) ? output[0] : output;
    const response = await fetch(imageUrl);
    const buffer = await response.buffer();
    const fileName = `flux-realism-${Date.now()}.jpg`;
    
    fs.writeFileSync(fileName, buffer);
    console.log(`✅ FLUX Realism: SUCCESS! Saved: ${fileName} (${Math.round(buffer.length/1024/1024*100)/100}MB)`);
    
    return fileName;
    
  } catch (error) {
    console.log(`❌ FLUX Realism: Failed - ${error.message}`);
    return null;
  }
}

// Test Realistic Vision v6.0
async function testRealisticVision() {
  try {
    console.log("🚀 Testing Realistic Vision v6.0 (Photorealism Specialist)...");
    
    const imageBase64 = await loadImageAsBase64(sourceImagePath, 768);
    
    const output = await replicate.run(MODELS.realistic_vision.id, {
      input: {
        prompt: MACBOOK_PROMPT,
        image: imageBase64,
        negative_prompt: "low quality, blurry, pixelated, distorted, ugly",
        width: 768,
        height: 512,
        num_steps: 30,
        guidance_scale: 7.0,
        scheduler: "DPM++ SDE Karras",
        seed: Math.floor(Math.random() * 1000000)
      }
    });
    
    const imageUrl = Array.isArray(output) ? output[0] : output;
    const response = await fetch(imageUrl);
    const buffer = await response.buffer();
    const fileName = `realistic-vision-${Date.now()}.jpg`;
    
    fs.writeFileSync(fileName, buffer);
    console.log(`✅ Realistic Vision: SUCCESS! Saved: ${fileName} (${Math.round(buffer.length/1024/1024*100)/100}MB)`);
    
    return fileName;
    
  } catch (error) {
    console.log(`❌ Realistic Vision: Failed - ${error.message}`);
    return null;
  }
}

// Test Juggernaut XL v7
async function testJuggernautXL() {
  try {
    console.log("🚀 Testing Juggernaut XL v7 (Detailed & Photorealistic)...");
    
    const imageBase64 = await loadImageAsBase64(sourceImagePath);
    
    const output = await replicate.run(MODELS.juggernaut_xl.id, {
      input: {
        prompt: MACBOOK_PROMPT,
        image: imageBase64,
        negative_prompt: "low quality, blurry, pixelated, distorted, ugly, amateur",
        width: 1024,
        height: 768,
        num_inference_steps: 35,
        guidance_scale: 8.0,
        prompt_strength: 0.9, // High preservation of original
        scheduler: "DPMSolverMultistep",
        seed: Math.floor(Math.random() * 1000000)
      }
    });
    
    const imageUrl = Array.isArray(output) ? output[0] : output;
    const response = await fetch(imageUrl);
    const buffer = await response.buffer();
    const fileName = `juggernaut-xl-${Date.now()}.jpg`;
    
    fs.writeFileSync(fileName, buffer);
    console.log(`✅ Juggernaut XL: SUCCESS! Saved: ${fileName} (${Math.round(buffer.length/1024/1024*100)/100}MB)`);
    
    return fileName;
    
  } catch (error) {
    console.log(`❌ Juggernaut XL: Failed - ${error.message}`);
    return null;
  }
}

// Test Turbo Enigma (Fast + Quality)
async function testTurboEnigma() {
  try {
    console.log("🚀 Testing Turbo Enigma (Fast + High Quality)...");
    
    const imageBase64 = await loadImageAsBase64(sourceImagePath);
    
    const output = await replicate.run(MODELS.turbo_enigma.id, {
      input: {
        prompt: MACBOOK_PROMPT,
        image: imageBase64,
        negative_prompt: "low quality, blurry, pixelated, distorted, ugly",
        width: 1024,
        height: 768,
        num_inference_steps: 4, // Turbo model - fewer steps
        guidance_scale: 7.0,
        seed: Math.floor(Math.random() * 1000000)
      }
    });
    
    const imageUrl = Array.isArray(output) ? output[0] : output;
    const response = await fetch(imageUrl);
    const buffer = await response.buffer();
    const fileName = `turbo-enigma-${Date.now()}.jpg`;
    
    fs.writeFileSync(fileName, buffer);
    console.log(`✅ Turbo Enigma: SUCCESS! Saved: ${fileName} (${Math.round(buffer.length/1024/1024*100)/100}MB)`);
    
    return fileName;
    
  } catch (error) {
    console.log(`❌ Turbo Enigma: Failed - ${error.message}`);
    return null;
  }
}

async function testAllSoraQualityModels() {
  console.log(`
🎯 **TESTING SORA.AI-QUALITY MODELS**

Prompt: "${MACBOOK_PROMPT}"
Source: ${sourceImagePath}

Testing the best alternatives to SDXL for maximum quality...

📊 **MODELS TO TEST:**
`);
  
  Object.values(MODELS).forEach((model, index) => {
    console.log(`${index + 1}. ${model.name} ${model.quality}`);
    console.log(`   ${model.description}`);
    console.log(`   Cost: ${model.cost}\n`);
  });
  
  console.log("🚀 Starting tests...\n");
  
  const results = [];
  
  // Test all models with delays between tests
  const tests = [
    testFluxUltra,
    testFluxRealism, 
    testRealisticVision,
    testJuggernautXL,
    testTurboEnigma
  ];
  
  for (let i = 0; i < tests.length; i++) {
    const result = await tests[i]();
    if (result) {
      const modelName = Object.values(MODELS)[i].name;
      const quality = Object.values(MODELS)[i].quality;
      results.push({ model: modelName, file: result, quality });
    }
    
    // Wait between tests to avoid rate limits
    if (i < tests.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Show final results
  console.log(`
🏆 **SORA.AI-QUALITY TEST RESULTS**

Successfully generated with:
`);
  
  if (results.length === 0) {
    console.log("❌ No models completed successfully");
  } else {
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.model} ${result.quality}`);
      console.log(`   File: ${result.file}`);
    });
    
    console.log(`
🎯 **RECOMMENDATIONS FOR SORA.AI-LEVEL QUALITY:**

🥇 FLUX 1.1 Pro Ultra - Maximum quality, 4MP resolution, raw mode
🥈 FLUX Dev Realism - Best photorealism with LORA enhancement
🥉 Realistic Vision v6.0 - Specialized photorealism model

💡 For MacBook mockups specifically:
- Use FLUX Ultra with raw mode enabled
- Set high image quality (95+)
- Use 16:9 aspect ratio for laptop screens
`);
  }
  
  return results;
}

// Run the test
testAllSoraQualityModels(); 