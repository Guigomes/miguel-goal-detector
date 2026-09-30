import "./style.css";
import { loadOpenCv } from "./opencv-loader.js";
import { startCamera, stopStream, loadVideoFile } from "./camera.js";
import { detectBalloon } from "./balloon-detector.js";
import { drawBalloon } from "./overlay.js";
import { speak } from "./speech.js";

const MAX_WORKING_WIDTH = 480; // resolução de processamento, não a de exibição
const LOST_GRACE_MS = 800; // evita reanunciar a mesma cor por causa de 1 frame perdido

const statusEl = document.getElementById("status");
const detectionEl = document.getElementById("detection");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const stageEl = document.querySelector(".stage");
const btnCamera = document.getElementById("btn-camera");
const btnStop = document.getElementById("btn-stop");
const fileInput = document.getElementById("video-file");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

let cv;
let currentStream = null;
let running = false;
let rafId = null;
let lastAnnouncedColor = null;
let lastSeenAt = 0;

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

function announceDetection(detection) {
  const now = performance.now();
  if (detection) {
    lastSeenAt = now;
    if (detection.colorName !== lastAnnouncedColor) {
      speak(`Achei a bexiga, cor ${detection.colorName}`);
      lastAnnouncedColor = detection.colorName;
    }
  } else if (lastAnnouncedColor && now - lastSeenAt > LOST_GRACE_MS) {
    lastAnnouncedColor = null;
  }
}

function tick() {
  if (!running) return;

  if (video.readyState >= 2 && video.videoWidth > 0) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = cv.imread(canvas);
    try {
      const detection = detectBalloon(cv, frame);
      drawBalloon(ctx, detection);
      detectionEl.textContent = detection
        ? `Bexiga detectada: ${detection.colorName}`
        : "Nenhuma bexiga detectada";
      announceDetection(detection);
    } finally {
      frame.delete();
    }
  }

  rafId = requestAnimationFrame(tick);
}

function startProcessing() {
  running = true;
  btnCamera.disabled = true;
  fileInput.disabled = true;
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
  video.removeAttribute("src");
  video.srcObject = null;

  window.speechSynthesis?.cancel();
  lastAnnouncedColor = null;
  lastSeenAt = 0;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  detectionEl.textContent = "—";
  btnCamera.disabled = false;
  fileInput.disabled = false;
  fileInput.value = "";
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

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  try {
    await loadVideoFile(video, file);
    statusEl.textContent = `Testando com: ${file.name}`;
    startProcessing();
  } catch (err) {
    console.error(err);
    statusEl.textContent = `Não consegui carregar o vídeo: ${err.message}`;
  }
});

btnStop.addEventListener("click", () => {
  stopProcessing();
  statusEl.textContent = "Parado";
});

loadOpenCv()
  .then((loadedCv) => {
    cv = loadedCv;
    statusEl.textContent = "OpenCV pronto";
    btnCamera.disabled = false;
    fileInput.disabled = false;
  })
  .catch((err) => {
    console.error(err);
    statusEl.textContent = "Falha ao carregar OpenCV";
  });
