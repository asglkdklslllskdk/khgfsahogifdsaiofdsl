/* Full-screen fractal page (/fractal/, not linked from the site).
   Same look as the background (src/data/background.json), plus:
   - mouse                  the zoom heads toward wherever the pointer is: the spot under
                            the pointer glides to the middle of the screen. eased, not
                            linear: it slows as it arrives, and drifts gently when the
                            pointer is near the middle but pulls hard near the edges
   - W / S                  follow faster / slower
   - - and =                smaller / larger characters (more / less resolution)
   - r                      restart the zoom at a new random point
   - h                      hide / show the info line
   The zoom keeps going until rendering drops below MIN_FPS (the view has become too
   expensive to draw smoothly), or until number precision runs out, then restarts. */
import base from "../data/background.json";
import { createRenderer, randomTarget } from "../lib/mandelbrot-core.js";

const S = {
  ...base,
  iterMax: 5000,      // no fixed cap: the frame rate decides how deep it goes
  fps: 60,
};
const MIN_FPS = 20;
const MAX_ZOOM_LOG = 43;          // 2^43 ≈ 9e12: past this, double precision turns blocky
let FOLLOW = 0.8;                 // how fast the centre follows the pointer (per second); w / s change it
const FOLLOW_MIN = 0.05, FOLLOW_MAX = 8, FOLLOW_STEP = 1.25;
const CURVE = 0.6;                // >0: weaker pull near the middle, stronger near the edges
const FONT_MIN = 3, FONT_MAX = 24, FONT_STEP = 1;

const el = document.getElementById("fractal");
const hud = document.getElementById("hud");
const R = createRenderer(el, S);
R.measure();
addEventListener("resize", R.measure);

let cx = 0, cy = 0, t = 0, zl = 0;
const zoomRate = Math.log2(S.speed);           // octaves per second
let mouse = null;                                // pointer position in pixels, or null if outside the window
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

// screen offset in pixels -> offset in the complex plane (the view slowly rotates)
function moveBy(pxX, pxY) {
  const ang = (S.rotate * t * Math.PI) / 180;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const perPx = S.startWidth / Math.pow(2, zl) / innerWidth;
  cx += (pxX * ca - pxY * sa) * perPx;
  cy += (-pxX * sa - pxY * ca) * perPx;
}

addEventListener("keydown", (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const k = e.key.toLowerCase();
  if (k === "w") FOLLOW = Math.min(FOLLOW_MAX, FOLLOW * FOLLOW_STEP);
  else if (k === "s") FOLLOW = Math.max(FOLLOW_MIN, FOLLOW / FOLLOW_STEP);
  else if (k === "r") restart("r key");
  else if (k === "h") hud.hidden = !hud.hidden;
  else if (k === "-" || k === "_") setFont(S.fontSize - FONT_STEP);
  else if (k === "=" || k === "+") setFont(S.fontSize + FONT_STEP);
});
addEventListener("pointermove", (e) => { mouse = { x: e.clientX, y: e.clientY }; });
document.documentElement.addEventListener("pointerleave", () => { mouse = null; });
addEventListener("blur", () => { mouse = null; });

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

  // follow the pointer: move part of the way from the screen middle toward it.
  // 1 - e^(-rate*dt) gives smooth easing that doesn't depend on the frame rate;
  // the distance curve makes small offsets drift and large ones pull hard
  if (mouse) {
    const dx = mouse.x - innerWidth / 2, dy = mouse.y - innerHeight / 2;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.5) {
      const reach = Math.hypot(innerWidth, innerHeight) / 2;
      const rate = FOLLOW * Math.pow(Math.min(1, dist / reach), CURVE) * 3;
      const f = 1 - Math.exp(-rate * step);
      moveBy(dx * f, dy * f);
    }
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
      `  follow ${FOLLOW.toFixed(2)}` +
      `\nmouse steers   w s follow faster/slower   - = resolution   r restart   h hide`;
  }
}

restart();
requestAnimationFrame(frame);
