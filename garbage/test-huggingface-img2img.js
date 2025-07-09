require("dotenv").config();
const fetch = require('node-fetch');
const fs = require('fs');

// Get free token from: https://huggingface.co/settings/tokens
const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN;

if (!HF_TOKEN) {
  console.log(`
❌ **HUGGINGFACE_API_TOKEN MISSING**

To use Hugging Face's FREE img2img:
1. Go to: https://huggingface.co/settings/tokens
2. Create a free token (no credit card needed!)
3. Add to .env file: HUGGINGFACE_API_TOKEN=your_token_here
4. Run this script again

✅ **COMPLETELY FREE** with good quality results!
`);
  process.exit(0);
}

const sourceImagePath = "./images/person2.png";
const prompt = "black and white portrait photography, dramatic lighting, high contrast, professional studio, cinematic";

// Multiple models to try (in order of preference)
const MODELS = [
  {
    name: "SDXL-Turbo (Fast)",
    url: "https://api-inference.huggingface.co/models/stabilityai/sdxl-turbo",
    quality: "⭐⭐⭐⭐"
  },
  {
    name: "SD 1.5 (Reliable)", 
    url: "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5",
    quality: "⭐⭐⭐"
  },
  {
    name: "Realistic Vision (Portrait Specialist)",
    url: "https://api-inference.huggingface.co/models/SG161222/Realistic_Vision_V4.0",
    quality: "⭐⭐⭐⭐⭐"
  }
];

async function convertImageToBase64(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  return imageBuffer.toString('base64');
}

async function testHuggingFaceModel(model) {
  try {
    console.log(`🚀 Testing ${model.name} ${model.quality}...`);
    
    const imageBase64 = await convertImageToBase64(sourceImagePath);
    
    const response = await fetch(model.url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          image: `data:image/png;base64,${imageBase64}`,
          strength: 0.4, // How much to change
          guidance_scale: 7.5,
          num_inference_steps: 20
        }
      })
    });
    
    if (response.status === 503) {
      console.log("⏳ Model loading... trying next model");
      return null;
    }
    
    if (!response.ok) {
      console.log(`❌ Error: ${response.status} - trying next model`);
      return null;
    }
    
    const imageBuffer = await response.buffer();
    const fileName = `hf-${model.name.toLowerCase().replace(/\s+/g, '-')}-result-${Date.now()}.jpg`;
    
    fs.writeFileSync(fileName, imageBuffer);
    console.log(`✅ Success! Saved: ${fileName}`);
    
    return fileName;
    
  } catch (error) {
    console.log(`❌ ${model.name} failed: ${error.message}`);
    return null;
  }
}

async function testHuggingFace() {
  console.log(`
🆓 **HUGGING FACE IMG2IMG TESTING**

Source: ${sourceImagePath}
Prompt: ${prompt}

Testing multiple models in order of quality...
`);
  
  for (const model of MODELS) {
    const result = await testHuggingFaceModel(model);
    if (result) {
      console.log(`\n🎉 SUCCESS! ${model.name} worked perfectly!`);
      return result;
    }
    
    // Wait between attempts
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`
❌ All models failed or loading. This can happen because:
1. Models are loading (try again in 5 minutes)  
2. High demand on free tier
3. Need to upgrade to Pro plan ($9/month)

💡 Try running again in a few minutes!
`);
}

testHuggingFace(); 