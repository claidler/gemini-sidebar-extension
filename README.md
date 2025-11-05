# Gemini Sidebar Chrome Extension

A Chrome extension that provides quick access to Google Gemini AI in a convenient sidebar.

## Features

- Access Gemini directly from Chrome's sidebar
- Click the extension icon to open/close the sidebar
- Full Gemini functionality in a side panel

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
- Auto-focus is intentionally disabled by Gemini. The editor lives inside isolated iframes and closed shadow roots, which the Chrome extension sandbox cannot pierce, even with `chrome.dom.openOrClosedShadowRoot`. Click into the prompt manually or use Gemini’s shortcuts after the panel opens.
