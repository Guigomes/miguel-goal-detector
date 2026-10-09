// Página de teste isolada pra comparar o modelo treinado no Teachable
// Machine com a câmera ao vivo. Não toca em nada do app principal — só
// mostra as 3 classes (Bexiga / Bexiga Real / Sem Bexiga) e sua confiança
// a cada frame, pra decidir se vale a pena integrar de verdade depois.

import "./tm-test.css";
import { load } from "@teachablemachine/image";
import { startCamera, stopStream } from "./camera.js";
import { speak } from "./speech.js";

const MODEL_URL = `${import.meta.env.BASE_URL}tm-model/model.json`;
const METADATA_URL = `${import.meta.env.BASE_URL}tm-model/metadata.json`;
const MAX_WORKING_WIDTH = 480;
const CONFIDENCE_THRESHOLD = 0.8;
const LOST_GRACE_MS = 800; // evita reanunciar toda hora por causa de 1 frame oscilando

// só visual (emoji/cor de cada classe) — não influencia a detecção
const LABEL_STYLE = {
  Bexiga: { emoji: "🎈", color: "#2bd1b8" },
  "Bexiga Real": { emoji: "🟣", color: "#b98bff" },
  "Sem Bexiga": { emoji: "🙈", color: "#c9ccd6" },
};
const DEFAULT_LABEL_STYLE = { emoji: "❓", color: "#3a2e55" };

function isBalloonHit({ className, probability }) {
  return className !== "Sem Bexiga" && probability > CONFIDENCE_THRESHOLD;
}

const statusEl = document.getElementById("status");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const stageEl = document.querySelector(".stage");
const btnCamera = document.getElementById("btn-camera");
const btnStop = document.getElementById("btn-stop");
const barsEl = document.getElementById("bars");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

let model;
let currentStream = null;
let running = false;
let rafId = null;
let announced = false;
let lastAboveThresholdAt = 0;

function sizeCanvasToVideo() {
  const sourceWidth = video.videoWidth || MAX_WORKING_WIDTH;
  const sourceHeight = video.videoHeight || Math.round((MAX_WORKING_WIDTH * 3) / 4);
  const width = Math.min(MAX_WORKING_WIDTH, sourceWidth);
  const height = Math.round((sourceHeight / sourceWidth) * width);
  canvas.width = width;
  canvas.height = height;
  stageEl.style.aspectRatio = `${width} / ${height}`;
}
video.addEventListener("loadedmetadata", sizeCanvasToVideo);

function renderBars(predictions, labels) {
  const ordered = [...predictions].sort(
    (a, b) => labels.indexOf(a.className) - labels.indexOf(b.className),
  );
  barsEl.innerHTML = ordered
    .map((p) => {
      const pct = Math.round(p.probability * 100);
      const { emoji, color } = LABEL_STYLE[p.className] ?? DEFAULT_LABEL_STYLE;
      const cardClass = isBalloonHit(p) ? "bar-card found" : "bar-card";
      return `
        <div class="${cardClass}">
          <span class="bar-emoji">${emoji}</span>
          <span class="bar-info">
            <span class="bar-label">${p.className}</span>
            <span class="bar-track"><span class="bar-fill" style="width:${pct}%;background:${color}"></span></span>
          </span>
          <span class="bar-value">${pct}%</span>
        </div>
      `;
    })
    .join("");
}

function announceIfBalloon(predictions) {
  const now = performance.now();
  const foundBalloon = predictions.some(isBalloonHit);

  if (foundBalloon) {
    lastAboveThresholdAt = now;
    if (!announced) {
      speak("Bexiga encontrada");
      announced = true;
    }
  } else if (announced && now - lastAboveThresholdAt > LOST_GRACE_MS) {
    announced = false;
  }
}

async function tick() {
  if (!running) return;

  if (video.readyState >= 2 && video.videoWidth > 0) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const predictions = await model.predict(canvas);
    renderBars(predictions, model.getClassLabels());
    announceIfBalloon(predictions);
  }

  if (running) rafId = requestAnimationFrame(tick);
}

function startProcessing() {
  running = true;
  btnCamera.disabled = true;
  btnStop.disabled = false;
  rafId = requestAnimationFrame(tick);
}

function stopProcessing() {
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;

  stopStream(currentStream);
  currentStream = null;
  video.pause();
  video.srcObject = null;

  window.speechSynthesis?.cancel();
  announced = false;
  lastAboveThresholdAt = 0;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  barsEl.innerHTML = "";
  btnCamera.disabled = false;
  btnStop.disabled = true;
}

btnCamera.addEventListener("click", async () => {
  try {
    statusEl.textContent = "Pedindo acesso à câmera…";
    currentStream = await startCamera(video);
    statusEl.textContent = "Câmera ligada";
    startProcessing();
  } catch (err) {
    console.error(err);
    statusEl.textContent = `Não consegui acessar a câmera: ${err.message}`;
  }
});

btnStop.addEventListener("click", () => {
  stopProcessing();
  statusEl.textContent = "Parado";
});

load(MODEL_URL, METADATA_URL)
  .then((loadedModel) => {
    model = loadedModel;
    statusEl.textContent = `Modelo pronto (${model.getClassLabels().join(", ")})`;
    btnCamera.disabled = false;
  })
  .catch((err) => {
    console.error(err);
    statusEl.textContent = "Falha ao carregar o modelo";
  });
