const iframe = document.getElementById("gemini-frame");
const loading = document.querySelector(".loading");

iframe.addEventListener("load", () => {
  loading.style.display = "none";
  iframe.style.display = "block";
  console.debug("iframe load handler executed");
});

iframe.addEventListener("error", () => {
  loading.querySelector(".loading-text").textContent =
    "Failed to load Gemini. Please try again.";
});

