// Content script for handling clipboard operations in Gemini iframe
console.log("Gemini Sidebar Content Script: Loaded on gemini.google.com");

// Store the last selected text for copy operations
let lastSelectedText = "";
let lastSelectedElement = null;
let extractedTextForCopy = "";
let isHandlingCopy = false; // Prevent recursive copy handling
let isProgrammaticCopy = false; // Flag to indicate we are performing a fallback copy

// Monitor for text selection continuously
document.addEventListener("selectionchange", function () {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();

  if (selectedText && selectedText !== lastSelectedText) {
    lastSelectedText = selectedText;
    lastSelectedElement = selection.anchorNode;
    console.log(
      "Gemini Sidebar Content Script: Text selection updated:",
      selectedText.substring(0, 50) + "..."
    );
  }
});

// Monitor for copy button clicks using a more robust approach
function monitorCopyButtons() {
  // Use event delegation to catch copy button clicks
  document.addEventListener("click", function (e) {
    // Check if the clicked element or its ancestors might be a copy button
    const clickedElement = e.target;
    const possibleCopyButton = findCopyButton(clickedElement);

    if (possibleCopyButton) {
      console.log(
        "Gemini Sidebar Content Script: Potential copy button clicked"
      );
      handleCopyButtonClick(possibleCopyButton, e);
    }
  });
}

// Function to find if an element is a copy button - ENHANCED for Gemini
function findCopyButton(element) {
  // Check the element itself and its ancestors for copy-related attributes
  let currentElement = element;

  while (currentElement && currentElement !== document.body) {
    // Check for common copy button indicators
    const tagName = currentElement.tagName.toLowerCase();
    const className = (currentElement.className || "").toString();
    const ariaLabel = currentElement.getAttribute("aria-label") || "";
    const title = currentElement.getAttribute("title") || "";
    const dataTestId = currentElement.getAttribute("data-testid") || "";
    const innerText = currentElement.innerText || "";
    const role = currentElement.getAttribute("role") || "";

    console.log("Gemini Sidebar Content Script: Checking element:", {
      tagName,
      className: className.substring(0, 100),
      ariaLabel,
      title,
      dataTestId,
      innerText: innerText.substring(0, 50),
      role,
    });

    // Check for copy-related keywords
    const copyKeywords = ["copy", "duplicate", "clone", "clipboard"];
    const elementText = (
      className +
      " " +
      ariaLabel +
      " " +
      title +
      " " +
      dataTestId +
      " " +
      innerText +
      " " +
      role
    ).toLowerCase();

    if (copyKeywords.some((keyword) => elementText.includes(keyword))) {
      console.log(
        "Gemini Sidebar Content Script: Found copy button by keywords"
      );
      return currentElement;
    }

    // Check for SVG icons that might indicate copy functionality
    const svgElements = currentElement.querySelectorAll("svg");
    for (let svg of svgElements) {
      const svgText = (svg.innerHTML || "").toLowerCase();
      if (
        svgText.includes("copy") ||
        svgText.includes("duplicate") ||
        svgText.includes("clipboard")
      ) {
        console.log(
          "Gemini Sidebar Content Script: Found copy button by SVG content"
        );
        return currentElement;
      }
    }

    // Check for specific Gemini patterns
    if (
      className.includes("copy-button") ||
      className.includes("copy-icon") ||
      className.includes("copy-btn") ||
      dataTestId.includes("copy") ||
      ariaLabel.includes("copy")
    ) {
      console.log(
        "Gemini Sidebar Content Script: Found copy button by Gemini patterns"
      );
      return currentElement;
    }

    // Check if it's a button or clickable element
    if (
      tagName === "button" ||
      tagName === "a" ||
      role === "button" ||
      currentElement.onclick ||
      className.includes("btn") ||
      className.includes("button") ||
      currentElement.getAttribute("tabindex") === "0"
    ) {
      // Additional heuristics for Gemini-specific copy buttons
      const parent = currentElement.parentElement;
      if (parent) {
        const parentText = (parent.innerText || "").toLowerCase();
        const parentClass = (parent.className || "").toLowerCase();

        if (parentText.includes("copy") || parentClass.includes("copy")) {
          console.log(
            "Gemini Sidebar Content Script: Found copy button by parent context"
          );
          return currentElement;
        }
      }

      // Check siblings for copy context
      const siblings = Array.from(currentElement.parentElement?.children || []);
      for (let sibling of siblings) {
        if (sibling !== currentElement) {
          const siblingText = (sibling.innerText || "").toLowerCase();
          const siblingClass = (sibling.className || "").toLowerCase();
          if (siblingText.includes("copy") || siblingClass.includes("copy")) {
            console.log(
              "Gemini Sidebar Content Script: Found copy button by sibling context"
            );
            return currentElement;
          }
        }
      }
    }

    currentElement = currentElement.parentElement;
  }

  return null;
}

// Handle copy button clicks
function handleCopyButtonClick(buttonElement, event) {
  console.log("Gemini Sidebar Content Script: Handling copy button click");

  // Prevent recursive handling
  if (isHandlingCopy) {
    return;
  }

  // Try to find the text to copy near the button
  const textToCopy = findTextToCopy(buttonElement);

  if (textToCopy) {
    console.log(
      "Gemini Sidebar Content Script: Found text to copy:",
      textToCopy.substring(0, 100) + "..."
    );

    extractedTextForCopy = textToCopy;

    // Visual feedback
    selectTextForCopy(textToCopy, buttonElement);

    // Perform copy
    isHandlingCopy = true;
    copyToClipboard(textToCopy).finally(() => {
      isHandlingCopy = false;
    });

    // Prevent default to avoid Google's copy handler
    event.preventDefault();
    event.stopPropagation();
  } else {
    console.log("Gemini Sidebar Content Script: No text found to copy");

    // Fallback: try to use the last selected text
    if (lastSelectedText) {
      console.log("Gemini Sidebar Content Script: Using last selected text");
      extractedTextForCopy = lastSelectedText;
      copyToClipboard(lastSelectedText);
    } else {
      // Try to find text in a broader area
      const broaderText = findTextInBroaderContext(buttonElement);
      if (broaderText) {
        extractedTextForCopy = broaderText;
        selectTextForCopy(broaderText, buttonElement);
        copyToClipboard(broaderText);
      } else {
        showCopyNotification("No text found to copy - try selecting manually");
      }
    }
  }
}

// Find text to copy near a button element - ENHANCED
function findTextToCopy(buttonElement) {
  console.log("Gemini Sidebar Content Script: Finding text to copy");

  // Strategy 1: Look for text in the same container
  const containerSelectors = [
    ".message",
    ".response",
    ".text-container",
    "div",
    "article",
    "section",
    "[data-message-author]",
    ".markdown",
    ".prose",
    ".chat-message",
    ".response-text",
    ".message-content",
    ".text-block",
  ];

  for (let selector of containerSelectors) {
    const container = buttonElement.closest(selector);
    if (container) {
      console.log("Gemini Sidebar Content Script: Found container:", selector);

      // Get text but exclude the button text itself
      let containerText = "";
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      let textNode;
      while ((textNode = walker.nextNode())) {
        // Skip text nodes that are inside the button or its descendants
        if (!buttonElement.contains(textNode)) {
          containerText += textNode.textContent + " ";
        }
      }

      if (containerText.trim()) {
        console.log(
          "Gemini Sidebar Content Script: Found text in container:",
          containerText.substring(0, 100) + "..."
        );
        return containerText.trim();
      }
    }
  }

  // Strategy 2: Look for text in previous siblings
  let previous = buttonElement.previousElementSibling;
  while (previous) {
    const text = previous.innerText || previous.textContent;
    if (text && text.trim().length > 10) {
      console.log(
        "Gemini Sidebar Content Script: Found text in previous sibling:",
        text.substring(0, 100) + "..."
      );
      return text.trim();
    }
    previous = previous.previousElementSibling;
  }

  // Strategy 3: Look for text in next siblings
  let next = buttonElement.nextElementSibling;
  while (next) {
    const text = next.innerText || next.textContent;
    if (text && text.trim().length > 10) {
      console.log(
        "Gemini Sidebar Content Script: Found text in next sibling:",
        text.substring(0, 100) + "..."
      );
      return text.trim();
    }
    next = next.nextElementSibling;
  }

  // Strategy 4: Look for text in parent
  const parent = buttonElement.parentElement;
  if (parent) {
    // Get all text from parent except button text
    let parentText = parent.innerText || parent.textContent || "";
    const buttonText =
      buttonElement.innerText || buttonElement.textContent || "";

    // Remove button text from parent text
    if (buttonText && parentText.includes(buttonText)) {
      parentText = parentText.replace(buttonText, "");
    }

    if (parentText.trim().length > 10) {
      console.log(
        "Gemini Sidebar Content Script: Found text in parent:",
        parentText.substring(0, 100) + "..."
      );
      return parentText.trim();
    }
  }

  console.log(
    "Gemini Sidebar Content Script: No text found in standard locations"
  );
  return null;
}

// Find text in broader context
function findTextInBroaderContext(buttonElement) {
  console.log("Gemini Sidebar Content Script: Searching in broader context");

  // Look for common Gemini response containers
  const broadSelectors = [
    "main",
    "article",
    '[role="main"]',
    ".main-content",
    ".chat-container",
    ".conversation",
    ".messages",
    '[data-testid*="message"]',
    "[data-message-id]",
  ];

  for (let selector of broadSelectors) {
    const broadContainer = buttonElement.closest(selector);
    if (broadContainer) {
      console.log(
        "Gemini Sidebar Content Script: Found broad container:",
        selector
      );

      // Look for text content that might be a response
      const textElements = broadContainer.querySelectorAll(
        "p, div, span, article"
      );
      let longestText = "";

      for (let element of textElements) {
        const text = element.innerText || element.textContent || "";
        if (text.length > longestText.length && text.length > 50) {
          longestText = text;
        }
      }

      if (longestText) {
        console.log(
          "Gemini Sidebar Content Script: Found longest text in broad context:",
          longestText.substring(0, 100) + "..."
        );
        return longestText.trim();
      }
    }
  }

  return null;
}

// Select text for copying
function selectTextForCopy(text, referenceElement) {
  console.log("Gemini Sidebar Content Script: Selecting text for copy");

  try {
    // Create a temporary element to hold the text
    const tempDiv = document.createElement("div");
    tempDiv.textContent = text;
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    tempDiv.style.top = "-9999px";
    tempDiv.style.opacity = "0";
    tempDiv.style.userSelect = "text";
    tempDiv.style.webkitUserSelect = "text";
    tempDiv.style.mozUserSelect = "text";
    tempDiv.style.msUserSelect = "text";
    tempDiv.setAttribute("contenteditable", "true");

    document.body.appendChild(tempDiv);

    // Select the text
    const range = document.createRange();
    range.selectNodeContents(tempDiv);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    console.log("Gemini Sidebar Content Script: Text selected for copying");

    // Clean up after a short delay
    setTimeout(() => {
      document.body.removeChild(tempDiv);
    }, 2000);

    return true;
  } catch (error) {
    console.error(
      "Gemini Sidebar Content Script: Failed to select text:",
      error
    );
    return false;
  }
}

// Consolidated copy function using Clipboard API with execCommand fallback
async function copyToClipboard(text) {
  console.log("Gemini Sidebar Content Script: Attempting to copy text...");

  // Try Clipboard API first
  try {
    await navigator.clipboard.writeText(text);
    console.log("Gemini Sidebar Content Script: Copied using Clipboard API");
    showCopyNotification("Copied to clipboard!");
    return true;
  } catch (err) {
    console.log(
      "Gemini Sidebar Content Script: Clipboard API failed, falling back to execCommand",
      err
    );
  }

  // Fallback to execCommand
  try {
    isProgrammaticCopy = true;
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    textArea.setAttribute("readonly", "");
    document.body.appendChild(textArea);

    textArea.focus();
    textArea.select();

    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);

    if (successful) {
      console.log("Gemini Sidebar Content Script: Copied using execCommand");
      showCopyNotification("Copied to clipboard!");
      return true;
    } else {
      console.error("Gemini Sidebar Content Script: execCommand failed");
      return false;
    }
  } catch (err) {
    console.error("Gemini Sidebar Content Script: execCommand error", err);
    return false;
  } finally {
    isProgrammaticCopy = false;
  }
}

// Show a copy notification with instructions
function showCopyNotification(message) {
  // Remove any existing notification
  const existingNotification = document.querySelector(
    ".gemini-sidebar-copy-notification"
  );
  if (existingNotification) {
    existingNotification.remove();
  }

  // Create notification element
  const notification = document.createElement("div");
  notification.className = "gemini-sidebar-copy-notification";
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #1a73e8;
    color: white;
    padding: 12px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    max-width: 300px;
    text-align: center;
  `;

  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => {
    notification.style.opacity = "1";
  }, 10);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Monitor keyboard shortcuts
document.addEventListener("keydown", function (e) {
  // Check for Ctrl+C or Cmd+C
  if ((e.ctrlKey || e.metaKey) && e.key === "c") {
    console.log(
      "Gemini Sidebar Content Script: Copy keyboard shortcut detected"
    );

    // Get selected text
    const selection = window.getSelection();
    const selectedText = selection.toString();

    if (selectedText) {
      console.log(
        "Gemini Sidebar Content Script: Text selected for keyboard copy"
      );
      // We can let the default copy event happen, which our copy listener will catch
      // or we can trigger it explicitly if needed.
      // But usually Ctrl+C triggers 'copy' event automatically.
    }
  }
});

// Monitor context menu
document.addEventListener("contextmenu", function (e) {
  console.log("Gemini Sidebar Content Script: Context menu opened");

  // Store the selected text when context menu opens
  const selection = window.getSelection();
  const selectedText = selection.toString();

  if (selectedText) {
    console.log(
      "Gemini Sidebar Content Script: Text available for context menu copy"
    );
    lastSelectedText = selectedText;
  }
});

// Override the copy event to handle it ourselves
document.addEventListener("copy", function (e) {
  // If this is our own programmatic copy (fallback), let it proceed
  if (isProgrammaticCopy) {
    return;
  }

  console.log("Gemini Sidebar Content Script: Copy event detected");

  const selection = window.getSelection();
  const selectedText = selection.toString();

  if (selectedText) {
    console.log(
      "Gemini Sidebar Content Script: Intercepting copy for text:",
      selectedText.substring(0, 50) + "..."
    );

    // Use setData to ensure the text is on the clipboard
    e.preventDefault();
    e.clipboardData.setData("text/plain", selectedText);
    
    showCopyNotification("Copied to clipboard!");
  }
});

// Start monitoring copy buttons
monitorCopyButtons();

console.log(
  "Gemini Sidebar Content Script: Initialization complete - Ready to handle copy operations"
);
