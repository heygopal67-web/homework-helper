// Homework Helper AI - Vanilla JS SPA

// DOM elements
const takePhotoBtn = document.getElementById("takePhotoBtn");
const uploadPhotoBtn = document.getElementById("uploadPhotoBtn");
const fileInput = document.getElementById("fileInput");
const progressArea = document.getElementById("progressArea");
const results = document.getElementById("results");
const detailToggle = document.getElementById("detailToggle");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

// Camera modal elements
const cameraModal = document.getElementById("cameraModal");
const cameraVideo = document.getElementById("cameraVideo");
const cameraCanvas = document.getElementById("cameraCanvas");
const closeCameraModal = document.getElementById("closeCameraModal");
const xCameraModal = document.getElementById("xCameraModal");
const captureBtn = document.getElementById("captureBtn");

const STORAGE_KEYS = {
  apiKey: "AIzaSyAOqqVRGcnRuz_qVAV0pq_Y6gbhK-9h2wQ",
  legacyOpenAIKey: "hhai_openai_key",
  history: "hhai_history_v1",
  mode: "hhai_mode_detailed",
};

function setProgress(message) {
  progressArea.textContent = message || "";
}

function readStoredKey() {
  try {
    const gemini = localStorage.getItem(STORAGE_KEYS.apiKey);
    if (gemini) return gemini;
    const legacy = localStorage.getItem(STORAGE_KEYS.legacyOpenAIKey);
    return legacy || "";
  } catch {
    return "";
  }
}

function saveStoredKey(key) {
  try {
    localStorage.setItem(STORAGE_KEYS.apiKey, key);
  } catch {}
}

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

async function getApiKeyInteractive() {
  const existing = readStoredKey();
  if (existing) return existing;
  const entered = window.prompt(
    "Enter your Gemini API key (it will be saved locally in this browser):"
  );
  const key = (entered || "").trim();
  if (!key) return "";
  saveStoredKey(key);
  return key;
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

    el.appendChild(h4);
    el.appendChild(meta);
    el.appendChild(viewBtn);
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

async function callGemini(questionText, detailedMode, apiKey) {
  setProgress("Asking AI for guidance...");
  const systemPrompt = buildSystemPrompt(questionText);

  const detailInstruction = detailedMode
    ? " Provide a thorough explanation with about 6–9 steps, include a tiny example and a quick tip where helpful."
    : " Keep it concise with about 3–5 simple steps.";

  const userPrompt =
    "Mode: " + (detailedMode ? "Detailed" : "Basic") + ". " + detailInstruction;

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" +
    encodeURIComponent(apiKey);

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: systemPrompt + "\n\n" + userPrompt,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: detailedMode ? 0.6 : 0.4,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
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

// Init
(function init() {
  detailToggle.checked = getModeDetailed();
  renderHistory();
})();
