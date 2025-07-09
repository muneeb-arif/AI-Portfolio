const express = require("express");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const app = express();
const PORT = 3002;

// Simple mockup generator without AI - uses image composition
async function combineImages(folderPath, layout = "horizontal", outputPath = "portfolio/combined.jpg") {
  // Create portfolio directory if it doesn't exist
  const portfolioDir = path.dirname(outputPath);
  if (!fs.existsSync(portfolioDir)) {
    fs.mkdirSync(portfolioDir, { recursive: true });
  }
  const files = fs.readdirSync(folderPath).filter(file => /\.(jpg|jpeg|png)$/i.test(file));
  const selected = files.slice(0, 3).map(file => path.join(folderPath, file));
  if (selected.length === 0) throw new Error("Please add at least 1 image in the folder.");
  
  // If we have fewer than 3 images, duplicate the last one to fill up
  while (selected.length < 3) {
    selected.push(selected[selected.length - 1]);
  }

  const buffers = await Promise.all(selected.map(p => sharp(p).resize({ height: 400 }).toBuffer()));
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

// Create a professional-looking portfolio mockup using image compositing
async function createMockupLayout(imagePath, style = "professional") {
  console.log("🎨 Creating portfolio mockup layout...");
  
  try {
    const originalImage = sharp(imagePath);
    const metadata = await originalImage.metadata();
    
    // Create a larger canvas for the mockup
    const canvasWidth = metadata.width + 200;
    const canvasHeight = metadata.height + 200;
    
    let backgroundColor, borderColor, shadowColor;
    
    switch (style) {
      case "modern":
        backgroundColor = { r: 20, g: 20, b: 20, alpha: 1 };
        borderColor = { r: 64, g: 64, b: 64, alpha: 1 };
        shadowColor = { r: 0, g: 0, b: 0, alpha: 0.3 };
        break;
      case "minimal":
        backgroundColor = { r: 250, g: 250, b: 250, alpha: 1 };
        borderColor = { r: 220, g: 220, b: 220, alpha: 1 };
        shadowColor = { r: 0, g: 0, b: 0, alpha: 0.1 };
        break;
      default: // professional
        backgroundColor = { r: 45, g: 55, b: 72, alpha: 1 };
        borderColor = { r: 100, g: 120, b: 140, alpha: 1 };
        shadowColor = { r: 0, g: 0, b: 0, alpha: 0.4 };
    }
    
    // Create border/frame effect
    const borderWidth = 8;
    const shadowOffset = 12;
    
    // Create shadow
    const shadowBuffer = await sharp({
      create: { 
        width: metadata.width + (borderWidth * 2), 
        height: metadata.height + (borderWidth * 2), 
        channels: 4, 
        background: shadowColor 
      },
    }).png().toBuffer();
    
    // Create border
    const borderBuffer = await sharp({
      create: { 
        width: metadata.width + (borderWidth * 2), 
        height: metadata.height + (borderWidth * 2), 
        channels: 4, 
        background: borderColor 
      },
    })
    .composite([{ 
      input: await originalImage.toBuffer(), 
      left: borderWidth, 
      top: borderWidth 
    }])
    .png()
    .toBuffer();
    
    // Create portfolio directory if it doesn't exist
    const portfolioDir = path.join(process.cwd(), 'portfolio');
    if (!fs.existsSync(portfolioDir)) {
      fs.mkdirSync(portfolioDir, { recursive: true });
    }
    
    // Compose final mockup
    const fileName = `portfolio-mockup-${style}-${Date.now()}.jpg`;
    const fullPath = path.join(portfolioDir, fileName);
    
    await sharp({
      create: { width: canvasWidth, height: canvasHeight, channels: 4, background: backgroundColor },
    })
    .composite([
      // Shadow
      { 
        input: shadowBuffer, 
        left: 100 + shadowOffset, 
        top: 100 + shadowOffset 
      },
      // Main image with border
      { 
        input: borderBuffer, 
        left: 100, 
        top: 100 
      }
    ])
    .jpeg({ quality: 90 })
    .toFile(fullPath);
    
    console.log("💾 Portfolio mockup saved to:", fullPath);
    return fullPath;
    
  } catch (error) {
    console.error("❌ Error creating mockup:", error.message);
    throw error;
  }
}

// Add text overlay to showcase portfolio
async function addPortfolioText(imagePath, title = "My Portfolio", subtitle = "Professional Web Development") {
  console.log("✏️ Adding portfolio text...");
  
  try {
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    
    // Create text overlay
    const textSvg = `
      <svg width="${metadata.width}" height="120">
        <defs>
          <style>
            .title { fill: white; font-size: 32px; font-family: Arial, sans-serif; font-weight: bold; }
            .subtitle { fill: #cccccc; font-size: 16px; font-family: Arial, sans-serif; }
          </style>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.7)"/>
        <text x="40" y="45" class="title">${title}</text>
        <text x="40" y="75" class="subtitle">${subtitle}</text>
      </svg>
    `;
    
    const textBuffer = Buffer.from(textSvg);
    
    // Create portfolio directory if it doesn't exist
    const portfolioDir = path.join(process.cwd(), 'portfolio');
    if (!fs.existsSync(portfolioDir)) {
      fs.mkdirSync(portfolioDir, { recursive: true });
    }
    
    const fileName = `portfolio-with-text-${Date.now()}.jpg`;
    const fullPath = path.join(portfolioDir, fileName);
    
    await image
      .composite([
        { input: textBuffer, top: 0, left: 0 }
      ])
      .jpeg({ quality: 90 })
      .toFile(fullPath);
    
    console.log("💾 Portfolio with text saved to:", fullPath);
    return fullPath;
    
  } catch (error) {
    console.error("❌ Error adding text:", error.message);
    throw error;
  }
}

// API endpoint
app.get("/generate", async (req, res) => {
  try {
    const folder = req.query.folder || "./images";
    const layout = req.query.layout || "horizontal"; // horizontal, vertical, grid
    const style = req.query.style || "professional"; // professional, modern, minimal
    const title = req.query.title || "My Portfolio";
    const subtitle = req.query.subtitle || "Professional Web Development";

    console.log("📁 Combining your website screenshots from folder:", folder);
    const combinedPath = await combineImages(folder, layout);
    console.log("✅ Screenshots combined into:", combinedPath);
    
    console.log("🎨 Creating mockup layout...");
    const mockupPath = await createMockupLayout(combinedPath, style);
    
    console.log("✏️ Adding portfolio text...");
    const finalPath = await addPortfolioText(mockupPath, title, subtitle);

    // Get full paths for response (files are now in portfolio directory)
    const fullCombinedPath = path.join(process.cwd(), combinedPath);
    const fullMockupPath = mockupPath; // Already contains full path
    const fullFinalPath = finalPath;   // Already contains full path
    
    // Extract just the filenames for display
    const mockupFilename = path.basename(mockupPath);
    const finalFilename = path.basename(finalPath);

          res.json({ 
        message: "✅ Portfolio mockup created successfully!", 
        files: {
          combined_screenshots: {
            filename: combinedPath,
            full_path: fullCombinedPath
          },
          styled_mockup: {
            filename: `portfolio/${mockupFilename}`,
            full_path: fullMockupPath
          },
          final_portfolio: {
            filename: `portfolio/${finalFilename}`,
            full_path: fullFinalPath
          }
        },
      settings: {
        layout: layout,
        style: style,
        title: title,
        subtitle: subtitle
      },
      note: "Your portfolio mockup has been created using image composition!",
      instructions: "Check the files in your project directory!"
    });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Simple Portfolio Generator running at http://localhost:${PORT}/generate`);
  console.log(`ℹ️ Available layouts: horizontal, vertical, grid`);
  console.log(`🎨 Available styles: professional, modern, minimal`);
  console.log(`💡 Customize with: ?style=modern&title="Your Title"&subtitle="Your Subtitle"`);
  console.log(`📁 Portfolio files will be saved to: ./portfolio/ directory`);
  console.log(`📸 Creates professional portfolio mockups without AI dependencies!`);
}); 