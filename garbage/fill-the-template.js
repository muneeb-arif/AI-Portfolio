require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const Replicate = require("replicate");
const fetch = require("node-fetch");

const app = express();
const PORT = 3000;

const MODEL_ID = "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b";

if (!process.env.REPLICATE_API_TOKEN) {
  console.error("❌ REPLICATE_API_TOKEN is missing in your .env");
  process.exit(1);
}

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// 🧠 Screen coordinates in your template
const screenAreas = [
  { left: 100, top: 170, width: 300, height: 380 },  // Left
  { left: 426, top: 130, width: 300, height: 440 },  // Center
  { left: 752, top: 170, width: 300, height: 380 }   // Right
];

// 🖼️ Load and base64-encode all images in a folder
async function getAllImages(folderPath) {
  const files = fs.readdirSync(folderPath).filter(file => /\.(jpg|jpeg|png)$/i.test(file));
  if (files.length === 0) throw new Error("Please add at least 1 image in the folder.");

  const imageData = [];
  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const resizedBuffer = await sharp(filePath)
      .resize({ width: 768, height: 512, fit: 'cover' })
      .jpeg({ quality: 85 })
      .toBuffer();

    const imageBase64 = resizedBuffer.toString('base64');
    imageData.push({
      filename: file,
      base64: `data:image/jpeg;base64,${imageBase64}`
    });
  }

  return imageData;
}

// 🎨 Composites 1–3 screenshots into the template image
async function generateMockupFromImages(imageDataArray, prompt) {
  const templatePath = path.join(process.cwd(), "template.png"); // Your uploaded file
  const composedPath = path.join(process.cwd(), "composed-image.jpg");

  try {
    const template = sharp(templatePath).resize(1152, 768);
    const composites = [];

    const slots = Math.min(screenAreas.length, imageDataArray.length);
    for (let i = 0; i < slots; i++) {
      const buffer = Buffer.from(imageDataArray[i].base64.split(",")[1], "base64");

      const resized = await sharp(buffer)
        .resize(screenAreas[i].width, screenAreas[i].height)
        .toBuffer();

      composites.push({
        input: resized,
        top: screenAreas[i].top,
        left: screenAreas[i].left,
      });
    }

    await template.composite(composites).jpeg({ quality: 90 }).toFile(composedPath);

    const base64Template = fs.readFileSync(composedPath).toString("base64");
    const composedImage = `data:image/jpeg;base64,${base64Template}`;

    const output = await replicate.run(MODEL_ID, {
      input: {
        prompt: `${prompt}. Style this template image into a realistic 3D mockup.`,
        negative_prompt: "blurry, low resolution, text, watermark, distortion, extra frames",
        image: composedImage,
        prompt_strength: 0.4,
        num_inference_steps: 25,
        guidance_scale: 7,
        width: 1152,
        height: 768,
        scheduler: "DPMSolverMultistep",
        seed: Math.floor(Math.random() * 1000000)
      },
    });

    const imageUrl = Array.isArray(output) ? output[0] : output?.url || output;
    const response = await fetch(imageUrl);
    const buffer = await response.buffer();
    const finalFile = `portfolio-mockup-${Date.now()}.jpg`;
    const finalPath = path.join(process.cwd(), "output", finalFile);

    fs.writeFileSync(finalPath, buffer);

    return finalFile;
  } catch (error) {
    console.error("❌ Error during generation:", error.message);
    throw error;
  }
}

// 🌐 Endpoint: http://localhost:3000/generate?folder=images
app.get("/generate", async (req, res) => {
  try {
    const folder = req.query.folder || "./images";
    const prompt = req.query.prompt || "fill the image(s) in the template, replace the white empty screens witht the image. they should fit the screen.";

    const allImages = await getAllImages(folder);
    const finalImage = await generateMockupFromImages(allImages, prompt);
    const finalPath = path.join(process.cwd(), "output", finalImage);

    res.json({
      message: `✅ Generated portfolio mockup with ${allImages.length} screenshots!`,
      ai_portfolio_mockup: {
        filename: finalImage,
        full_path: finalPath
      },
      source_images: allImages.map(img => ({
        filename: img.filename,
        status: "processed"
      })),
      prompt,
      note: "AI composed and styled the screenshots into your 3-screen mockup template!"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}/generate`);
});
