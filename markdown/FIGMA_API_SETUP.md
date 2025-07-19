# Figma API Setup Guide

This guide explains how to set up Figma API access for reliable screenshot capture.

## 🔑 Getting a Figma Personal Access Token

### Step 1: Access Figma Settings
1. Go to [Figma.com](https://figma.com) and log in
2. Click on your profile icon (top right)
3. Select **Settings** from the dropdown menu

### Step 2: Generate Personal Access Token
1. In Settings, scroll down to **Personal access tokens**
2. Click **Create new token**
3. Give it a descriptive name (e.g., "Screenshot Tool")
4. Copy the generated token immediately (you won't see it again!)

### Step 3: Add to Environment
Add the token to your `.env` file:
```bash
FIGMA_PERSONAL_TOKEN=your_token_here
```

## 📋 File Access Requirements

### ✅ What Your Token Can Access
- **Your own files**: Any file you created
- **Team files**: Files in teams where you have access
- **Shared files**: Files shared with you (if you have view/edit permissions)

### ❌ What Your Token Cannot Access
- **Private files**: Files not shared with your account
- **Public files**: Some public files may have restrictions
- **Deleted files**: Files that have been moved to trash

## 🧪 Testing Your Token

### Test with a Simple File
Create a test file in your Figma account and try:
```bash
node figma-api.js "https://www.figma.com/file/YOUR_FILE_KEY/Test-File"
```

### Check Token Permissions
The tool will tell you if there are access issues:
- **403 Error**: Token doesn't have access to the file
- **404 Error**: File doesn't exist or key is wrong
- **401 Error**: Token is invalid

## 🔧 Troubleshooting

### Common Issues

**❌ "Access denied" (403)**
```
❌ Failed to get Figma file info: Request failed with status code 403
   🔒 Access denied. Check if your token has access to this file.
```

**Solutions:**
1. Make sure you own the file or have been given access
2. Check if the file is in a team where you have permissions
3. Try with a file you created yourself

**❌ "File not found" (404)**
```
❌ Failed to get Figma file info: Request failed with status code 404
   📄 File not found. Check the file key.
```

**Solutions:**
1. Verify the file key in the URL
2. Make sure the file hasn't been deleted
3. Check if the URL is correct

**❌ "Token not found"**
```
❌ FIGMA_PERSONAL_TOKEN not found in .env file
```

**Solutions:**
1. Add the token to your `.env` file
2. Make sure there are no extra spaces or quotes
3. Restart your terminal after adding the token

## 🎯 URL Formats Supported

### File URLs
```
https://www.figma.com/file/{file_key}/{file_name}?node-id={node_id}
```

### Prototype URLs
```
https://www.figma.com/proto/{file_key}/{file_name}?node-id={node_id}
```

### Examples
```bash
# File with specific node
node figma-api.js "https://www.figma.com/file/abc123/Design-System?node-id=0%3A1"

# Prototype with specific frame
node figma-api.js "https://www.figma.com/proto/xyz789/App-Prototype?node-id=84-164"

# File without specific node (will use first page)
node figma-api.js "https://www.figma.com/file/def456/Portfolio"
```

## 🔄 Fallback Behavior

The tool automatically falls back to browser-based screenshots if:
- API method fails
- Token doesn't have access
- File requires authentication

This ensures you can still capture screenshots even if API access isn't available.

## 📊 API vs Browser Method

| Feature | API Method | Browser Method |
|---------|------------|----------------|
| **Speed** | ⚡ Fast | 🐌 Slower |
| **Reliability** | ✅ High | ⚠️ Variable |
| **Private Files** | ✅ Yes | ❌ No |
| **Quality** | 🎯 Perfect | 🎨 Good |
| **Setup** | 🔑 Token required | 🚀 No setup |

## 🚀 Best Practices

1. **Use API for private files**: API method works with private files
2. **Use browser for public files**: Browser method works with public files
3. **Test your token**: Always test with a file you own first
4. **Keep token secure**: Never commit your token to version control
5. **Monitor usage**: Figma has API rate limits

## 📈 API Rate Limits

Figma API has rate limits:
- **File info**: 100 requests per minute
- **Image export**: 100 requests per minute
- **File content**: 100 requests per minute

The tool handles rate limiting gracefully and will retry if needed.

## 🔍 Debugging

Enable debug mode by setting:
```bash
DEBUG=figma-api node figma-api.js "your-url"
```

This will show detailed API requests and responses. 