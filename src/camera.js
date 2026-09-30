// Wraps the two frame sources the app supports: the phone's back camera
// (live play) and a loaded video file (testing without a phone in hand).
// Both end up playing through the same <video> element so the rest of the
// pipeline doesn't need to know which source is active.

export async function startCamera(videoEl) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" } },
    audio: false,
  });
  videoEl.srcObject = stream;
  videoEl.loop = false;
  await videoEl.play();
  return stream;
}

export function stopStream(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}

export async function loadVideoFile(videoEl, file) {
  videoEl.srcObject = null;
  videoEl.src = URL.createObjectURL(file);
  videoEl.loop = true;
  await videoEl.play();
}
