/* ASCII Mandelbrot zoom behind the page.
   Settings: src/data/background.json (tuned with mandelbrot-bg.html)
   Drawing code: src/lib/mandelbrot-core.js (shared with the /fractal/ page)
   - a random target from "targets" is picked on every page change, and the zoom
     restarts. the <pre id="bg"> element is kept across page changes
     (transition:persist), and this loop keeps running
   - clicking through images in a post isn't a page change, so the zoom carries on
   - not drawn at all on phones / touch tablets, or when switched off (bg-toggle.js)
   - only the cells outside the page's outer box are calculated (the box is opaque),
     which keeps CPU use low
   - pauses while the tab is hidden; shows a still frame if the visitor has
     "reduce motion" turned on */
import S from "../data/background.json";
import { createRenderer, randomTarget } from "../lib/mandelbrot-core.js";

if (!window.__mandelbrot && document.getElementById("bg")) {
  window.__mandelbrot = true;
  start();
}

function start() {
  const bg = document.getElementById("bg");
  const R = createRenderer(bg, S);
  // phones (narrow) and touch-first devices (phones in landscape, tablets): no background
  const mobile = matchMedia("(max-width: 720px), (hover: none) and (pointer: coarse)");
  const off = () => mobile.matches || document.documentElement.classList.contains("bg-off");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let cx = 0, cy = 0, cover = null, t = 0, last = performance.now(), lastDraw = -Infinity;

  function newPage() {
    [cx, cy] = randomTarget(S.targets);
    cover = document.querySelector(".outer");           // opaque box: no need to draw under it
    t = 0;
    R.boost = 1;
  }

  // zoom level (log2) over time, following "loop" and "maxZoom"
  function zoomLog(sec) {
    const maxLog = Math.log2(Number(S.maxZoom));
    const rate = Math.log2(S.speed);
    if (rate <= 0) return 0;
    const x = sec / (maxLog / rate);
    if (S.loop === "stop") return Math.min(x, 1) * maxLog;
    if (S.loop === "restart") return (x % 1) * maxLog;
    const p = x % 2;
    return (p < 1 ? p : 2 - p) * maxLog;
  }

  const draw = (sec) => R.render({ cx, cy, zl: zoomLog(sec), sec, skip: cover && cover.getBoundingClientRect() });

  newPage();
  document.addEventListener("astro:after-swap", newPage);
  R.measure();
  addEventListener("resize", R.measure);

  if (reduced) {
    const still = () => { if (!off()) draw(0); };
    still();
    addEventListener("resize", still);
    document.addEventListener("astro:after-swap", still);
    return;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.25, (now - last) / 1000);   // don't jump ahead after the tab was hidden
    last = now;
    if (document.hidden || off()) return;   // hidden tab, phone, or switched off: do nothing
    t += dt;
    if (now - lastDraw < 1000 / S.fps - 1) return;
    lastDraw = now;
    draw(t);
  }
  requestAnimationFrame(frame);
}
