chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

const panelOpenStateByWindow = new Map();

if (chrome.sidePanel.onOpened) {
  chrome.sidePanel.onOpened.addListener(({ windowId }) => {
    if (typeof windowId === "number") {
      panelOpenStateByWindow.set(windowId, true);
    }
  });
}

if (chrome.sidePanel.onClosed) {
  chrome.sidePanel.onClosed.addListener(({ windowId }) => {
    if (typeof windowId === "number") {
      panelOpenStateByWindow.set(windowId, false);
    }
  });
}

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== "toggle-sidepanel") {
    return;
  }
  const windowId = tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT;
  if (windowId === undefined) {
    return;
  }
  const isOpen = panelOpenStateByWindow.get(windowId) ?? false;
  let closed = false;
  if (isOpen) {
    if (typeof chrome.sidePanel.close === "function") {
      try {
        await chrome.sidePanel.close({ windowId });
        panelOpenStateByWindow.set(windowId, false);
        closed = true;
      } catch (error) {
        console.error(error);
      }
    } else {
      console.warn(
        "chrome.sidePanel.close is unavailable in this version of Chrome."
      );
      return;
    }
  }
  if (closed) {
    return;
  }
  try {
    await chrome.sidePanel.open({ windowId });
    panelOpenStateByWindow.set(windowId, true);
  } catch (error) {
    console.error(error);
  }
});

// Handle clipboard operations for the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "copyToClipboard") {
    console.log("Background: Copy to clipboard request received");

    if (request.text) {
      // Use the clipboard API
      navigator.clipboard
        .writeText(request.text)
        .then(() => {
          console.log("Background: Text copied to clipboard successfully");
          sendResponse({ success: true });
        })
        .catch((err) => {
          console.error("Background: Failed to copy text:", err);
          sendResponse({ success: false, error: err.message });
        });

      return true; // Keep the message channel open for async response
    }
  }
});


