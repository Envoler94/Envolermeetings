/* Envoler Follow-ups: on-device speech-to-text.
   Runs OpenAI's open-source Whisper model inside the phone's browser using Transformers.js.
   No account, no API key, and the audio never leaves the device.
   The model downloads once (from Hugging Face) and is then cached on the phone.
   Uses the stable 3.8 runtime and the classic 8-bit models, which work in Safari and Chrome on phones. */
import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js";

env.allowLocalModels = false;
try { env.backends.onnx.wasm.numThreads = 1; } catch (e) {}   // phones without cross-origin isolation run single-threaded

const files = {};
let asr = null, current = "", loading = null;

function progress(p) {
  if (p.status === "progress" && p.total) {
    files[p.file] = { l: p.loaded, t: p.total };
    let l = 0, t = 0;
    for (const f of Object.values(files)) { l += f.l; t += f.t; }
    self.postMessage({ type: "progress", text: `Downloading the speech model (one time only)… ${Math.round(100 * l / t)}% of ${Math.round(t / 1048576)} MB` });
  }
}
const isNetwork = e => /fetch|network|Load failed|Failed to load|404|403/i.test(String((e && e.message) || e));

async function build(model) {
  const base = { device: "wasm", dtype: "q8", progress_callback: progress };
  try {
    return await pipeline("automatic-speech-recognition", model, base);
  } catch (e) {
    if (isNetwork(e)) throw e;
    // Some phones reject the optimised graph; retry with graph optimisation switched off.
    self.postMessage({ type: "progress", text: "Preparing the speech engine for this phone…" });
    return await pipeline("automatic-speech-recognition", model,
      Object.assign({}, base, { session_options: { graphOptimizationLevel: "disabled" } }));
  }
}

function load(model) {
  if (asr && current === model) return Promise.resolve(asr);
  if (loading && current === model) return loading;
  current = model; asr = null;
  loading = build(model)
    .then(p => { asr = p; return p; })
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
