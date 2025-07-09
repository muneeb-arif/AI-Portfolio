require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const Replicate = require("replicate");
const fetch = require("node-fetch");

const app = express();
const PORT = 3000;

// ✅ Using a working model instead  
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

// Image combining logic (same as before)
async function combineImages(folderPath, layout = "horizontal", outputPath = "combined.jpg") {
  const files = fs.readdirSync(folderPath).filter(file => /\.(jpg|jpeg|png)$/i.test(file));
  const selected = files.slice(0, 3).map(file => path.join(folderPath, file));
  if (selected.length < 3) throw new Error("Please add at least 3 images in the folder.");

  const buffers = await Promise.all(selected.map(p => sharp(p).resize({ height: 768 }).toBuffer()));
  const { width, height } = await sharp(buffers[0]).metadata();

  let canvasWidth = width,
      canvasHeight = height,
      composite = [];

  if (layout === "vertical") {
    canvasHeight = height * buffers.length;
    composite = buffers.map((img, i) => ({ input: img, left: 0, top: i * height }));
  } else if (layout === "grid") {
    canvasWidth = width * 2;
    canvasHeight = height * 2;
    composite = buffers.map((img, i) => ({ input: img, left: (i % 2) * width, top: Math.floor(i / 2) * height }));
  } else {
    canvasWidth = width * buffers.length;
    composite = buffers.map((img, i) => ({ input: img, left: i * width, top: 0 }));
  }

  await sharp({
    create: { width: canvasWidth, height: canvasHeight, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0 } },
  })
  .composite(composite)
  .jpeg()
  .toFile(outputPath);

  return outputPath;
}

// Generate mockup with Replicate using standard SDXL
async function generateMockupFromImage(imagePath, prompt, outputFile = "final-mockup.jpg") {
  console.log("🎨 Generating mockup with SDXL...");
  
  try {
    const output = await replicate.run(MODEL_ID, {
      input: {
        prompt: prompt,
        negative_prompt: "low quality, blurry, pixelated, distorted, ugly, watermark",
        width: 1024,
        height: 768,
        num_inference_steps: 25,
        guidance_scale: 7.5,
        scheduler: "DPMSolverMultistep",
        seed: Math.floor(Math.random() * 1000000)
      },
    });

    // Output is an array of URLs
    const imageUrl = Array.isArray(output) ? output[0] : output;
    console.log("📸 Image generated:", imageUrl);
    
    const response = await fetch(imageUrl);
    const buffer = await response.buffer();
    fs.writeFileSync(outputFile, buffer);
    return outputFile;
  } catch (error) {
    console.error("❌ Error generating image:", error.message);
    throw error;
  }
}

// API endpoint
app.get("/generate", async (req, res) => {
  try {
    const folder = req.query.folder || "./images";
    const layout = req.query.layout || "horizontal"; // horizontal, vertical, grid
    const prompt = req.query.prompt || `A clean digital 3D render of a modern UI/UX portfolio presentation with floating website mockups. Three elegant screens displaying web interfaces float in a professional studio setting with soft ambient lighting and subtle reflections. Modern, minimalist design with soft gradient background. High quality, professional photography style.`;

    console.log("📁 Combining images from folder:", folder);
    const combinedPath = await combineImages(folder, layout);
    console.log("✅ Images combined:", combinedPath);
    
    const finalImage = await generateMockupFromImage(combinedPath, prompt);

    res.json({ 
      message: "✅ Mockup generated successfully!", 
      file: finalImage,
      prompt: prompt
    });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API running at http://localhost:${PORT}/generate`);
  console.log(`ℹ️ Use ?layout=grid or ?layout=vertical to test variations`);
  console.log(`💡 Add custom prompt with ?prompt="your custom prompt"`);
}); 