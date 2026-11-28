/* Shared ASCII Mandelbrot renderer, used by the page background
   (src/scripts/mandelbrot.js) and the full-screen page (src/scripts/fractal-page.js).

   const r = createRenderer(preElement, settings)
   r.measure()                      after a resize or font size change
   r.render({ cx, cy, zl, sec, skip })
     cx, cy  centre of the view (complex plane)
     zl      zoom level as log2 (0 = settings.startWidth across the window)
     sec     seconds since start (drives rotation and ramp cycling)
     skip    optional DOMRect: cells fully under it are left blank (not calculated) */

export const TARGETS = {
  seahorse: [-0.743643887037158704752191506114774, 0.131825904205311970493132056385139],
  tendril:  [0.3369844464873, 0.0487782196791],
  spiral:   [-0.77568377, 0.13646737],
  minibrot: [-1.768778833, -0.001738996],
  dendrite: [-0.10109636384562, 0.95628651080914],
  triple:   [-0.0452407411, 0.9868162204352258],
  needle:   [-1.985540371654130485531439267191269851811165434636382820704394766110272, 0],
};

export function randomTarget(names) {
  const list = (names && names.length ? names : Object.keys(TARGETS)).filter((n) => TARGETS[n]);
  return TARGETS[list[Math.floor(Math.random() * list.length)]] || TARGETS.seahorse;
}

export function createRenderer(el, S) {
  const LOG2 = Math.log(2);
  const ramp = [...(S.chars || " .")];
  if (S.reverse) ramp.reverse();
  const n = ramp.length;
  const inside = (S.interior || " ")[0];

  const r = { cw: 5, ch: 10, cols: 0, rows: 0, boost: 1, maxIter: 0, buf: null };

  r.measure = () => {
    el.style.fontSize = S.fontSize + "px";
    el.style.lineHeight = S.lineHeight;
    el.style.opacity = S.opacity;
    const probe = document.createElement("span");
    probe.textContent = "M".repeat(50) + "\nM";
    probe.style.cssText = "position:absolute;visibility:hidden;white-space:pre";
    el.append(probe);
    const b = probe.getBoundingClientRect();
    r.cw = b.width / 50 || 5;
    r.ch = b.height / 2 || 10;
    probe.remove();
    r.cols = Math.ceil(innerWidth / r.cw) + 1;
    r.rows = Math.ceil(innerHeight / r.ch) + 1;
    r.buf = new Float64Array(r.cols * r.rows);
  };

  r.render = ({ cx, cy, zl, sec, skip }) => {
    const { cw, ch, cols, rows, buf } = r;
    const perPx = S.startWidth / Math.pow(2, zl) / innerWidth;   // complex units per pixel
    const ang = (S.rotate * sec * Math.PI) / 180;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    // more iterations the deeper the zoom; "boost" adds more when the view goes blank
    const maxIter = Math.min(S.iterMax, Math.round((S.iterBase + S.iterPerOctave * zl) * r.boost));
    r.maxIter = maxIter;
    const shift = S.cycle * sec;
    const bw = Math.max(0.01, S.bandWidth);

    let c0 = cols, c1 = -1, r0 = rows, r1 = -1;
    if (skip) {
      c0 = Math.ceil(skip.left / cw); c1 = Math.floor(skip.right / cw) - 1;
      r0 = Math.ceil(skip.top / ch); r1 = Math.floor(skip.bottom / ch) - 1;
    }

    let vmin = Infinity, vmax = -Infinity, capped = 0, counted = 0;
    for (let row = 0, idx = 0; row < rows; row++) {
      const py = (row + 0.5) * ch - innerHeight / 2;
      const hiddenRow = row >= r0 && row <= r1;
      for (let c = 0; c < cols; c++, idx++) {
        if (hiddenRow && c >= c0 && c <= c1) { buf[idx] = -2; continue; }
        counted++;
        const px = (c + 0.5) * cw - innerWidth / 2;
        const x0 = cx + (px * ca - py * sa) * perPx;
        const y0 = cy - (px * sa + py * ca) * perPx;
        // the two big solid regions: known to be inside, skip the work
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
    if (frac > 0.25 && maxIter < S.iterMax) r.boost *= 1.15;
    else if (frac < 0.05 && r.boost > 1) r.boost = Math.max(1, r.boost * 0.98);

    const span = Math.log1p(Math.max(1e-9, vmax - vmin));
    const lines = new Array(rows);
    const line = new Array(cols);
    for (let row = 0, idx = 0; row < rows; row++) {
      for (let c = 0; c < cols; c++, idx++) {
        const v = buf[idx];
        if (v === -2) { line[c] = " "; continue; }
        if (v < 0) { line[c] = inside; continue; }
        let k;
        if (S.mapping === "auto") k = Math.floor(Math.pow(Math.log1p(v - vmin) / span, S.contrast) * (n - 1) + 0.5 + shift);
        else if (S.mapping === "bands") k = Math.floor(v / bw + shift);
        else k = Math.floor((v / maxIter) * (n - 1) + shift);
        line[c] = ramp[((k % n) + n) % n];
      }
      lines[row] = line.join("");
    }
    el.textContent = lines.join("\n");
  };

  return r;
}
