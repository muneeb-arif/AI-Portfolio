const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { input, checkbox } = require("@inquirer/prompts");
const Replicate = require("replicate");
const fetch = require("node-fetch");
require("dotenv").config();

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN, // Replace with your token
});

async function getImagesFromFolder(folder) {
  const fullPath = path.resolve(`./screenshots/${folder}`);
  const files = fs.readdirSync(fullPath).filter(file =>
    /\.(jpg|jpeg|png)$/i.test(file)
  );
  return files.map(file => path.join(fullPath, file));
}

async function promptUserForFolderAndImages() {
  const folder = await input({
    message: "Enter the folder name containing images:",
  });

  const files = await getImagesFromFolder(folder);
  if (files.length === 0) {
    console.log("❌ No images found in this folder.");
    process.exit(1);
  }

  const selectedIndexes = await checkbox({
    message: "Select images to include in the mockup:",
    choices: files.map((file, index) => ({
      name: path.basename(file),
      value: index,
    })),
  });

  const selectedFiles = selectedIndexes.map(index => files[index]);
  return selectedFiles;
}

async function combineImagesHorizontally(imagePaths, outputPath = "combined.jpg") {
  const images = await Promise.all(
    imagePaths.map(p => sharp(p).resize({ height: 768 }).toBuffer())
  );

  const { width } = await sharp(images[0]).metadata();
  const totalWidth = width * images.length;

  await sharp({
    create: {
      width: totalWidth,
      height: 768,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    },
  })
    .composite(
      images.map((img, i) => ({
        input: img,
        left: i * width,
        top: 0,
      }))
    )
    .toFile(outputPath);

  console.log(`✅ Combined image saved as: ${outputPath}`);
  return outputPath;
}

async function sendToReplicate(combinedImagePath, selectedImages) {
  console.log("🚀 Sending to Replicate...");
  
  // Create a dynamic prompt based on the selected images
  const imageCount = selectedImages.length;
  const basePrompt = `A clean digital 3D render of a modern UI/UX portfolio presentation using selected website screenshots. Three floating website mockups showcase actual web pages with realistic content. The center screen faces forward, while the left and right screens are slightly tilted. Each mockup displays a different page design with real layout sections and screenshots. All three float in front of a smooth, colorful gradient background. Subtle shadows and soft reflections are visible beneath them on a semi-glossy surface. The scene is ambient-lit with a futuristic tech style.`;
  
  // Read the combined image as base64
  const imageBuffer = fs.readFileSync(combinedImagePath);
  const imageBase64 = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
  
  // Use img2img model instead of text2img
  const output = await replicate.run(
    "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
    {
      input: {
        prompt: basePrompt,
        image: imageBase64,
        negative_prompt: "blurry, low quality, distorted, pixelated, ugly, text, watermark, signature, flat, 2d",
        width: 1024,
        height: 768,
        num_inference_steps: 30,
        guidance_scale: 7.5,
        prompt_strength: 0.8, // How much to transform the input image
        scheduler: "K_EULER_ANCESTRAL",
        seed: -1
      },
    }
  );

  console.log("🔗 Generated Image URL:", output);
  
  // Download and save the generated image
  if (output && output.length > 0) {
    const imageUrl = output[0];
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    
    const timestamp = Date.now();
    const outputPath = `mockup_generated_${timestamp}.png`;
    
    fs.writeFileSync(outputPath, Buffer.from(buffer));
    console.log(`✅ Generated mockup saved as: ${outputPath}`);
    
    return outputPath;
  } else {
    console.log("❌ No output received from Replicate");
    return null;
  }
}

async function main() {
  try {
    const selectedImages = await promptUserForFolderAndImages();
    console.log(`\n📋 Selected ${selectedImages.length} image(s) for processing.`);
    
    const combinedPath = await combineImagesHorizontally(selectedImages);
    console.log(`📸 Combined image created: ${combinedPath}`);
    
    const generatedPath = await sendToReplicate(combinedPath, selectedImages);
    
    if (generatedPath) {
      console.log(`\n🎉 Success! Your 3D mockup has been generated.`);
      console.log(`📁 Original combined image: ${combinedPath}`);
      console.log(`🎨 Generated mockup: ${generatedPath}`);
    } else {
      console.log("\n😞 Failed to generate mockup. Please try again.");
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
    console.error("Stack:", err.stack);
  }
}

main();
