const selectors = [
  '[aria-label="Enter a prompt here"]',
  '[aria-label="Ask Gemini"]',
  "rich-textarea",
  'rich-textarea [contenteditable="true"]',
  '[role="textbox"][contenteditable="true"]',
];
const fallbackSelectors = [
  '[contenteditable="true"]',
  "textarea",
  'input[type="text"]',
  'input[type="search"]',
  'input[type="url"]',
  'input[type="email"]',
  'input[type="tel"]',
  "rich-textarea",
];
let focusInterval;
let lastNotFoundLog = 0;
let lastShadowErrorLog = 0;
const describeElement = (element) => ({
  tag: element.tagName,
  id: element.id || undefined,
  classes: element.className || undefined,
  role: element.getAttribute("role") || undefined,
  ariaLabel: element.getAttribute("aria-label") || undefined,
});
const isVisible = (element) => {
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") {
    return false;
  }
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};
const matchesSelector = (element, selector) => {
  try {
    return element.matches(selector);
  } catch (error) {
    return false;
  }
};
const customTextHosts = new Set([
  "RICH-TEXTAREA",
  "TEXT-INPUT-FIELD",
  "APP-TEXT-AREA",
]);
const openShadowRoots = (element) => {
  const roots = [];
  if (element.shadowRoot) {
    roots.push(element.shadowRoot);
  }
  if (chrome?.dom?.openOrClosedShadowRoot) {
    const shouldAttempt = element.tagName?.includes("-") || !element.shadowRoot;
    if (shouldAttempt) {
      try {
        const root = chrome.dom.openOrClosedShadowRoot(element);
        if (root && !roots.includes(root)) {
          roots.push(root);
        }
      } catch (error) {
        const now = Date.now();
        if (now - lastShadowErrorLog > 1500) {
          lastShadowErrorLog = now;
          console.debug("focusEditor shadow access failed", {
            tag: element.tagName,
            error: error?.message,
          });
        }
      }
    }
  }
  return roots;
};
const isTextInput = (element) => {
  if (element instanceof HTMLTextAreaElement) {
    return true;
  }
  if (element instanceof HTMLInputElement) {
    const type = element.type?.toLowerCase();
    return (
      type === "text" ||
      type === "search" ||
      type === "url" ||
      type === "email" ||
      type === "tel" ||
      type === "number"
    );
  }
  const tag = element.tagName?.toUpperCase();
  if (customTextHosts.has(tag)) {
    return true;
  }
  const explicit = element.getAttribute("contenteditable");
  if (explicit && explicit.toLowerCase() !== "false") {
    return true;
  }
  if (element.isContentEditable) {
    return true;
  }
  const role = element.getAttribute("role");
  if (role === "textbox" || role === "combobox") {
    return true;
  }
  return false;
};
const findEditor = () => {
  const queue = [document];
  const visited = new Set();
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node || visited.has(node)) {
      continue;
    }
    visited.add(node);
    if (node instanceof Element) {
      if (isVisible(node) && isTextInput(node)) {
        const matchedSelector = selectors.find((selector) =>
          matchesSelector(node, selector)
        );
        return {
          editor: node,
          descriptor: {
            ...describeElement(node),
            matchedSelector,
            strategy: matchedSelector ? "selector-match" : "text-input",
          },
        };
      }
      const shadowRoots = openShadowRoots(node);
      for (const shadowRoot of shadowRoots) {
        queue.push(shadowRoot);
      }
      for (let index = 0; index < node.children.length; index += 1) {
        queue.push(node.children[index]);
      }
      continue;
    }
    if (node instanceof Document || node instanceof ShadowRoot) {
      for (let index = 0; index < node.children.length; index += 1) {
        queue.push(node.children[index]);
      }
    }
  }
  return undefined;
};
const logNotFound = () => {
  const now = Date.now();
  if (now - lastNotFoundLog <= 1500) {
    return;
  }
  lastNotFoundLog = now;
  const selectorCounts = selectors.map((candidate) => ({
    selector: candidate,
    count: document.querySelectorAll(candidate).length,
  }));
  const fallbackCounts = fallbackSelectors.map((candidate) => ({
    selector: candidate,
    count: document.querySelectorAll(candidate).length,
  }));
  const textboxCount = document.querySelectorAll('[role="textbox"]').length;
  const richTextAreaCount = document.querySelectorAll("rich-textarea").length;
  console.debug("focusEditor editor not found", {
    selectorCounts,
    fallbackCounts,
    textboxCount,
    richTextAreaCount,
  });
};
const focusEditor = () => {
  const result = findEditor();
  if (!result) {
    logNotFound();
    return false;
  }
  const { editor, descriptor } = result;
  const wasActive = document.activeElement === editor;
  if (!wasActive) {
    try {
      const hadTabIndexAttr = editor.hasAttribute("tabindex");
      if (!hadTabIndexAttr && editor.tabIndex < 0) {
        editor.setAttribute("tabindex", "-1");
      }
      editor.focus({ preventScroll: true });
      console.debug("focusEditor focus invoked", descriptor);
    } catch (error) {
      console.warn("focusEditor focus error", { descriptor, error });
      return false;
    }
  }
  if (document.activeElement !== editor) {
    console.debug("focusEditor activeElement mismatch", {
      descriptor,
      activeTag: document.activeElement?.tagName,
    });
    return false;
  }
  if (!wasActive) {
    if (
      editor instanceof HTMLTextAreaElement ||
      editor instanceof HTMLInputElement
    ) {
      const valueLength = editor.value?.length ?? 0;
      try {
        editor.setSelectionRange(valueLength, valueLength);
      } catch (error) {
        console.warn("focusEditor selection range error", {
          descriptor,
          error,
        });
      }
    } else if (!customTextHosts.has(editor.tagName?.toUpperCase() ?? "")) {
      const selection = window.getSelection();
      if (selection) {
        try {
          const range = document.createRange();
          range.selectNodeContents(editor);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
          console.debug("focusEditor caret positioned", descriptor);
        } catch (error) {
          selection.removeAllRanges();
          console.warn("focusEditor caret error", { descriptor, error });
        }
      }
    }
  }
  return true;
};
const ensureFocus = () => {
  if (focusEditor()) {
    console.debug("ensureFocus immediate success");
    return;
  }
  if (focusInterval) {
    console.debug("ensureFocus interval already active");
    return;
  }
  let attempts = 0;
  const limit = 120;
  console.debug("ensureFocus interval start", { limit });
  focusInterval = setInterval(() => {
    attempts += 1;
    if (focusEditor() || attempts >= limit) {
      clearInterval(focusInterval);
      focusInterval = undefined;
      console.debug("ensureFocus interval end", { attempts });
    }
  }, 150);
};
ensureFocus();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    ensureFocus();
    console.debug("visibilitychange ensureFocus");
  }
});
window.addEventListener("focus", ensureFocus);
const extensionOrigin = `chrome-extension://${chrome.runtime.id}`;
window.addEventListener("message", (event) => {
  if (event.origin !== extensionOrigin) {
    return;
  }
  const data = event.data;
  if (data && data.type === "focus-editor") {
    ensureFocus();
    console.debug("message focus-editor received");
  }
});
if (chrome?.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message) => {
    if (message && message.type === "sidepanel-focus") {
      ensureFocus();
      console.debug("runtime sidepanel-focus received");
    }
  });
}
let observer;
const startObserver = () => {
  if (observer || !document.body) {
    return;
  }
  observer = new MutationObserver(() => {
    if (focusEditor()) {
      observer.disconnect();
      observer = undefined;
      if (focusInterval) {
        clearInterval(focusInterval);
        focusInterval = undefined;
      }
      console.debug("mutation observer satisfied");
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  console.debug("mutation observer started");
};
if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", startObserver);
} else {
  startObserver();
}
