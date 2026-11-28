/* Full-screen fractal page (/fractal/, not linked from the site).
   Same look as the background (src/data/background.json), plus:
   - W A S D / arrow keys   steer: moves the point being zoomed into, in real time
   - - and =                smaller / larger characters (more / less resolution)
   - r                      restart the zoom at a new random point
   - h                      hide / show the info line
   The zoom keeps going until rendering drops below MIN_FPS (the view has become too
   expensive to draw smoothly), or until number precision runs out, then restarts. */
import base from "../data/background.json";
import { createRenderer, randomTarget } from "../lib/mandelbrot-core.js";

const S = {
  ...base,
  opacity: 0.9,       // brighter than the background version
  iterMax: 5000,      // no fixed cap: the frame rate decides how deep it goes
  fps: 60,
};
const MIN_FPS = 20;
const MAX_ZOOM_LOG = 43;          // 2^43 ≈ 9e12: past this, double precision turns blocky
const PAN = 0.6;                  // steering speed, in view-widths per second
const FONT_MIN = 3, FONT_MAX = 24, FONT_STEP = 1;

const el = document.getElementById("fractal");
const hud = document.getElementById("hud");
const R = createRenderer(el, S);
R.measure();
addEventListener("resize", R.measure);

let cx = 0, cy = 0, t = 0, zl = 0;
const zoomRate = Math.log2(S.speed);           // octaves per second
const held = new Set();
let last = performance.now(), lastDraw = -Infinity;
let frames = [];                                // timestamps of recent rendered frames
let fpsFrom = performance.now();                // fps is only trusted after a full second of samples
let lowSince = null, note = "";

function restart(reason) {
  [cx, cy] = randomTarget(S.targets);
  t = 0; zl = 0; R.boost = 1; frames = []; lowSince = null; fpsFrom = performance.now();
  note = reason ? `restarted: ${reason}` : "";
  if (reason) setTimeout(() => { if (note.startsWith("restarted")) note = ""; }, 2500);
}

const KEYS = {
  w: [0, -1], arrowup: [0, -1],
  s: [0, 1],  arrowdown: [0, 1],
  a: [-1, 0], arrowleft: [-1, 0],
  d: [1, 0],  arrowright: [1, 0],
};

addEventListener("keydown", (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const k = e.key.toLowerCase();
  if (KEYS[k]) { held.add(k); e.preventDefault(); }
  else if (k === "r") restart("r key");
  else if (k === "h") hud.hidden = !hud.hidden;
  else if (k === "-" || k === "_") setFont(S.fontSize - FONT_STEP);
  else if (k === "=" || k === "+") setFont(S.fontSize + FONT_STEP);
});
addEventListener("keyup", (e) => held.delete(e.key.toLowerCase()));
addEventListener("blur", () => held.clear());

function setFont(px) {
  S.fontSize = Math.max(FONT_MIN, Math.min(FONT_MAX, px));
  R.measure();
  frames = []; lowSince = null; fpsFrom = performance.now();   // fps changes with resolution: measure afresh
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  if (document.hidden) return;
  if (now - lastDraw < 1000 / S.fps - 1) return;
  const step = Math.min(0.25, (now - lastDraw) / 1000) || dt;
  lastDraw = now;

  t += step;
  zl += zoomRate * step;

  // steering: move the centre along the screen's directions (the view slowly rotates)
  let sx = 0, sy = 0;
  held.forEach((k) => { sx += KEYS[k][0]; sy += KEYS[k][1]; });
  if (sx || sy) {
    const len = Math.hypot(sx, sy);
    const ang = (S.rotate * t * Math.PI) / 180;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const dist = PAN * (S.startWidth / Math.pow(2, zl)) * step / len;
    // screen right = (ca, -sa), screen down = (-sa, -ca) in the complex plane
    cx += (sx * ca - sy * sa) * dist;
    cy += (-sx * sa - sy * ca) * dist;
  }

  R.render({ cx, cy, zl, sec: t });

  // frame rate over the last second
  frames.push(now);
  while (frames.length && now - frames[0] > 1000) frames.shift();
  const ready = now - fpsFrom >= 1000;
  const fps = frames.length;
  if (ready && zl > 3 && fps < MIN_FPS) {
    lowSince ??= now;
    if (now - lowSince > 1500) restart(`below ${MIN_FPS} fps`);   // sustained for 1.5s
  } else lowSince = null;
  if (zl > MAX_ZOOM_LOG) restart("precision limit");

  if (!hud.hidden) {
    hud.textContent =
      `zoom ${Math.pow(2, zl).toExponential(1)}  ${ready ? fps : "--"} fps  iter ${R.maxIter}  ` +
      `font ${S.fontSize}px (${R.cols}x${R.rows})` + (note ? `  ${note}` : "") +
      `\nwasd/arrows steer   - = resolution   r restart   h hide`;
  }
}

restart();
requestAnimationFrame(frame);
