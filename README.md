# Gemini Sidebar Chrome Extension

A Chrome extension that provides quick access to Google Gemini AI in a convenient sidebar.

## Features

- Access Gemini directly from Chrome's sidebar
- Click the extension icon to open/close the sidebar
- Full Gemini functionality in a side panel
- **Copy functionality that works despite Google's restrictions**

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked"
4. Select the extension directory

## Usage

1. Click the Gemini Sidebar icon in your Chrome toolbar
2. The sidebar will open with Gemini loaded
3. Sign in to your Google account if needed
4. Start chatting with Gemini!

## Requirements

- Chrome 114 or later (for Side Panel API support)
- Active internet connection
- Google account for Gemini access

## Notes

- You need to be signed in to your Google account to use Gemini
- The extension loads the official Gemini web interface
- Auto-focus is intentionally disabled by Gemini. The editor lives inside isolated iframes and closed shadow roots, which the Chrome extension sandbox cannot pierce, even with `chrome.dom.openOrClosedShadowRoot`. Click into the prompt manually or use Gemini's shortcuts after the panel opens.

## Copy Functionality

The extension now includes comprehensive copy functionality that works around Google's permissions policies:

- **Keyboard shortcuts**: Ctrl+C (Windows/Linux) or Cmd+C (Mac) work for text selection
- **Context menu**: Right-click and select "Copy" from the context menu
- **Copy buttons**: Automatically detects and handles copy buttons in the Gemini interface
- **Permissions policy bypass**: Works around clipboard API restrictions using execCommand

### How Copy Works

1. The content script runs within the Gemini page context (not the iframe boundary)
2. Text extraction algorithms find the appropriate content to copy
3. The extension uses `document.execCommand('copy')` to bypass permissions policies
4. Visual notifications guide users through the copy process
5. Multiple fallback methods ensure reliability

### Testing Copy Functionality

1. **Reload the Extension**: Go to `chrome://extensions/`, enable Developer mode, and reload the extension
2. **Open Browser Console**: Press F12 to open developer tools and monitor for "Gemini Sidebar Content Script:" debug messages
3. **Test Copy Methods**:
   - **Text Selection**: Select text in Gemini responses and press Ctrl+C/Cmd+C
   - **Copy Buttons**: Click any copy buttons in Gemini interface
   - **Context Menu**: Right-click on text and select "Copy"
4. **Verify**: Paste the copied content to confirm it worked
5. **Check Console**: Look for success/error messages in the browser console

### Understanding the Copy Process

Due to Google's strict permissions policies that block clipboard access within Gemini, the extension uses an alternative approach:

1. **Text Extraction**: When you click a copy button or select text, the extension extracts the relevant text content
2. **Manual Selection**: The extension automatically selects the extracted text
3. **execCommand Copy**: Uses the older but reliable `document.execCommand('copy')` method
4. **User Notification**: Shows clear notifications about the copy status

### Troubleshooting Copy Issues

If copy doesn't work:

1. **Check Console**: Open browser console (F12) and look for "Gemini Sidebar Content Script:" messages
2. **Try Multiple Methods**: If copy buttons don't work, try text selection + Ctrl+C
3. **Check Selection**: Ensure text is properly selected before copying
4. **Retry**: Sometimes you may need to press Ctrl+C twice
5. **Manual Copy**: If automatic copy fails, the text will be selected for manual copying

### Common Issues and Solutions

- **"Something went wrong"**: This is Google's error message. The extension will extract text and prepare it for copying.
- **Permissions policy violation**: The extension bypasses this using execCommand instead of the Clipboard API
- **Text not copying**: The extension will select the text automatically - just press Ctrl+C again
- **Copy button not detected**: Try selecting the text manually and using keyboard shortcuts

The extension is designed to work reliably despite Google's restrictions and provides multiple fallback methods for copying text.
