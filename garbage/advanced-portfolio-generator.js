const express = require("express");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const app = express();
const PORT = 3003;

// Advanced portfolio generator - each image gets its own device mockup
async function createDeviceMockups(folderPath, style = "macbook") {
  console.log("📱 Creating individual device mockups...");
  
  const files = fs.readdirSync(folderPath).filter(file => /\.(jpg|jpeg|png)$/i.test(file));
  const selected = files.slice(0, 3).map(file => path.join(folderPath, file));
  if (selected.length === 0) throw new Error("Please add at least 1 image in the folder.");
  
  // If we have fewer than 3 images, duplicate the last one
  while (selected.length < 3) {
    selected.push(selected[selected.length - 1]);
  }

  const mockups = [];
  
  for (let i = 0; i < selected.length; i++) {
    const imagePath = selected[i];
    const mockup = await createSingleDeviceMockup(imagePath, style, i + 1);
    mockups.push(mockup);
  }
  
  return mockups;
}

// Create a single device mockup (MacBook, iPad, etc.)
async function createSingleDeviceMockup(imagePath, style, index) {
  console.log(`🖥️ Creating ${style} mockup for image ${index}...`);
  
  try {
    const originalImage = sharp(imagePath);
    const metadata = await originalImage.metadata();
    
    // Resize the screenshot to fit device screen proportions
    const screenWidth = 800;
    const screenHeight = 500;
    
    const resizedImage = await originalImage
      .resize(screenWidth, screenHeight, { fit: 'fill' })
      .toBuffer();
    
    let mockupBuffer;
    
    switch (style) {
      case "macbook":
        mockupBuffer = await createMacBookMockup(resizedImage, screenWidth, screenHeight);
        break;
      case "gallery":
        mockupBuffer = await createGalleryFrame(resizedImage, screenWidth, screenHeight);
        break;
      case "floating":
        mockupBuffer = await createFloatingMockup(resizedImage, screenWidth, screenHeight);
        break;
      default:
        mockupBuffer = await createMacBookMockup(resizedImage, screenWidth, screenHeight);
    }
    
    // Save individual mockup
    const portfolioDir = path.join(process.cwd(), 'portfolio');
    if (!fs.existsSync(portfolioDir)) {
      fs.mkdirSync(portfolioDir, { recursive: true });
    }
    
    const fileName = `device-mockup-${style}-${index}-${Date.now()}.png`;
    const fullPath = path.join(portfolioDir, fileName);
    
    await sharp(mockupBuffer)
      .png()
      .toFile(fullPath);
    
    console.log(`💾 Device mockup ${index} saved to: ${fullPath}`);
    return { path: fullPath, buffer: mockupBuffer, index };
    
  } catch (error) {
    console.error(`❌ Error creating device mockup ${index}:`, error.message);
    throw error;
  }
}

// Create MacBook mockup with screen, keyboard, and trackpad
async function createMacBookMockup(screenImage, screenWidth, screenHeight) {
  const laptopWidth = screenWidth + 100;
  const laptopHeight = screenHeight + 200;
  
  // Create laptop base (silver/space gray)
  const laptopBase = await sharp({
    create: { 
      width: laptopWidth, 
      height: laptopHeight, 
      channels: 4, 
      background: { r: 200, g: 200, b: 200, alpha: 1 } 
    },
  }).png().toBuffer();
  
  // Create screen bezel (black frame around screen)
  const bezelWidth = screenWidth + 20;
  const bezelHeight = screenHeight + 40;
  const screenBezel = await sharp({
    create: { 
      width: bezelWidth, 
      height: bezelHeight, 
      channels: 4, 
      background: { r: 30, g: 30, b: 30, alpha: 1 } 
    },
  }).png().toBuffer();
  
  // Create keyboard area
  const keyboardSvg = `
    <svg width="${laptopWidth - 20}" height="120">
      <rect width="100%" height="100%" fill="rgb(220,220,220)" rx="5"/>
      <rect x="10" y="10" width="100%" height="80" fill="rgb(240,240,240)" rx="3"/>
      <rect x="40%" y="100" width="20%" height="15" fill="rgb(200,200,200)" rx="7"/>
    </svg>
  `;
  const keyboardBuffer = Buffer.from(keyboardSvg);
  
  // Compose the MacBook
  return await sharp(laptopBase)
    .composite([
      // Screen bezel
      { input: screenBezel, left: 50, top: 30 },
      // Actual screen content
      { input: screenImage, left: 60, top: 50 },
      // Keyboard
      { input: keyboardBuffer, left: 10, top: screenHeight + 60 }
    ])
    .png()
    .toBuffer();
}

// Create gallery frame mockup (like artwork on a wall)
async function createGalleryFrame(screenImage, screenWidth, screenHeight) {
  const frameWidth = 40;
  const totalWidth = screenWidth + (frameWidth * 2);
  const totalHeight = screenHeight + (frameWidth * 2);
  
  // Create wooden/gold frame
  const frame = await sharp({
    create: { 
      width: totalWidth, 
      height: totalHeight, 
      channels: 4, 
      background: { r: 139, g: 69, b: 19, alpha: 1 } // Brown wooden frame
    },
  }).png().toBuffer();
  
  // Create inner white mat
  const matWidth = screenWidth + 20;
  const matHeight = screenHeight + 20;
  const mat = await sharp({
    create: { 
      width: matWidth, 
      height: matHeight, 
      channels: 4, 
      background: { r: 250, g: 250, b: 250, alpha: 1 } 
    },
  }).png().toBuffer();
  
  // Compose the framed artwork
  return await sharp(frame)
    .composite([
      // White mat
      { input: mat, left: frameWidth - 10, top: frameWidth - 10 },
      // Actual screen content
      { input: screenImage, left: frameWidth, top: frameWidth }
    ])
    .png()
    .toBuffer();
}

// Create floating/modern mockup with shadows
async function createFloatingMockup(screenImage, screenWidth, screenHeight) {
  const shadowOffset = 20;
  const totalWidth = screenWidth + shadowOffset + 40;
  const totalHeight = screenHeight + shadowOffset + 40;
  
  // Create shadow
  const shadow = await sharp({
    create: { 
      width: screenWidth, 
      height: screenHeight, 
      channels: 4, 
      background: { r: 0, g: 0, b: 0, alpha: 0.3 } 
    },
  }).blur(10).png().toBuffer();
  
  // Create modern border
  const border = await sharp({
    create: { 
      width: screenWidth + 10, 
      height: screenHeight + 10, 
      channels: 4, 
      background: { r: 255, g: 255, b: 255, alpha: 1 } 
    },
  }).png().toBuffer();
  
  // Create transparent canvas
  const canvas = await sharp({
    create: { 
      width: totalWidth, 
      height: totalHeight, 
      channels: 4, 
      background: { r: 0, g: 0, b: 0, alpha: 0 } 
    },
  }).png().toBuffer();
  
  // Compose the floating mockup
  return await sharp(canvas)
    .composite([
      // Shadow
      { input: shadow, left: 20 + shadowOffset, top: 20 + shadowOffset },
      // White border
      { input: border, left: 15, top: 15 },
      // Actual screen content
      { input: screenImage, left: 20, top: 20 }
    ])
    .png()
    .toBuffer();
}

// Arrange all device mockups in a scene (gallery wall, office desk, etc.)
async function createPortfolioScene(mockups, sceneType = "gallery", title, subtitle) {
  console.log(`🎨 Creating ${sceneType} portfolio scene...`);
  
  try {
    let sceneBuffer;
    
    switch (sceneType) {
      case "gallery":
        sceneBuffer = await createGalleryWallScene(mockups, title, subtitle);
        break;
      case "office":
        sceneBuffer = await createModernStudioScene(mockups, title, subtitle);
        break;
      case "modern":
        sceneBuffer = await createModernStudioScene(mockups, title, subtitle);
        break;
      default:
        sceneBuffer = await createGalleryWallScene(mockups, title, subtitle);
    }
    
    // Save final scene
    const portfolioDir = path.join(process.cwd(), 'portfolio');
    const fileName = `portfolio-scene-${sceneType}-${Date.now()}.jpg`;
    const fullPath = path.join(portfolioDir, fileName);
    
    await sharp(sceneBuffer)
      .jpeg({ quality: 95 })
      .toFile(fullPath);
    
    console.log("💾 Portfolio scene saved to:", fullPath);
    return fullPath;
    
  } catch (error) {
    console.error("❌ Error creating portfolio scene:", error.message);
    throw error;
  }
}

// Create gallery wall scene with proper spacing and lighting
async function createGalleryWallScene(mockups, title, subtitle) {
  const canvasWidth = 1600;
  const canvasHeight = 1000;
  
  // Create gallery wall background (soft white/cream)
  const background = await sharp({
    create: { 
      width: canvasWidth, 
      height: canvasHeight, 
      channels: 4, 
      background: { r: 248, g: 246, b: 242, alpha: 1 } 
    },
  }).png().toBuffer();
  
  // Create title text overlay
  const titleSvg = `
    <svg width="${canvasWidth}" height="150">
      <defs>
        <style>
          .title { fill: #333; font-size: 48px; font-family: 'Helvetica Neue', Arial, sans-serif; font-weight: 300; }
          .subtitle { fill: #666; font-size: 24px; font-family: 'Helvetica Neue', Arial, sans-serif; font-weight: 200; }
        </style>
      </defs>
      <text x="80" y="60" class="title">${title}</text>
      <text x="80" y="100" class="subtitle">${subtitle}</text>
    </svg>
  `;
  const titleBuffer = Buffer.from(titleSvg);
  
  // Arrange mockups on the wall (3 across)
  const spacingX = canvasWidth / 4;
  const spacingY = 200;
  const startY = 200;
  
  const compositeArray = [
    { input: titleBuffer, top: 30, left: 0 }
  ];
  
  // Add each mockup to the wall
  for (let i = 0; i < Math.min(mockups.length, 3); i++) {
    const x = spacingX * (i + 0.5) - 200; // Center each mockup
    const y = startY;
    
    compositeArray.push({
      input: mockups[i].buffer,
      left: Math.max(0, Math.min(x, canvasWidth - 400)),
      top: y
    });
  }
  
  return await sharp(background)
    .composite(compositeArray)
    .png()
    .toBuffer();
}

// Create modern office/studio scene
async function createModernStudioScene(mockups, title, subtitle) {
  const canvasWidth = 1600;
  const canvasHeight = 1000;
  
  // Create modern gradient background
  const backgroundSvg = `
    <svg width="${canvasWidth}" height="${canvasHeight}">
      <defs>
        <linearGradient id="modernGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#modernGrad)"/>
    </svg>
  `;
  const background = Buffer.from(backgroundSvg);
  
  // Create floating arrangement with perspective
  const compositeArray = [];
  
  // Add title in modern style
  const titleSvg = `
    <svg width="${canvasWidth}" height="120">
      <defs>
        <style>
          .title { fill: white; font-size: 42px; font-family: 'SF Pro Display', -apple-system, sans-serif; font-weight: 600; }
          .subtitle { fill: rgba(255,255,255,0.8); font-size: 20px; font-family: 'SF Pro Display', -apple-system, sans-serif; font-weight: 400; }
        </style>
      </defs>
      <text x="80" y="50" class="title">${title}</text>
      <text x="80" y="85" class="subtitle">${subtitle}</text>
    </svg>
  `;
  const titleBuffer = Buffer.from(titleSvg);
  compositeArray.push({ input: titleBuffer, top: 50, left: 0 });
  
  // Arrange mockups with modern floating effect
  const positions = [
    { x: 100, y: 200, scale: 1.0 },   // Left, larger
    { x: 550, y: 150, scale: 0.8 },   // Center, medium
    { x: 900, y: 250, scale: 0.9 }    // Right, medium-large
  ];
  
  for (let i = 0; i < Math.min(mockups.length, 3); i++) {
    const pos = positions[i];
    compositeArray.push({
      input: mockups[i].buffer,
      left: pos.x,
      top: pos.y
    });
  }
  
  return await sharp(background)
    .composite(compositeArray)
    .png()
    .toBuffer();
}

// API endpoint
app.get("/generate", async (req, res) => {
  try {
    const folder = req.query.folder || "./images";
    const deviceStyle = req.query.device || "macbook"; // macbook, gallery, floating
    const sceneType = req.query.scene || "gallery"; // gallery, office, modern
    const title = req.query.title || "My Portfolio";
    const subtitle = req.query.subtitle || "Professional Web Development";

    console.log("📁 Processing individual screenshots from folder:", folder);
    const mockups = await createDeviceMockups(folder, deviceStyle);
    console.log("✅ Individual device mockups created");
    
    console.log("🎨 Creating portfolio scene...");
    const finalScene = await createPortfolioScene(mockups, sceneType, title, subtitle);

    // Get individual mockup file info
    const mockupFiles = mockups.map(mockup => ({
      filename: path.basename(mockup.path),
      full_path: mockup.path
    }));

    res.json({ 
      message: "✅ Advanced portfolio scene created successfully!", 
      files: {
        individual_mockups: mockupFiles,
        final_scene: {
          filename: path.basename(finalScene),
          full_path: finalScene
        }
      },
      settings: {
        device_style: deviceStyle,
        scene_type: sceneType,
        title: title,
        subtitle: subtitle
      },
      note: "Each webpage is now displayed individually in a professional scene!",
      instructions: "Check the ./portfolio/ directory for all generated files!"
    });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Advanced Portfolio Generator running at http://localhost:${PORT}/generate`);
  console.log(`🖥️ Device styles: macbook, gallery, floating`);
  console.log(`🎨 Scene types: gallery, office, modern`);
  console.log(`💡 Example: ?device=macbook&scene=modern&title="My Work"&subtitle="Web Developer"`);
  console.log(`📁 Files saved to: ./portfolio/ directory`);
  console.log(`✨ Each webpage gets its own professional device mockup!`);
}); 