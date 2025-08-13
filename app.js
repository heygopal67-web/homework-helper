// SolveBuddy - Vanilla JS SPA

// DOM elements
const takePhotoBtn = document.getElementById("takePhotoBtn");
const uploadPhotoBtn = document.getElementById("uploadPhotoBtn");
const fileInput = document.getElementById("fileInput");
const progressArea = document.getElementById("progressArea");
const results = document.getElementById("results");
const detailToggle = document.getElementById("detailToggle");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const toggleSidebarBtn = document.getElementById("toggleSidebarBtn");
const typedQuestion = document.getElementById("typedQuestion");
const explainTypedBtn = document.getElementById("explainTypedBtn");
const clearTypedBtn = document.getElementById("clearTypedBtn");
const typeAnswerBtn = document.getElementById("typeAnswerBtn");
const typeInCard = document.getElementById("typeInCard");
const speakBtn = document.getElementById("speakBtn");
const stopSpeakBtn = document.getElementById("stopSpeakBtn");
const resultsToolbar = document.getElementById("resultsToolbar");
const sketchToggleBtn = document.getElementById("sketchToggleBtn");
const sketchOverlay = document.getElementById("sketchOverlay");
const sketchCanvas = document.getElementById("sketchCanvas");
const sketchClearBtn = document.getElementById("sketchClearBtn");
const sketchCloseBtn = document.getElementById("sketchCloseBtn");
const fontPicker = document.getElementById("fontPicker");
const bgmToggleBtn = document.getElementById("bgmToggleBtn");
const bgmAudio = document.getElementById("bgmAudio");
const bgmIcon = document.getElementById("bgmIcon");
const bgmLabel = document.getElementById("bgmLabel");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const themeIcon = document.getElementById("themeIcon");

// Camera modal elements
const cameraModal = document.getElementById("cameraModal");
const cameraVideo = document.getElementById("cameraVideo");
const cameraCanvas = document.getElementById("cameraCanvas");
const closeCameraModal = document.getElementById("closeCameraModal");
const xCameraModal = document.getElementById("xCameraModal");
const captureBtn = document.getElementById("captureBtn");

// WARNING: Embedding API keys in client code is not secure. You asked to use JS only.
const GEMINI_API_KEY = "AIzaSyAOqqVRGcnRuz_qVAV0pq_Y6gbhK-9h2wQ";

const STORAGE_KEYS = {
  history: "hhai_history_v1",
  mode: "hhai_mode_detailed",
  sidebarHidden: "hhai_sidebar_hidden",
  fontClass: "hhai_font_class",
};

function setProgress(message) {
  if (message) {
    progressArea.classList.add("loading");
    progressArea.textContent = message;
  } else {
    progressArea.classList.remove("loading");
    progressArea.textContent = "";
  }
}

// No key storage; key is embedded above per request

function getModeDetailed() {
  try {
    return localStorage.getItem(STORAGE_KEYS.mode) === "1";
  } catch {
    return false;
  }
}

function setModeDetailed(val) {
  try {
    localStorage.setItem(STORAGE_KEYS.mode, val ? "1" : "0");
  } catch {}
}

function getSidebarHidden() {
  try {
    return localStorage.getItem(STORAGE_KEYS.sidebarHidden) === "1";
  } catch {
    return false;
  }
}
function setSidebarHidden(hidden) {
  try {
    localStorage.setItem(STORAGE_KEYS.sidebarHidden, hidden ? "1" : "0");
  } catch {}
}

async function getApiKeyInteractive() {
  return GEMINI_API_KEY;
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.history);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(historyItems) {
  try {
    localStorage.setItem(
      STORAGE_KEYS.history,
      JSON.stringify(historyItems.slice(0, 5))
    );
  } catch {}
}

function addToHistory(questionText, steps, mode) {
  const items = loadHistory();
  const entry = {
    id: Date.now(),
    questionText,
    steps,
    mode,
    ts: new Date().toISOString(),
  };
  const updated = [entry, ...items].slice(0, 5);
  saveHistory(updated);
  renderHistory();
}

function clearResults() {
  results.innerHTML = "";
}

function highlightKeyTerms(text) {
  // Simple highlighting for words like number names, operations, equals, fraction, etc.
  const patterns = [
    /\b(sum|add|plus|total|increase)\b/gi,
    /\b(subtract|minus|difference|decrease)\b/gi,
    /\b(multiply|times|product)\b/gi,
    /\b(divide|quotient|fraction)\b/gi,
    /\b(equal|equals|=)\b/gi,
    /\b(fraction|decimal|percent|percentage)\b/gi,
    /\b(variable|equation|unknown)\b/gi,
    /\b(step|tip|example)\b/gi,
    /\b(area|perimeter|angle|triangle|square|rectangle|circle)\b/gi,
    /\b(estimate|round|approximate)\b/gi,
  ];
  let output = text;
  patterns.forEach((re) => {
    output = output.replace(re, (m) => `<span class="highlight">${m}</span>`);
  });
  return output;
}

function renderSteps(steps) {
  clearResults();
  steps.forEach((text, idx) => {
    const card = document.createElement("div");
    card.className = "card";
    const index = document.createElement("div");
    index.className = "step-index";
    index.textContent = `Step ${idx + 1}`;
    const content = document.createElement("div");
    content.className = "content";
    content.innerHTML = highlightKeyTerms(text);
    card.appendChild(index);
    card.appendChild(content);
    results.appendChild(card);
  });
  if (resultsToolbar)
    resultsToolbar.classList.toggle("hidden", steps.length === 0);
}

// Text-to-Speech helpers
let ttsUtterance = null;
function speakText(text) {
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    ttsUtterance = new SpeechSynthesisUtterance(text);
    ttsUtterance.rate = 1.0;
    ttsUtterance.pitch = 1.0;
    window.speechSynthesis.speak(ttsUtterance);
  } catch {}
}
function stopSpeaking() {
  try {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  } catch {}
}

// Read-aloud with per-step highlighting
function speakStepsWithHighlight() {
  if (!("speechSynthesis" in window)) return;
  const stepCards = Array.from(document.querySelectorAll("#results .card"));
  const stepTexts = stepCards
    .map((c) => c.querySelector(".content")?.textContent?.trim() || "")
    .filter(Boolean);
  if (!stepTexts.length) return;

  // Clear any previous
  window.speechSynthesis.cancel();
  stepCards.forEach((card) => card.classList.remove("reading"));

  let index = 0;
  const speakNext = () => {
    if (index >= stepTexts.length) {
      return;
    }
    const card = stepCards[index];
    const utter = new SpeechSynthesisUtterance(stepTexts[index]);
    utter.rate = 1.0;
    utter.pitch = 1.0;
    utter.onstart = () => {
      card.classList.add("reading");
    };
    utter.onend = () => {
      card.classList.remove("reading");
      index += 1;
      speakNext();
    };
    utter.onerror = () => {
      card.classList.remove("reading");
      index += 1;
      speakNext();
    };
    window.speechSynthesis.speak(utter);
  };
  speakNext();
}

function renderHistory() {
  const items = loadHistory();
  historyList.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "history-item mini";
    empty.textContent =
      "No history yet. Your last 5 explained questions will show here.";
    historyList.appendChild(empty);
    return;
  }
  items.forEach((item) => {
    const el = document.createElement("div");
    el.className = "history-item";
    // Title + View button row
    const head = document.createElement("div");
    head.className = "history-head";
    const h4 = document.createElement("h4");
    h4.textContent =
      item.questionText.slice(0, 120) +
      (item.questionText.length > 120 ? "…" : "");
    const meta = document.createElement("div");
    meta.className = "mini";
    const date = new Date(item.ts);
    meta.textContent = `${date.toLocaleString()} · ${
      item.mode ? "Detailed" : "Basic"
    } mode`;

    const viewBtn = document.createElement("button");
    viewBtn.className = "btn small";
    viewBtn.textContent = "View";
    viewBtn.addEventListener("click", () => {
      renderSteps(item.steps);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    head.appendChild(h4);
    head.appendChild(viewBtn);
    el.appendChild(head);
    el.appendChild(meta);
    historyList.appendChild(el);
  });
}

async function ocrImageFromFile(file) {
  setProgress("Reading image...");
  const reader = new FileReader();
  const dataUrl = await new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  setProgress("Recognizing text (OCR) ... this can take a few seconds");
  const { data } = await Tesseract.recognize(dataUrl, "eng", {
    logger: (m) => {
      if (m.status === "recognizing text") {
        setProgress(`OCR: ${(m.progress * 100).toFixed(0)}%`);
      }
    },
  });
  const text = (data && data.text ? data.text : "").trim();
  return text;
}

async function ocrImageFromCanvas(canvas) {
  setProgress("Recognizing text (OCR) from camera...");
  const dataUrl = canvas.toDataURL("image/png");
  const { data } = await Tesseract.recognize(dataUrl, "eng", {
    logger: (m) => {
      if (m.status === "recognizing text") {
        setProgress(`OCR: ${(m.progress * 100).toFixed(0)}%`);
      }
    },
  });
  const text = (data && data.text ? data.text : "").trim();
  return text;
}

function buildSystemPrompt(questionText) {
  return (
    "You are a helpful homework tutor for kids aged 8–14. The input is a question: '" +
    questionText.replace(/\s+/g, " ").trim() +
    "'. Explain step-by-step how to solve it, using simple language, examples, and tips. Do not give the final answer directly — instead, guide them to find it themselves."
  );
}

async function callGemini(questionText, detailedMode) {
  setProgress("Asking AI for guidance...");
  const systemPrompt = buildSystemPrompt(questionText);
  const detailInstruction = detailedMode
    ? " Provide a thorough explanation with about 6–9 steps, include a tiny example and a quick tip where helpful."
    : " Keep it concise with about 3–5 simple steps.";
  const userPrompt =
    "Mode: " + (detailedMode ? "Detailed" : "Basic") + ". " + detailInstruction;

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" +
    encodeURIComponent(GEMINI_API_KEY);

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: systemPrompt + "\n\n" + userPrompt }],
      },
    ],
    generationConfig: { temperature: detailedMode ? 0.6 : 0.4 },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error("Gemini error: " + response.status + " " + errText);
  }
  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts
    .map((p) => p.text || "")
    .join("\n")
    .trim();
  return text;
}

function splitIntoSteps(text) {
  // Try splitting by typical step markers: numbered list, newlines, etc.
  // Fallback to sentences if needed
  let parts = text
    .split(/\n\s*\n|\n\s*\d+\.|\n-\s+|\n•\s+|\n\s*Step\s*\d+:/gi)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length <= 1) {
    parts = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  }
  // Cap at 12 steps
  return parts.slice(0, 12);
}

async function handleImageToHelp(fileOrCanvas) {
  try {
    setProgress("Starting...");
    clearResults();
    const isCanvas =
      typeof HTMLCanvasElement !== "undefined" &&
      fileOrCanvas instanceof HTMLCanvasElement;
    const text = isCanvas
      ? await ocrImageFromCanvas(fileOrCanvas)
      : await ocrImageFromFile(fileOrCanvas);

    if (!text) {
      setProgress("No text found. Try a clearer photo.");
      return;
    }
    setProgress("Question detected. Preparing help...");
    const detailedMode = detailToggle.checked;

    const apiKey = await getApiKeyInteractive();
    if (!apiKey) {
      setProgress("OpenAI API key is required to ask the AI.");
      return;
    }

    const aiText = await callGemini(text, detailedMode, apiKey);
    const steps = splitIntoSteps(aiText);
    renderSteps(steps);
    setProgress("Done!");

    addToHistory(text, steps, detailedMode);
  } catch (err) {
    console.error(err);
    setProgress("Something went wrong: " + err.message);
  }
}

async function handleTypedQuestion() {
  const text = (typedQuestion?.value || "").trim();
  if (!text) {
    setProgress("Please type a question first.");
    setTimeout(() => setProgress(""), 1200);
    return;
  }
  try {
    setProgress("Preparing help...");
    const detailedMode = detailToggle.checked;
    const aiText = await callGemini(text, detailedMode);
    const steps = splitIntoSteps(aiText);
    renderSteps(steps);
    setProgress("Done!");
    if (resultsToolbar)
      resultsToolbar.classList.toggle("hidden", steps.length === 0);
    addToHistory(text, steps, detailedMode);
  } catch (err) {
    console.error(err);
    setProgress("Something went wrong: " + err.message);
  }
}

// Camera handling
let mediaStream = null;

async function openCamera() {
  try {
    cameraModal.classList.add("show");
    cameraModal.setAttribute("aria-hidden", "false");
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    cameraVideo.srcObject = mediaStream;
  } catch (err) {
    setProgress("Could not access camera: " + err.message);
    closeCamera();
  }
}

function closeCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop());
    mediaStream = null;
  }
  cameraVideo.srcObject = null;
  cameraModal.classList.remove("show");
  cameraModal.setAttribute("aria-hidden", "true");
}

function capturePhoto() {
  if (!cameraVideo.videoWidth) return;
  const w = cameraVideo.videoWidth;
  const h = cameraVideo.videoHeight;
  cameraCanvas.width = w;
  cameraCanvas.height = h;
  const ctx = cameraCanvas.getContext("2d");
  ctx.drawImage(cameraVideo, 0, 0, w, h);
  return cameraCanvas;
}

// Event listeners
uploadPhotoBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) handleImageToHelp(file);
  fileInput.value = "";
});

takePhotoBtn.addEventListener("click", () => {
  openCamera();
});

typeAnswerBtn?.addEventListener("click", () => {
  if (!typeInCard) return;
  const willShow = typeInCard.classList.contains("hidden");
  typeInCard.classList.toggle("hidden", !willShow);
  typeAnswerBtn.setAttribute("aria-expanded", String(willShow));
  if (willShow) {
    typedQuestion?.focus();
    window.scrollTo({ top: typeInCard.offsetTop || 0, behavior: "smooth" });
  }
});

closeCameraModal.addEventListener("click", closeCamera);
xCameraModal.addEventListener("click", closeCamera);

captureBtn.addEventListener("click", async () => {
  const canvas = capturePhoto();
  closeCamera();
  if (canvas) {
    await handleImageToHelp(canvas);
  }
});

detailToggle.addEventListener("change", () => {
  setModeDetailed(detailToggle.checked);
});

clearHistoryBtn.addEventListener("click", () => {
  saveHistory([]);
  renderHistory();
});

explainTypedBtn.addEventListener("click", handleTypedQuestion);
clearTypedBtn.addEventListener("click", () => {
  if (typedQuestion) typedQuestion.value = "";
});
speakBtn.addEventListener("click", () => {
  speakStepsWithHighlight();
});
stopSpeakBtn.addEventListener("click", stopSpeaking);

// Init
(function init() {
  detailToggle.checked = getModeDetailed();
  renderHistory();
  if (resultsToolbar) resultsToolbar.classList.add("hidden");
})();

// Sidebar toggle
toggleSidebarBtn?.addEventListener("click", () => {
  const layout = document.querySelector(".layout");
  const sidebar = document.querySelector(".sidebar");
  if (!layout || !sidebar) return;
  const willHide = !sidebar.classList.contains("hidden");
  sidebar.classList.toggle("hidden", willHide);
  layout.classList.toggle("sidebar-hidden", willHide);
  setSidebarHidden(willHide);
});

// Apply saved sidebar state after DOM ready
window.addEventListener("DOMContentLoaded", () => {
  const hidden = getSidebarHidden();
  const layout = document.querySelector(".layout");
  const sidebar = document.querySelector(".sidebar");
  if (!layout || !sidebar) return;
  sidebar.classList.toggle("hidden", hidden);
  layout.classList.toggle("sidebar-hidden", hidden);
  // Init BGM icon/label from saved state (no autoplay)
  const bgmEnabled = localStorage.getItem("hhai_bgm_enabled") === "1";
  if (bgmEnabled) {
    bgmIcon?.classList.add("fa-music");
    bgmLabel && (bgmLabel.textContent = "Music");
  } else {
    bgmIcon?.classList.add("fa-volume-xmark");
    bgmLabel && (bgmLabel.textContent = "Music");
  }
});

// Font switcher
fontPicker?.addEventListener("change", () => {
  const val = fontPicker.value || "font-patrick";
  const htmlEl = document.documentElement;
  htmlEl.classList.remove(
    "font-kalam",
    "font-patrick",
    "font-caveat",
    "font-gochi",
    "font-shantell",
    "font-inter"
  );
  htmlEl.classList.add(val);
  try {
    localStorage.setItem(STORAGE_KEYS.fontClass, val);
  } catch {}
});

// Apply saved font on load (or current dropdown value as default)
(() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.fontClass);
    const toApply = saved || fontPicker?.value || "font-kalam";
    const htmlEl = document.documentElement;
    htmlEl.classList.remove(
      "font-kalam",
      "font-patrick",
      "font-caveat",
      "font-gochi",
      "font-shantell",
      "font-inter"
    );
    htmlEl.classList.add(toApply);
    if (fontPicker) fontPicker.value = toApply;
  } catch {}
})();

// Background music controls
const BGM_KEY = "hhai_bgm_enabled";
function setBgmEnabled(enabled) {
  try {
    localStorage.setItem(BGM_KEY, enabled ? "1" : "0");
  } catch {}
  if (!bgmAudio) return;
  if (enabled) {
    bgmAudio.volume = 0.35;
    bgmAudio.play().catch(() => {});
    bgmIcon?.classList.remove("fa-volume-xmark");
    bgmIcon?.classList.add("fa-music");
    bgmLabel && (bgmLabel.textContent = "Music");
  } else {
    bgmAudio.pause();
    bgmIcon?.classList.remove("fa-music");
    bgmIcon?.classList.add("fa-volume-xmark");
    bgmLabel && (bgmLabel.textContent = "Music");
  }
}

bgmToggleBtn?.addEventListener("click", () => {
  const current = localStorage.getItem(BGM_KEY) === "1";
  setBgmEnabled(!current);
});

// Theme toggle (persisted)
const THEME_KEY = "hhai_theme_dark";
function applyThemeFromStorage() {
  const isDark = localStorage.getItem(THEME_KEY) === "1";
  document.documentElement.classList.toggle("dark", isDark);
  if (themeIcon) {
    themeIcon.classList.toggle("fa-moon", !isDark);
    themeIcon.classList.toggle("fa-sun", isDark);
  }
  // Update theme toggle label to reflect current theme
  const themeLabelEl = themeToggleBtn
    ? themeToggleBtn.querySelector(".label")
    : null;
  if (themeLabelEl) {
    themeLabelEl.textContent = isDark ? "Dark" : "Light";
  }
}
applyThemeFromStorage();

themeToggleBtn?.addEventListener("click", () => {
  const isDark = !(localStorage.getItem(THEME_KEY) === "1");
  try {
    localStorage.setItem(THEME_KEY, isDark ? "1" : "0");
  } catch {}
  applyThemeFromStorage();
});

// Sketch overlay logic
let sketchCtx = null;
let isDrawing = false;
let lastX = 0,
  lastY = 0;

function resizeSketchCanvas() {
  if (!sketchCanvas) return;
  const dpr = window.devicePixelRatio || 1;
  sketchCanvas.width = Math.floor(sketchCanvas.clientWidth * dpr);
  sketchCanvas.height = Math.floor(sketchCanvas.clientHeight * dpr);
  sketchCtx = sketchCanvas.getContext("2d");
  sketchCtx.scale(dpr, dpr);
  sketchCtx.lineJoin = "round";
  sketchCtx.lineCap = "round";
  sketchCtx.lineWidth = 4;
  sketchCtx.strokeStyle = "#ef4444";
}

function startDraw(e) {
  isDrawing = true;
  const rect = sketchCanvas.getBoundingClientRect();
  lastX = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  lastY = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
}
function draw(e) {
  if (!isDrawing) return;
  const rect = sketchCanvas.getBoundingClientRect();
  const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
  sketchCtx.beginPath();
  sketchCtx.moveTo(lastX, lastY);
  sketchCtx.lineTo(x, y);
  sketchCtx.stroke();
  lastX = x;
  lastY = y;
}
function endDraw() {
  isDrawing = false;
}

sketchToggleBtn?.addEventListener("click", () => {
  if (!sketchOverlay) return;
  const willShow = !sketchOverlay.classList.contains("show");
  sketchOverlay.classList.toggle("show", willShow);
  sketchOverlay.setAttribute("aria-hidden", String(!willShow));
  if (willShow) {
    resizeSketchCanvas();
  }
});

sketchClearBtn?.addEventListener("click", () => {
  if (sketchCtx && sketchCanvas) {
    sketchCtx.clearRect(0, 0, sketchCanvas.width, sketchCanvas.height);
  }
});
sketchCloseBtn?.addEventListener("click", () => {
  sketchOverlay?.classList.remove("show");
  sketchOverlay?.setAttribute("aria-hidden", "true");
});

window.addEventListener("resize", () => {
  if (sketchOverlay?.classList.contains("show")) resizeSketchCanvas();
});

// Pointer events for drawing
sketchCanvas?.addEventListener("mousedown", startDraw);
sketchCanvas?.addEventListener("touchstart", startDraw, { passive: true });
sketchCanvas?.addEventListener("mousemove", draw);
sketchCanvas?.addEventListener("touchmove", draw, { passive: true });
["mouseup", "mouseleave", "touchend", "touchcancel"].forEach((ev) =>
  sketchCanvas?.addEventListener(ev, endDraw)
);
