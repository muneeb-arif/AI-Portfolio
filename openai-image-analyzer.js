require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");

// Command line argument parsing
const args = process.argv.slice(2);
const isCommandLineMode = args.length > 0;

// Sanitize and validate prompts
function sanitizePrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error("Prompt must be a non-empty string");
  }
  
  // Remove excessive whitespace and trim
  let sanitized = prompt.trim().replace(/\s+/g, ' ');
  
  // Remove potentially problematic characters but keep essential punctuation
  sanitized = sanitized.replace(/[<>{}]/g, '');
  
  // Ensure prompt isn't too long (OpenAI has limits)
  if (sanitized.length > 1000) {
    console.log("⚠️ Prompt is very long, truncating to 1000 characters...");
    sanitized = sanitized.substring(0, 1000).trim();
  }
  
  // Ensure prompt isn't too short
  if (sanitized.length < 3) {
    throw new Error("Prompt is too short. Please provide a descriptive prompt.");
  }
  
  return sanitized;
}

// Parse command line arguments better, handling quoted strings
function parseCommandLineArgs(args) {
  if (args.length === 0) return { mode: null, params: [] };
  
  const mode = args[0];
  let params = [];
  
  if (args.length > 1) {
    // Join all remaining arguments to handle spaces properly
    const fullParam = args.slice(1).join(' ');
    
    // Handle quoted strings (remove quotes but preserve content)
    const cleaned = fullParam.replace(/^["']|["']$/g, '');
    params = [cleaned];
  }
  
  return { mode, params };
}

const app = express();
const PORT = 3004;

// Initialize OpenAI client
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY environment variable is required!");
  console.error("📝 Get your API key from: https://platform.openai.com/api-keys");
  console.error("💡 Add to .env file: OPENAI_API_KEY=your_key_here");
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Read all images from directory and convert to base64
async function loadImagesForAnalysis(folderPath) {
  const files = fs.readdirSync(folderPath).filter(file => /\.(jpg|jpeg|png)$/i.test(file));
  if (files.length === 0) throw new Error("Please add at least 1 image in the folder.");
  
  console.log(`📸 Found ${files.length} images for analysis`);
  
  const imageData = [];
  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const imageBuffer = fs.readFileSync(filePath);
    const imageBase64 = imageBuffer.toString('base64');
    const mimeType = file.toLowerCase().includes('.png') ? 'image/png' : 'image/jpeg';
    
    imageData.push({
      filename: file,
      base64: `data:${mimeType};base64,${imageBase64}`,
      filePath: filePath
    });
    console.log(`✅ Loaded image: ${file}`);
  }
  
  return imageData;
}

// Analyze multiple images with OpenAI Vision
async function analyzeImagesWithOpenAI(imageDataArray, prompt) {
  console.log(`🤖 Analyzing ${imageDataArray.length} images with OpenAI Vision...`);
  
  try {
    // Create content array with text prompt and all images
    const content = [
      { 
        type: "text", 
        text: `${prompt}\n\nI'm providing you with ${imageDataArray.length} website screenshot(s). Please analyze each one and provide insights.` 
      }
    ];
    
    // Add all images to the content
    imageDataArray.forEach((img, index) => {
      content.push({
        type: "image_url",
        image_url: {
          url: img.base64,
          detail: "high"
        }
      });
    });
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Use GPT-4 with vision capabilities
      messages: [
        {
          role: "user",
          content: content
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    });

    const analysis = response.choices[0].message.content;
    console.log("🎯 OpenAI analysis completed!");
    
    return analysis;
    
  } catch (error) {
    console.error("❌ Error analyzing images with OpenAI:", error.message);
    throw error;
  }
}

// Generate portfolio description and insights
async function generatePortfolioInsights(imageDataArray, analysisType = "professional") {
  let prompt;
  
  switch (analysisType) {
    case "technical":
      prompt = "Analyze these website screenshots from a technical perspective. Identify the technologies used, design patterns, UI/UX elements, and provide recommendations for improvements. Be specific about frameworks, color schemes, typography, and layout structures.";
      break;
    case "design":
      prompt = "Analyze these website screenshots from a design perspective. Comment on visual hierarchy, color theory, typography choices, spacing, user experience flow, and overall aesthetic appeal. Provide constructive design feedback.";
      break;
    case "business":
      prompt = "Analyze these website screenshots from a business perspective. Evaluate conversion potential, user engagement elements, call-to-action placement, trust signals, and overall commercial effectiveness.";
      break;
    default: // professional
      prompt = "Analyze these website screenshots and create a professional portfolio description. Highlight the key features, design quality, technical implementation, and unique aspects of each website. Write it as if you're showcasing these projects to potential clients or employers.";
  }
  
  const analysis = await analyzeImagesWithOpenAI(imageDataArray, prompt);
  
  // Save analysis to file
  const portfolioDir = path.join(process.cwd(), 'portfolio');
  if (!fs.existsSync(portfolioDir)) {
    fs.mkdirSync(portfolioDir, { recursive: true });
  }
  
  const fileName = `portfolio-analysis-${analysisType}-${Date.now()}.txt`;
  const fullPath = path.join(portfolioDir, fileName);
  
  const analysisContent = `# Portfolio Analysis (${analysisType.toUpperCase()})
Generated: ${new Date().toISOString()}
Images analyzed: ${imageDataArray.length}
Files: ${imageDataArray.map(img => img.filename).join(', ')}

## Analysis Results:

${analysis}

---
Generated by OpenAI Vision API
`;
  
  fs.writeFileSync(fullPath, analysisContent);
  console.log("💾 Analysis saved to:", fullPath);
  
  return { analysis, filePath: fullPath, fileName };
}

// Generate image using OpenAI DALL-E with screenshots as reference
async function generateImageWithScreenshots(imageDataArray, prompt, outputDir = "./portfolio") {
  console.log(`🎨 Generating image with ${imageDataArray.length} screenshots as reference...`);
  
  try {
    // Create enhanced prompt that references the screenshots
    // const enhancedPrompt = `${prompt}. Create this as a professional portfolio showcase inspired by these ${imageDataArray.length} website screenshot(s): ${imageDataArray.map(img => img.filename).join(', ')}. Make it modern, elegant, and professional.`;
    const enhancedPrompt = prompt;
    console.log(`📝 Enhanced prompt: ${enhancedPrompt}`);
    
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: enhancedPrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style: "vivid"
    });

    const imageUrl = response.data[0].url;
    console.log("📸 Generated image URL:", imageUrl);
    
    // Always download and save the generated image with robust error handling
    console.log("⬇️ Downloading generated image...");
    const fetch = (await import('node-fetch')).default;
    
    let retries = 3;
    let imageResponse;
    
    while (retries > 0) {
      try {
        imageResponse = await fetch(imageUrl);
        if (imageResponse.ok) {
          break;
        } else {
          throw new Error(`HTTP ${imageResponse.status}: ${imageResponse.statusText}`);
        }
      } catch (error) {
        retries--;
        console.log(`⚠️ Download attempt failed: ${error.message}`);
        if (retries > 0) {
          console.log(`🔄 Retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        } else {
          throw new Error(`Failed to download generated image after 3 attempts: ${error.message}`);
        }
      }
    }
    
    const buffer = await imageResponse.buffer();
    console.log(`✅ Downloaded image successfully (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${outputDir}`);
    }
    
    const fileName = `generated-portfolio-${Date.now()}.png`;
    const fullPath = path.join(outputDir, fileName);
    
    fs.writeFileSync(fullPath, buffer);
    console.log("💾 Generated image saved to:", fullPath);
    
    // Verify file was saved successfully
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      console.log(`✅ File verified: ${(stats.size / 1024 / 1024).toFixed(2)} MB saved successfully`);
    } else {
      throw new Error("Failed to save image file to disk");
    }
    
    return { 
      imagePath: fullPath, 
      fileName,
      prompt: enhancedPrompt,
      originalPrompt: prompt,
      referenceImages: imageDataArray.map(img => img.filename)
    };
    
  } catch (error) {
    console.error("❌ Error generating image with OpenAI:", error.message);
    throw error;
  }
}

// Command line interface functions
function showHelp() {
  console.log(`
🚀 OpenAI Portfolio Analyzer & Generator

📋 USAGE:
  node openai-image-analyzer.js [MODE] [OPTIONS]

🔧 MODES:
  analyze [type]     - Analyze screenshots with AI
  generate [prompt]  - Generate portfolio image from prompt + screenshots
  server            - Run web server (default if no args)

📊 ANALYZE TYPES:
  professional      - Portfolio description for clients/employers
  technical         - Technology stack and implementation details
  design           - Visual design and UX analysis
  business         - Commercial effectiveness analysis

🎨 EXAMPLES:
  
  # Analyze screenshots professionally
  node openai-image-analyzer.js analyze professional
  
  # Analyze with technical focus
  node openai-image-analyzer.js analyze technical
  
  # Generate portfolio image (prompts with spaces auto-handled)
  node openai-image-analyzer.js generate Create a modern portfolio showcase with MacBooks
  node openai-image-analyzer.js generate "Professional showcase with clean design"
  
  # Custom analysis (spaces auto-handled, quotes optional)
  node openai-image-analyzer.js analyze What technologies are used in these websites
  node openai-image-analyzer.js analyze "Create LinkedIn description focusing on UX design"
  
  # Run web server
  node openai-image-analyzer.js server

📁 Images are loaded from: ./images/
💾 Results saved to: ./portfolio/
🔧 Prompts are automatically sanitized and validated
✅ Images are always downloaded after AI generation with retry logic
`);
}

async function runCommandLineAnalysis(type) {
  try {
    console.log("📁 Loading images for analysis...");
    const allImages = await loadImagesForAnalysis("./images");
    console.log(`✅ Loaded ${allImages.length} images`);
    
    let result;
    
    if (['professional', 'technical', 'design', 'business'].includes(type)) {
      console.log(`🤖 Running ${type} analysis...`);
      result = await generatePortfolioInsights(allImages, type);
    } else {
      // Custom prompt
      console.log("🎨 Running custom analysis...");
      const analysis = await analyzeImagesWithOpenAI(allImages, type);
      
      const portfolioDir = path.join(process.cwd(), 'portfolio');
      if (!fs.existsSync(portfolioDir)) {
        fs.mkdirSync(portfolioDir, { recursive: true });
      }
      
      const fileName = `custom-analysis-${Date.now()}.txt`;
      const filePath = path.join(portfolioDir, fileName);
      
      const analysisContent = `# Custom Analysis
Generated: ${new Date().toISOString()}
Images analyzed: ${allImages.length}
Custom Prompt: "${type}"

## Analysis Results:

${analysis}
`;
      
      fs.writeFileSync(filePath, analysisContent);
      result = { analysis, filePath, fileName };
    }
    
    console.log("\n✅ Analysis completed!");
    console.log(`📄 Report saved: ${result.fileName}`);
    console.log(`📁 Full path: ${result.filePath}`);
    console.log("\n📄 Analysis preview:");
    console.log("─".repeat(50));
    console.log(result.analysis.substring(0, 300) + "...");
    console.log("─".repeat(50));
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

async function runCommandLineCustomAnalysis(customPrompt) {
  try {
    console.log("📁 Loading images for custom analysis...");
    const allImages = await loadImagesForAnalysis("./images");
    console.log(`✅ Loaded ${allImages.length} images`);
    
    console.log("🎨 Running custom analysis...");
    const analysis = await analyzeImagesWithOpenAI(allImages, customPrompt);
    
    const portfolioDir = path.join(process.cwd(), 'portfolio');
    if (!fs.existsSync(portfolioDir)) {
      fs.mkdirSync(portfolioDir, { recursive: true });
    }
    
    const fileName = `custom-analysis-${Date.now()}.txt`;
    const filePath = path.join(portfolioDir, fileName);
    
    const analysisContent = `# Custom Analysis
Generated: ${new Date().toISOString()}
Images analyzed: ${allImages.length}
Custom Prompt: "${customPrompt}"

## Analysis Results:

${analysis}
`;
    
    fs.writeFileSync(filePath, analysisContent);
    
    console.log("\n✅ Custom analysis completed!");
    console.log(`📄 Report saved: ${fileName}`);
    console.log(`📁 Full path: ${filePath}`);
    console.log("\n📄 Analysis preview:");
    console.log("─".repeat(50));
    console.log(analysis.substring(0, 300) + "...");
    console.log("─".repeat(50));
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

async function runCommandLineGeneration(prompt) {
  try {
    console.log("📁 Loading images for generation...");
    const allImages = await loadImagesForAnalysis("./images");
    console.log(`✅ Loaded ${allImages.length} images as reference`);
    
    console.log("🎨 Generating portfolio image...");
    const result = await generateImageWithScreenshots(allImages, prompt);
    
    console.log("\n✅ Image generation completed!");
    console.log(`🖼️  Generated: ${result.fileName}`);
    console.log(`📁 Full path: ${result.imagePath}`);
    console.log(`📝 Used prompt: ${result.originalPrompt}`);
    console.log(`🔗 Reference images: ${result.referenceImages.join(', ')}`);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}
app.get("/analyze", async (req, res) => {
  try {
    const folder = req.query.folder || "./images";
    const analysisType = req.query.type || "professional"; // professional, technical, design, business
    const customPrompt = req.query.prompt;

    console.log("📁 Loading images for OpenAI analysis from folder:", folder);
    const allImages = await loadImagesForAnalysis(folder);
    console.log(`✅ Loaded ${allImages.length} images`);
    
    let analysis, filePath, fileName;
    
    if (customPrompt) {
      console.log("🎨 Using custom prompt for analysis...");
      const sanitizedPrompt = sanitizePrompt(customPrompt);
      console.log(`📝 Using sanitized prompt: "${sanitizedPrompt}"`);
      analysis = await analyzeImagesWithOpenAI(allImages, sanitizedPrompt);
      
      // Save custom analysis
      const portfolioDir = path.join(process.cwd(), 'portfolio');
      if (!fs.existsSync(portfolioDir)) {
        fs.mkdirSync(portfolioDir, { recursive: true });
      }
      
      fileName = `custom-analysis-${Date.now()}.txt`;
      filePath = path.join(portfolioDir, fileName);
      
      const analysisContent = `# Custom Image Analysis
Generated: ${new Date().toISOString()}
Images analyzed: ${allImages.length}
Custom Prompt: "${customPrompt}"

## Analysis Results:

${analysis}
`;
      
      fs.writeFileSync(filePath, analysisContent);
    } else {
      console.log(`🤖 Generating ${analysisType} portfolio insights...`);
      const result = await generatePortfolioInsights(allImages, analysisType);
      analysis = result.analysis;
      filePath = result.filePath;
      fileName = result.fileName;
    }

    res.json({ 
      message: `✅ OpenAI analysis completed for ${allImages.length} images!`, 
      files: {
        source_images: allImages.map(img => ({
          filename: img.filename,
          analyzed: true
        })),
        analysis_report: {
          filename: fileName,
          full_path: filePath,
          type: customPrompt ? "custom" : analysisType
        }
      },
      analysis_preview: analysis.substring(0, 500) + "...",
      settings: {
        total_images: allImages.length,
        analysis_type: customPrompt ? "custom" : analysisType,
        model: "gpt-4o",
        prompt: customPrompt || `${analysisType} analysis`
      },
      note: `OpenAI analyzed ${allImages.length} website screenshots and generated insights!`,
      instructions: "Check the analysis file in ./portfolio/ directory!"
    });
    
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// API endpoint for simple image description
app.get("/describe", async (req, res) => {
  try {
    const folder = req.query.folder || "./images";
    const question = req.query.question || "What do you see in these website screenshots?";

    console.log("📁 Loading images for description from folder:", folder);
    const allImages = await loadImagesForAnalysis(folder);
    
    const sanitizedQuestion = sanitizePrompt(question);
    console.log(`🤖 Asking OpenAI: "${sanitizedQuestion}"`);
    const description = await analyzeImagesWithOpenAI(allImages, sanitizedQuestion);

    res.json({ 
      message: `✅ OpenAI described ${allImages.length} images!`, 
      question: question,
      description: description,
      images_analyzed: allImages.map(img => img.filename),
      model: "gpt-4o"
    });
    
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Add image generation endpoint
app.get("/generate", async (req, res) => {
  try {
    const folder = req.query.folder || "./images";
    const prompt = req.query.prompt || "Create a modern portfolio showcase with website screenshots displayed on devices";

    console.log("📁 Loading images for generation from folder:", folder);
    const allImages = await loadImagesForAnalysis(folder);
    
    const sanitizedPrompt = sanitizePrompt(prompt);
    console.log(`🎨 Generating portfolio image with prompt: "${sanitizedPrompt}"`);
    const result = await generateImageWithScreenshots(allImages, sanitizedPrompt);

    res.json({ 
      message: `✅ Portfolio image generated with ${allImages.length} references!`, 
      generated_image: {
        filename: result.fileName,
        full_path: result.imagePath,
        original_prompt: result.originalPrompt,
        enhanced_prompt: result.prompt
      },
      reference_images: result.referenceImages,
      model: "dall-e-3"
    });
    
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Command line interface
if (isCommandLineMode) {
  const mode = args[0];
  
  switch (mode) {
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      process.exit(0);
      break;
      
    case 'analyze':
      if (args.length < 2) {
        console.error("❌ Error: Please specify analysis type");
        console.log("💡 Example: node openai-image-analyzer.js analyze professional");
        showHelp();
        process.exit(1);
      }
      
      const analysisParam = args.slice(1).join(' '); // Handle spaces in custom prompts
      console.log(`📝 Analysis parameter: "${analysisParam}"`);
      
      // Check if it's a standard analysis type or custom prompt
      if (['professional', 'technical', 'design', 'business'].includes(analysisParam)) {
        runCommandLineAnalysis(analysisParam);
      } else {
        // Treat as custom prompt and sanitize it
        try {
          const sanitizedPrompt = sanitizePrompt(analysisParam);
          console.log(`📝 Using sanitized custom prompt: "${sanitizedPrompt}"`);
          runCommandLineAnalysis(sanitizedPrompt);
        } catch (error) {
          console.error("❌ Error:", error.message);
          process.exit(1);
        }
      }
      break;
      
    case 'generate':
      if (args.length < 2) {
        console.error("❌ Error: Please provide a prompt for image generation");
        console.log("💡 Example: node openai-image-analyzer.js generate \"Modern portfolio with MacBooks\"");
        console.log("💡 Spaces in prompts are automatically handled");
        process.exit(1);
      }
      
      const generationPrompt = args.slice(1).join(' '); // Join all remaining args as prompt
      
      try {
        const sanitizedPrompt = sanitizePrompt(generationPrompt);
        console.log(`📝 Using sanitized prompt: "${sanitizedPrompt}"`);
        runCommandLineGeneration(sanitizedPrompt);
      } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
      }
      break;
      
    case 'server':
      // Fall through to start server
      break;
      
    default:
      console.error(`❌ Unknown mode: ${mode}`);
      showHelp();
      process.exit(1);
  }
  
  // If we reach here and mode is not 'server', exit (analyze/generate modes handle their own exit)
  if (mode !== 'server') {
    // analyze and generate modes handle their own execution and exit
    return;
  }
}

// Start web server (default behavior or when 'server' mode is specified)
app.listen(PORT, () => {
  console.log(`🚀 OpenAI Image Analyzer running at http://localhost:${PORT}`);
  console.log(`🤖 Model: GPT-4o with Vision & DALL-E 3`);
  console.log(`📁 Analyzes ALL images from ./images directory`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   GET /analyze?type=professional  - Portfolio analysis`);
  console.log(`   GET /analyze?type=technical     - Technical analysis`);
  console.log(`   GET /analyze?type=design        - Design analysis`);
  console.log(`   GET /analyze?type=business      - Business analysis`);
  console.log(`   GET /analyze?prompt="custom"    - Custom prompt analysis`);
  console.log(`   GET /describe?question="what?"  - Simple description`);
  console.log(`   GET /generate?prompt="prompt"   - Generate portfolio image`);
  console.log(`\n💡 Example: /analyze?type=design&folder=./images`);
  console.log(`🎨 OpenAI will analyze your screenshots with vision + text!`);
  console.log(`\n📋 Command Line Usage:`);
  console.log(`   node openai-image-analyzer.js help`);
}); 