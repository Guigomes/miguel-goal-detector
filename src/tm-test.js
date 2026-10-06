// Página de teste isolada pra comparar o modelo treinado no Teachable
// Machine com a câmera ao vivo. Não toca em nada do app principal — só
// mostra as 3 classes (Bexiga / Bexiga Real / Sem Bexiga) e sua confiança
// a cada frame, pra decidir se vale a pena integrar de verdade depois.

import "./style.css";
import "./tm-test.css";
import { load } from "@teachablemachine/image";
import { startCamera, stopStream } from "./camera.js";

const MODEL_URL = `${import.meta.env.BASE_URL}tm-model/model.json`;
const METADATA_URL = `${import.meta.env.BASE_URL}tm-model/metadata.json`;
const MAX_WORKING_WIDTH = 480;

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
    .map(({ className, probability }) => {
      const pct = Math.round(probability * 100);
      return `
        <div class="bar-row">
          <span class="bar-label">${className}</span>
          <span class="bar-track"><span class="bar-fill" style="width:${pct}%"></span></span>
          <span class="bar-value">${pct}%</span>
        </div>
      `;
    })
    .join("");
}

async function tick() {
  if (!running) return;

  if (video.readyState >= 2 && video.videoWidth > 0) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const predictions = await model.predict(canvas);
    renderBars(predictions, model.getClassLabels());
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
