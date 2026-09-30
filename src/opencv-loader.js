import cvModule from "@techstark/opencv-js";

let readyPromise;

// @techstark/opencv-js exposes the wasm module in one of three shapes
// depending on version/bundler: already a Promise, already initialized
// (has .Mat), or needs onRuntimeInitialized to fire. Handle all three.
export function loadOpenCv() {
  if (!readyPromise) {
    readyPromise = (async () => {
      if (cvModule instanceof Promise) {
        return cvModule;
      }
      if (cvModule.Mat) {
        return cvModule;
      }
      await new Promise((resolve) => {
        cvModule.onRuntimeInitialized = () => resolve();
      });
      return cvModule;
    })();
  }
  return readyPromise;
}
