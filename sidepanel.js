const iframe = document.getElementById("gemini-frame");
const loading = document.querySelector(".loading");

iframe.addEventListener("load", () => {
  loading.style.display = "none";
  iframe.style.display = "block";
  console.debug("iframe load handler executed");
  
  iframe.focus();
});

iframe.addEventListener("error", () => {
  loading.querySelector(".loading-text").textContent =
    "Failed to load Gemini. Please try again.";
});

// Simple clipboard monitoring without cross-origin complications
function setupBasicClipboardSupport() {
  console.log("Gemini Sidebar: Setting up basic clipboard support");

  // Monitor for copy keyboard shortcuts at the document level
  document.addEventListener("keydown", function (e) {
    // Check for Ctrl+C or Cmd+C
    if ((e.ctrlKey || e.metaKey) && e.key === "c") {
      console.log(
        "Gemini Sidebar: Copy keyboard shortcut detected in side panel"
      );

      // The content script in the iframe will handle the actual copy
      // This just provides logging
    }
  });

  console.log("Gemini Sidebar: Basic clipboard support setup complete");
}

// Set up basic clipboard support
setupBasicClipboardSupport();

console.log("Gemini Sidebar: Side panel script loaded");
