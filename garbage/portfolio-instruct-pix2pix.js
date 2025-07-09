require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const Replicate = require("replicate");
const fetch = require("node-fetch");

const app = express();
const PORT = 3001; // Different port to avoid conflicts

// ✅ Using InstructPix2Pix model - perfect for image editing with instructions
const MODEL_ID = "arielreplicate/instruct-pix2pix";

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


// Generate portfolio mockup using InstructPix2Pix
async function generatePortfolioMockup(imagePath, instruction, outputFile = "") {
  console.log("🎨 Transforming your screenshots with InstructPix2Pix...");
  
  try {
    // Convert the combined image to base64 for API submission
    const imageBuffer = fs.readFileSync(imagePath);
    const imageBase64 = imageBuffer.toString('base64');
    
    const output = await replicate.run(MODEL_ID, {
      input: {
        image: `data:image/jpeg;base64,${imageBase64}`,
        prompt: instruction,
        num_inference_steps: 50,
        image_guidance_scale: 1.5,
        guidance_scale: 7.5,
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
    
    console.log("📸 Generated image URL:", imageUrl);
    
    // Download and save the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }
    
    const buffer = await response.buffer();
    const fileName = `instruct-portfolio-${Date.now()}.jpg`;
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
    const layout = req.query.layout || "horizontal"; // horizontal, vertical, grid
    const instruction = req.query.instruction || "Transform this into a professional portfolio showcase with the websites displayed on modern devices like laptops, tablets, and phones in an elegant studio setting with professional lighting";

    console.log("📁 Combining your website screenshots from folder:", folder);
    const combinedPath = await combineImages(folder, layout);
    console.log("✅ Screenshots combined into:", combinedPath);
    
    console.log("🎨 Creating portfolio mockup with InstructPix2Pix...");
    const finalImage = await generatePortfolioMockup(combinedPath, instruction);

    // Get full paths for response
    const fullCombinedPath = path.join(process.cwd(), combinedPath);
    const fullFinalPath = path.join(process.cwd(), finalImage);

    res.json({ 
      message: "✅ Portfolio mockup created using InstructPix2Pix!", 
      files: {
        combined_screenshots: {
          filename: combinedPath,
          full_path: fullCombinedPath
        },
        portfolio_mockup: {
          filename: finalImage,
          full_path: fullFinalPath
        }
      },
      instruction: instruction,
      note: "Your screenshots have been transformed using InstructPix2Pix!",
      instructions: "Check the files in your project directory!"
    });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 InstructPix2Pix Portfolio API running at http://localhost:${PORT}/generate`);
  console.log(`ℹ️ Use ?layout=grid or ?layout=vertical for different layouts`);
  console.log(`💡 Add custom instruction with ?instruction="your custom instruction"`);
  console.log(`📸 InstructPix2Pix will edit your screenshots based on text instructions!`);
}); 