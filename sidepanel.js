const iframe = document.getElementById("gemini-frame");
const loading = document.querySelector(".loading");

const requestEditorFocus = () => {
  if (!iframe.contentWindow) {
    console.debug("requestEditorFocus skipped missing contentWindow");
    return;
  }

  iframe.contentWindow.postMessage({ type: "focus-editor" }, "*");
  console.debug("requestEditorFocus posted");
};

let focusSchedulerActive = false;
const scheduleFocusRequests = () => {
  if (focusSchedulerActive) {
    console.debug("scheduleFocusRequests ignored active");
    return;
  }
  focusSchedulerActive = true;
  console.debug("scheduleFocusRequests start");
  for (let index = 0; index < 20; index += 1) {
    setTimeout(() => {
      requestEditorFocus();
      if (index === 19) {
        focusSchedulerActive = false;
        console.debug("scheduleFocusRequests end");
      }
    }, index * 250);
  }
};

iframe.addEventListener("load", () => {
  loading.style.display = "none";
  iframe.style.display = "block";
  scheduleFocusRequests();
  console.debug("iframe load handler executed");
});

iframe.addEventListener("error", () => {
  loading.querySelector(".loading-text").textContent =
    "Failed to load Gemini. Please try again.";
});

window.addEventListener("focus", scheduleFocusRequests);

if (chrome?.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "sidepanel-focus") {
      scheduleFocusRequests();
      console.debug("runtime sidepanel-focus received", message);
    }
  });
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    scheduleFocusRequests();
    console.debug("visibilitychange visible");
  }
});
