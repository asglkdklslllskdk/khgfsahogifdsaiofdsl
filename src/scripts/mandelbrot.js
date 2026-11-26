/* ASCII Mandelbrot zoom behind the page.
   Settings: src/data/background.json (tuned with mandelbrot-bg.html)
   - a random target from "targets" is picked on every page load
   - clicking through images in a post doesn't reload the page, so the zoom carries on
   - only the cells outside the page's outer box are calculated (the box is opaque),
     which keeps CPU use low
   - pauses while the tab is hidden; shows a still frame if the visitor has
     "reduce motion" turned on */
import S from "../data/background.json";

const TARGETS = {
  seahorse: [-0.743643887037158704752191506114774, 0.131825904205311970493132056385139],
  tendril:  [0.3369844464873, 0.0487782196791],
  spiral:   [-0.77568377, 0.13646737],
  minibrot: [-1.768778833, -0.001738996],
  dendrite: [-0.10109636384562, 0.95628651080914],
  triple:   [-0.0452407411, 0.9868162204352258],
  needle:   [-1.985540371654130485531439267191269851811165434636382820704394766110272, 0],
};

const bg = document.getElementById("bg");
if (bg) start();

function start() {
  const names = (S.targets || Object.keys(TARGETS)).filter((n) => TARGETS[n]);
  const [tx, ty] = TARGETS[names[Math.floor(Math.random() * names.length)] || "seahorse"];
  const cover = document.querySelector(".outer");          // opaque box: no need to draw under it
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const LOG2 = Math.log(2);

  let ramp = [...(S.chars || " .")];
  if (S.reverse) ramp.reverse();
  const n = ramp.length;
  const inside = (S.interior || " ")[0];
  const blank = " ";

  let cw = 5, ch = 10, cols = 0, rows = 0, buf = null, boost = 1;

  function measure() {
    bg.style.fontSize = S.fontSize + "px";
    bg.style.lineHeight = S.lineHeight;
    bg.style.opacity = S.opacity;
    const probe = document.createElement("span");
    probe.textContent = "M".repeat(50) + "\nM";
    probe.style.cssText = "position:absolute;visibility:hidden;white-space:pre";
    bg.append(probe);
    const r = probe.getBoundingClientRect();
    cw = r.width / 50 || 5;
    ch = r.height / 2 || 10;
    probe.remove();
    cols = Math.ceil(innerWidth / cw) + 1;
    rows = Math.ceil(innerHeight / ch) + 1;
    buf = new Float64Array(cols * rows);
  }

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

  function render(sec) {
    const zl = zoomLog(sec);
    const perPx = S.startWidth / Math.pow(2, zl) / innerWidth;
    const ang = (S.rotate * sec * Math.PI) / 180;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const maxIter = Math.min(S.iterMax, Math.round((S.iterBase + S.iterPerOctave * zl) * boost));
    const shift = S.cycle * sec;
    const bw = Math.max(0.01, S.bandWidth);

    // cells fully hidden behind the opaque outer box are skipped
    let c0 = cols, c1 = -1, r0 = rows, r1 = -1;
    if (cover) {
      const b = cover.getBoundingClientRect();
      c0 = Math.ceil(b.left / cw); c1 = Math.floor(b.right / cw) - 1;
      r0 = Math.ceil(b.top / ch); r1 = Math.floor(b.bottom / ch) - 1;
    }

    let vmin = Infinity, vmax = -Infinity, capped = 0, counted = 0;
    for (let r = 0, idx = 0; r < rows; r++) {
      const py = (r + 0.5) * ch - innerHeight / 2;
      const hiddenRow = r >= r0 && r <= r1;
      for (let c = 0; c < cols; c++, idx++) {
        if (hiddenRow && c >= c0 && c <= c1) { buf[idx] = -2; continue; }
        counted++;
        const px = (c + 0.5) * cw - innerWidth / 2;
        const x0 = tx + (px * ca - py * sa) * perPx;
        const y0 = ty - (px * sa + py * ca) * perPx;
        const q = (x0 - 0.25) * (x0 - 0.25) + y0 * y0;
        if (q * (q + (x0 - 0.25)) <= 0.25 * y0 * y0 || (x0 + 1) * (x0 + 1) + y0 * y0 <= 0.0625) {
          buf[idx] = -1; continue;
        }
        let x = 0, y = 0, x2 = 0, y2 = 0, i = 0;
        while (x2 + y2 <= 256 && i < maxIter) {
          y = 2 * x * y + y0;
          x = x2 - y2 + x0;
          x2 = x * x; y2 = y * y;
          i++;
        }
        if (i >= maxIter) { buf[idx] = -1; capped++; continue; }
        let v = i;
        if (S.smooth) v = Math.max(0, i + 1 - Math.log(Math.log(x2 + y2) / 2 / LOG2) / LOG2);
        buf[idx] = v;
        if (v < vmin) vmin = v;
        if (v > vmax) vmax = v;
      }
    }
    const frac = counted ? capped / counted : 0;
    if (frac > 0.25 && maxIter < S.iterMax) boost *= 1.15;
    else if (frac < 0.05 && boost > 1) boost = Math.max(1, boost * 0.98);

    const span = Math.log1p(Math.max(1e-9, vmax - vmin));
    const lines = new Array(rows);
    const row = new Array(cols);
    for (let r = 0, idx = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++, idx++) {
        const v = buf[idx];
        if (v === -2) { row[c] = blank; continue; }
        if (v < 0) { row[c] = inside; continue; }
        let k;
        if (S.mapping === "auto") k = Math.floor(Math.pow(Math.log1p(v - vmin) / span, S.contrast) * (n - 1) + 0.5 + shift);
        else if (S.mapping === "bands") k = Math.floor(v / bw + shift);
        else k = Math.floor((v / maxIter) * (n - 1) + shift);
        row[c] = ramp[((k % n) + n) % n];
      }
      lines[r] = row.join("");
    }
    bg.textContent = lines.join("\n");
  }

  measure();
  addEventListener("resize", measure);

  let t = 0, last = performance.now(), lastDraw = -Infinity;
  if (reduced) { render(0); addEventListener("resize", () => render(0)); return; }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.25, (now - last) / 1000);   // don't jump ahead after the tab was hidden
    last = now;
    if (document.hidden) return;
    t += dt;
    if (now - lastDraw < 1000 / S.fps - 1) return;
    lastDraw = now;
    render(t);
  }
  requestAnimationFrame(frame);
}
