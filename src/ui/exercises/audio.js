import { $$ } from "../dom.js";
import { signalSample } from "../../tools/audio.js";
export function drawWaves() {
  $$("[data-wave]").forEach((canvas) => {
    const rect = canvas.getBoundingClientRect(),
      ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    const w = rect.width,
      h = rect.height;
    ctx.strokeStyle = "#bdbbae";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    ctx.strokeStyle = canvas.dataset.wave === "clipped" ? "#e94720" : "#34362e";
    ctx.beginPath();
    for (let x = 0; x < w; x++) {
      let sample = Math.sin(x * 0.29) * (0.45 + 0.45 * Math.sin(x * 0.021) ** 2);
      if (canvas.dataset.wave === "clipped")
        sample = Math.max(-0.7, Math.min(0.7, sample * 2));
      if (canvas.dataset.wave === "segments") {
        const time = (x / w) * 1.8;
        sample = signalSample(time);
      }
      const y = h / 2 - sample * h * 0.4;
      if (!x) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    if (canvas.dataset.wave === "segments") {
      ctx.strokeStyle = "#e94720";
      ctx.setLineDash([3, 3]);
      for (const t of [0.6, 1.1]) {
        ctx.beginPath();
        ctx.moveTo((t / 1.8) * w, 0);
        ctx.lineTo((t / 1.8) * w, h);
        ctx.stroke();
      }
    }
  });
}
