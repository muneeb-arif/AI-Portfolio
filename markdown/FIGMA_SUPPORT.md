# Figma Screenshot Support

This tool now includes enhanced support for capturing screenshots from Figma links! 🎨

## How It Works

The screenshot tool automatically detects Figma URLs and applies special configurations:

- **Longer loading times** (8 seconds) to allow Figma to fully render
- **Larger viewport** (1920x1080) to capture more of the design
- **Figma-specific selectors** to wait for design elements to load
- **No scrolling** to preserve the design view as intended

## Usage

### Method 1: Using the Main Tool

Add Figma URLs to your `urls.txt` file:

```txt
https://www.figma.com/file/abc123/Design-System
https://www.figma.com/proto/abc123/Prototype
https://figma.com/file/xyz789/Portfolio-Design
```

Then run:
```bash
node screenshot.js --screenshots
```

### Method 2: Using the Figma Test Tool

For testing individual Figma URLs:

```bash
node figma-test.js https://www.figma.com/file/abc123/Design-System
```

## Figma URL Types

### ✅ Supported (Most Reliable)
- **Share Links**: `https://www.figma.com/file/abc123/Design-System?node-id=0%3A1&t=xyz`
- **Public Files**: Files set to "Anyone with the link can view"
- **Prototype Links**: `https://www.figma.com/proto/abc123/Prototype`

### ⚠️ Limited Support
- **Editor URLs**: May require authentication
- **Private Files**: Won't work without login
- **Team Files**: May have access restrictions

## Best Practices

### 1. Use Share Links
Instead of copying from the browser address bar, use Figma's "Share" button:
1. Open your Figma file
2. Click the "Share" button (top right)
3. Set to "Anyone with the link can view"
4. Copy the generated link

### 2. Test Accessibility
Before adding to `urls.txt`, test the link in an incognito browser window to ensure it's publicly accessible.

### 3. Choose the Right Frame
For large designs, consider:
- Creating a specific frame for screenshots
- Using the "Share" feature to link to a specific frame
- Setting the view to show the most important content

## Troubleshooting

### Common Issues

**❌ Timeout Errors**
```
⏰ Page load timeout for https://figma.com/...
```
**Solution**: The file might be private or require authentication. Use a public share link instead.

**❌ No Content Found**
```
⚠️ No Figma-specific elements found
```
**Solution**: This is often normal - the tool will still take a screenshot. Check the output quality.

**❌ Blank Screenshots**
**Solution**: 
- Increase the delay in `FIGMA_CONFIG.preScreenshotDelay`
- Ensure the file is publicly accessible
- Try a different Figma URL format

### Configuration Options

You can modify Figma settings in `screenshot-core.js`:

```javascript
const FIGMA_CONFIG = {
  preScreenshotDelay: 8000,        // Loading delay (ms)
  viewport: { width: 1920, height: 1080 }, // Screenshot size
  waitForSelector: '.figma-canvas, .canvas-container, [data-testid="canvas"], .view-layers',
  scrollBehavior: 'none',          // Don't scroll designs
  timeout: 120000                  // Page load timeout (ms)
};
```

## Examples

### Design System Screenshot
```bash
node figma-test.js https://www.figma.com/file/abc123/Design-System?node-id=0%3A1
```

### Prototype Screenshot
```bash
node figma-test.js https://www.figma.com/proto/abc123/Prototype?node-id=0%3A1&scaling=scale-down
```

### Batch Processing
```txt
# urls.txt
https://www.figma.com/file/abc123/Design-System
https://www.figma.com/file/xyz789/Portfolio-Design
https://www.figma.com/proto/def456/App-Prototype
```

## Output

Figma screenshots are saved with special naming:
- `figma_viewport_[timestamp].jpg` - Viewport-only screenshot
- `figma_full_[timestamp].jpg` - Full page screenshot

The tool creates a separate `figma-screenshots/` directory when using the test tool, or saves to the regular `screenshots/` directory when using the main tool.

## Limitations

1. **Authentication Required**: Files requiring login won't work
2. **Large Designs**: Very large Figma files may not capture completely
3. **Interactive Elements**: Prototypes and interactive elements may not render as expected
4. **Performance**: Figma files can be slow to load, especially complex designs

## Tips for Better Results

1. **Optimize Your Figma File**:
   - Use reasonable canvas sizes
   - Organize content in frames
   - Remove unnecessary elements

2. **Use Specific Frames**:
   - Share links to specific frames instead of entire files
   - This ensures the most important content is visible

3. **Test Different Viewports**:
   - Modify `FIGMA_CONFIG.viewport` for different aspect ratios
   - Common sizes: 1920x1080, 1440x900, 1280x720

4. **Batch Processing**:
   - Test individual URLs first with `figma-test.js`
   - Then add working URLs to `urls.txt` for batch processing 