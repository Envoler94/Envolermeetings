/* Envoler Follow-ups: on-device speech-to-text.
   Runs OpenAI's open-source Whisper model inside the phone's browser using Transformers.js.
   No account, no API key, and the audio never leaves the device.
   The model downloads once (from Hugging Face) and is then cached on the phone. */
import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0/dist/transformers.min.js";

env.allowLocalModels = false;

const files = {};
let asr = null, current = "", loading = null;
// Apple GPUs can give corrupted Whisper output on WebGPU, so Apple devices use the CPU (WASM) path.
const apple = /iPhone|iPad|iPod|Macintosh|Mac OS X/i.test(self.navigator.userAgent);

function load(model) {
  if (asr && current === model) return Promise.resolve(asr);
  if (loading && current === model) return loading;
  current = model; asr = null;
  const useGPU = !!self.navigator.gpu && !apple;
  loading = pipeline("automatic-speech-recognition", model, {
    device: useGPU ? "webgpu" : "wasm",
    dtype: useGPU ? { encoder_model: "fp32", decoder_model_merged: "q4" } : "q8",
    progress_callback: p => {
      if (p.status === "progress" && p.total) {
        files[p.file] = { l: p.loaded, t: p.total };
        let l = 0, t = 0;
        for (const f of Object.values(files)) { l += f.l; t += f.t; }
        self.postMessage({ type: "progress", text: `Downloading the speech model (one time only)… ${Math.round(100 * l / t)}% of ${Math.round(t / 1048576)} MB` });
      }
    }
  }).catch(err => {
    // Fallback: the classic quantized build on the CPU, which works on every browser.
    if (/fetch|network|Failed to fetch|Load failed/i.test(String(err && err.message))) throw err;
    const mirror = model.replace("onnx-community/", "Xenova/");
    return pipeline("automatic-speech-recognition", mirror, { device: "wasm", dtype: "q8" });
  }).then(p => { asr = p; return p; })
    .catch(e => { loading = null; current = ""; throw e; });
  return loading;
}

self.onmessage = async e => {
  const { id, audio, model, task, warmup } = e.data;
  try {
    const p = await load(model);
    if (warmup) { self.postMessage({ id, text: "" }); return; }
    const out = await p(audio, { task, chunk_length_s: 30, stride_length_s: 5, return_timestamps: false });
    const text = Array.isArray(out) ? out.map(o => o.text).join(" ") : (out && out.text) || "";
    self.postMessage({ id, text });
  } catch (err) {
    self.postMessage({ id, error: String((err && err.message) || err) });
  }
};
