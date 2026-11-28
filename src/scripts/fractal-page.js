/* Full-screen fractal page (/fractal/, not linked from the site).
   Same look as the background (src/data/background.json), plus:
   - mouse                  the view travels along the line from the crosshair (middle of
                            the screen) to the pointer: its direction is the direction of
                            travel, its length the speed (non-linear: short = slow drift,
                            long = fast). pointer right on the crosshair, or outside the
                            window: no movement
   - W / S                  faster / slower overall
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
let SPEED = 1;                    // overall travel speed; w / s multiply / divide it
const SPEED_MIN = 0.05, SPEED_MAX = 20, SPEED_STEP = 1.25;
const MAX_SPEED = 0.8;            // screen-widths per second with the pointer at the window's edge (at SPEED 1)
const CURVE = 1.6;                // speed = (distance / edge distance) ^ CURVE: >1 = gentle near the middle
const DEAD = 10;                  // px radius around the crosshair where nothing moves
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
  if (k === "w") SPEED = Math.min(SPEED_MAX, SPEED * SPEED_STEP);
  else if (k === "s") SPEED = Math.max(SPEED_MIN, SPEED / SPEED_STEP);
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

// velocity in screen pixels per second, from the pointer's offset from the middle
function steer() {
  if (!mouse) return null;
  const dx = mouse.x - innerWidth / 2, dy = mouse.y - innerHeight / 2;
  const dist = Math.hypot(dx, dy);
  if (dist <= DEAD) return { dx, dy, dist, vx: 0, vy: 0 };
  const edge = Math.min(innerWidth, innerHeight) / 2;          // distance to the nearest edge
  const k = Math.pow(Math.min(1.5, (dist - DEAD) / (edge - DEAD)), CURVE);
  const speed = k * MAX_SPEED * innerWidth * SPEED;            // px per second
  return { dx, dy, dist, vx: (dx / dist) * speed, vy: (dy / dist) * speed };
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

  // travel along the vector from the screen's middle to the pointer
  const vec = steer();
  if (vec) moveBy(vec.vx * step, vec.vy * step);

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
      `  speed ${SPEED.toFixed(2)}` +
      `\nmouse: direction + speed   w s faster/slower   - = resolution   r restart   h hide`;
  }
}

restart();
requestAnimationFrame(frame);
