require("dotenv").config();
const Replicate = require("replicate");

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

async function testSpecificModels() {
  // Known working models to test
  const testModels = [
    "stability-ai/sdxl",
    "lucataco/sdxl", 
    "black-forest-labs/flux-dev",
    "stability-ai/stable-diffusion",
    // Alternative ControlNet models
    "fofr/sdxl-controlnet", 
    "asiryan/controlnet-openpose-sdxl-1.0"
  ];

  console.log("🧪 Testing specific models for availability...\n");

  for (const modelId of testModels) {
    try {
      console.log(`Testing: ${modelId}`);
      const model = await replicate.models.get(modelId);
      console.log(`✅ ${modelId} - Available!`);
      console.log(`   📝 ${model.description}`);
      
      // If it's an SDXL model, try a simple test
      if (modelId.includes('sdxl') || modelId.includes('SDXL')) {
        console.log(`   🚀 Testing prediction...`);
        try {
          const output = await replicate.run(modelId, {
            input: {
              prompt: "a simple red circle",
              width: 512,
              height: 512,
              num_inference_steps: 10
            }
          });
          console.log(`   ✅ Prediction successful!`);
          console.log(`   📸 Output: ${Array.isArray(output) ? output[0] : output}`);
        } catch (predError) {
          console.log(`   ❌ Prediction failed: ${predError.message}`);
        }
      }
      
      console.log(''); // Empty line for readability
    } catch (error) {
      console.log(`❌ ${modelId} - Not accessible: ${error.message}`);
      console.log('');
    }
  }
}

testSpecificModels(); 