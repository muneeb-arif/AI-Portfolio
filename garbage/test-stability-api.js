require("dotenv").config();
const fetch = require('node-fetch');
const fs = require('fs');
const FormData = require('form-data');

// You'll need to get this from: https://platform.stability.ai/account/keys
// Add STABILITY_API_KEY=your_key_here to your .env file
const API_KEY = process.env.STABILITY_API_KEY;

if (!API_KEY) {
  console.log(`
❌ **STABILITY_API_KEY MISSING**

To use Stability AI's superior img2img:
1. Go to: https://platform.stability.ai/account/keys
2. Get your API key (free credits available)
3. Add to .env file: STABILITY_API_KEY=your_key_here
4. Run this script again

✅ **MUCH BETTER RESULTS** than basic SDXL on Replicate!
`);
  process.exit(0);
}

const sourceImagePath = "./images/person2.png";
const prompt = "black and white portrait photography, dramatic lighting, high contrast, professional studio";

async function testStabilityAI() {
  try {
    console.log("🚀 Testing Stability AI Direct API...");
    console.log(`🖼️  Source: ${sourceImagePath}`);
    console.log(`📝 Prompt: ${prompt}\n`);
    
    const formData = new FormData();
    formData.append('init_image', fs.createReadStream(sourceImagePath));
    formData.append('init_image_mode', 'IMAGE_STRENGTH');
    formData.append('image_strength', '0.4'); // How much to change (0.1-0.9)
    formData.append('text_prompts[0][text]', prompt);
    formData.append('text_prompts[0][weight]', '1');
    formData.append('cfg_scale', '7');
    formData.append('samples', '1');
    formData.append('steps', '30');
    
    const response = await fetch(
      'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          ...formData.getHeaders(),
        },
        body: formData,
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const responseJSON = await response.json();
    
    // Save the result
    const imageData = responseJSON.artifacts[0];
    const imageBuffer = Buffer.from(imageData.base64, 'base64');
    const fileName = `stability-result-${Date.now()}.png`;
    
    fs.writeFileSync(fileName, imageBuffer);
    console.log(`✅ Success! Saved: ${fileName}`);
    
    return fileName;
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    
    if (error.message.includes('402') || error.message.includes('insufficient')) {
      console.log("💳 Need to add credits to your Stability AI account");
    }
    
    return null;
  }
}

console.log(`
🏆 **STABILITY AI vs REPLICATE**

Stability AI Direct:  ⭐⭐⭐⭐⭐ (Better algorithms, more control)
Replicate SDXL:      ⭐⭐ (Basic implementation, limited options)

💰 Cost Comparison:
- Stability AI: ~$0.02 per image (first $25 free)
- Replicate: ~$0.005 per image (but worse quality)

🚀 Testing Stability AI now...
`);

testStabilityAI(); 