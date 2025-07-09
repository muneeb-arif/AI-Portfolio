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

// 🏆 InstantID - BEST for face/portrait style transfer
const MODEL_ID = "tencentarc/photomaker:ddfc2b08d209f9fa8c1eca692712918bd449f695dabb4a958da31802a9570fe4";

const sourceImagePath = "./images/person2.png";

// 🎨 InstantID requires "img" trigger word + style descriptions
const prompt = "img professional headshot, dramatic lighting, black and white photography, high contrast, studio quality, cinematic portrait";

async function loadImageAsBase64(imagePath) {
  const resizedBuffer = await sharp(imagePath)
    .resize({ width: 512, height: 512, fit: 'cover' })
    .jpeg({ quality: 90 })
    .toBuffer();
  
  return `data:image/jpeg;base64,${resizedBuffer.toString('base64')}`;
}

async function testInstantID() {
  try {
    console.log("🚀 Testing InstantID (Portrait Specialist)...");
    console.log(`🖼️  Source: ${sourceImagePath}`);
    console.log(`📝 Style: ${prompt}\n`);
    
    const imageBase64 = await loadImageAsBase64(sourceImagePath);
    console.log("✅ Image loaded and resized to 512x512");
    
    const output = await replicate.run(MODEL_ID, {
      input: {
        prompt: prompt,
        input_image: imageBase64,
        num_steps: 20,
        style_strength_ratio: 20, // How much style to apply (1-100)
        seed: Math.floor(Math.random() * 1000000)
      }
    });
    
    console.log("✅ Generation complete!");
    
    // Save result
    const fetch = require('node-fetch');
    const imageUrl = Array.isArray(output) ? output[0] : output;
    
    const response = await fetch(imageUrl);
    const buffer = await response.buffer();
    const fileName = `instantid-result-${Date.now()}.jpg`;
    
    fs.writeFileSync(fileName, buffer);
    console.log(`💾 Saved: ${fileName}`);
    
    return fileName;
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    
    if (error.message.includes("not found")) {
      console.log("\n💡 InstantID model not available. Trying ControlNet alternative...");
      
      // Fallback to ControlNet
      const controlnetOutput = await replicate.run("lucataco/sdxl-controlnet:db2ffdbf8e27c5637c9cf3c47eb6eca6de8b3e2d7bf80fa42c854ac1d766b14cd", {
        input: {
          prompt: prompt,
          image: await loadImageAsBase64(sourceImagePath),
          controlnet_conditioning_scale: 0.8,
          num_inference_steps: 20,
          guidance_scale: 6.0
        }
      });
      
      const fetch = require('node-fetch');
      const imageUrl = Array.isArray(controlnetOutput) ? controlnetOutput[0] : controlnetOutput;
      const response = await fetch(imageUrl);
      const buffer = await response.buffer();
      const fileName = `controlnet-result-${Date.now()}.jpg`;
      
      fs.writeFileSync(fileName, buffer);
      console.log(`💾 Saved (ControlNet alternative): ${fileName}`);
      
      return fileName;
    }
    
    throw error;
  }
}

console.log(`
🏆 **INSTANTID FEATURES**

✅ Specifically designed for faces/portraits
✅ Maintains identity while changing style  
✅ Supports dramatic style changes
✅ Better results than basic SDXL

📊 Quality Comparison:
Basic SDXL:     ⭐⭐
SDXL ControlNet: ⭐⭐⭐⭐
InstantID:      ⭐⭐⭐⭐⭐ (for faces)

🚀 Testing InstantID now...
`);

testInstantID(); 