/* ascii frame renderer
   - any .frame element gets a box drawn around it in text characters
   - data-frame="ascii|single|double|round|hash|dots"  (charset)
   - data-title="..."  / data-footer="..."  (labels set into the border)
   - any .rule element is filled with a line of data-char (default "-")
   widths/heights are snapped to whole character cells so the box lines up */
(() => {
  const SETS = {
    ascii:  "+-+|++",
    single: "┌─┐│└┘",
    double: "╔═╗║╚╝",
    round:  "╭─╮│╰╯",
    hash:   "######",
    dots:   ".-.:''",
  };
  document.documentElement.classList.add("js");
  let cw = 8, lh = 16, lastW = 0, lastH = 0;

  function measure() {
    const p = document.createElement("pre");
    p.style.cssText = "position:absolute;visibility:hidden;left:-9999px;top:0";
    const s = document.createElement("span");
    s.textContent = "M".repeat(100);
    p.append(s, "\nM");
    document.body.append(p);
    cw = s.getBoundingClientRect().width / 100;
    lh = p.getBoundingClientRect().height / 2;
    p.remove();
  }

  function draw() {
    lastW = innerWidth; lastH = innerHeight;
    // sizes are reset and re-measured below, which briefly shortens the page and can
    // make the browser jump the scroll position. remember it and put it back after.
    const sx = scrollX, sy = scrollY;
    measure();
    const frames = [...document.querySelectorAll(".frame")];
    const rules = [...document.querySelectorAll(".rule")];
    frames.forEach(f => { f.style.width = ""; f.style.height = ""; });
    rules.forEach(r => { r.textContent = ""; });
    trimInk();

    // widths: outer -> inner
    frames.forEach(f => {
      f._cols = Math.max(4, Math.floor(f.getBoundingClientRect().width / cw + 0.01));
      f.style.width = f._cols * cw + "px";
    });
    rules.forEach(r => {
      const n = Math.floor(r.getBoundingClientRect().width / cw + 0.01);
      r.textContent = (r.dataset.char || "-").repeat(Math.max(0, n));
    });
    // heights: inner -> outer
    frames.slice().reverse().forEach(f => {
      f._rows = Math.max(2, Math.ceil(f.getBoundingClientRect().height / lh - 0.01));
      f.style.height = f._rows * lh + "px";
    });

    frames.forEach(f => {
      const c = [...(SETS[f.dataset.frame] || f.dataset.frame || SETS.ascii)];
      const inner = f._cols - 2;
      let top = c[1].repeat(inner), bot = top;
      if (f.dataset.title)  top = (c[1] + "[ " + f.dataset.title + " ]" + top).slice(0, inner);
      if (f.dataset.footer) bot = (bot + "[ " + f.dataset.footer + " ]" + c[1]).slice(-inner);
      const mid = (c[3] + " ".repeat(inner) + c[3] + "\n").repeat(f._rows - 2);
      let o = f.querySelector(":scope > .frame-border");
      if (!o) {
        o = document.createElement("pre");
        o.className = "frame-border";
        o.setAttribute("aria-hidden", "true");
        f.append(o);
      }
      o.textContent = c[0] + top + c[2] + "\n" + mid + c[4] + bot + c[5];
    });
    centerInk();
    document.documentElement.classList.remove("loading");   // show the page (see Base.astro)
    if (scrollX !== sx || scrollY !== sy) scrollTo(sx, sy);

  }

  /* Ink centering for elements marked data-center-ink (the header text).
     Centers the letters actually drawn on screen between the border lines actually
     drawn on screen, without trusting any font metrics:
       - baselines come from the real layout (a zero-size probe element placed in the
         text sits exactly on the baseline)
       - how far the ink reaches above/below the baseline comes from drawing the
         same text with the same font onto a canvas and scanning its pixels
     The same is done for the horizontal border character. The element is then
     moved with a transform, which doesn't affect layout. */
  const inkCache = new Map();
  function ink(el, text) {
    const cs = getComputedStyle(el);
    const k = 4;                                       // draw 4x larger for sub-pixel accuracy
    const size = parseFloat(cs.fontSize) * k;
    const font = `${cs.fontStyle} ${cs.fontWeight} ${size}px ${cs.fontFamily}`;
    const key = font + "|" + text;
    if (inkCache.has(key)) return inkCache.get(key);
    const c = document.createElement("canvas");
    const g = c.getContext("2d", { willReadFrequently: true });
    g.font = font;
    c.width = Math.ceil(g.measureText(text).width + size);
    c.height = Math.ceil(size * 3);
    const base = Math.round(size * 2);
    g.font = font;                                     // resizing the canvas resets it
    g.fillText(text, size / 2, base);
    const data = g.getImageData(0, 0, c.width, c.height).data;
    let top = -1, bottom = -1;
    for (let y = 0; y < c.height; y++) {
      for (let x = 3; x < c.width * 4; x += 4 * 1) {
        if (data[y * c.width * 4 + x] > 0) { if (top < 0) top = y; bottom = y; break; }
      }
    }
    const r = top < 0 ? { above: 0, below: 0 } : { above: (base - top) / k, below: (bottom + 1 - base) / k };
    inkCache.set(key, r);
    return r;
  }

  function baselineAt(parent, atEnd) {
    const p = document.createElement("span");
    p.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
    atEnd ? parent.append(p) : parent.prepend(p);
    const y = p.getBoundingClientRect().top;
    p.remove();
    return y;
  }

  // before the frames are measured: shrink the element's box to its ink with
  // negative margins, so the header is only as tall as the letters + padding
  function trimInk() {
    document.querySelectorAll("[data-center-ink]").forEach(el => {
      el.style.margin = "";
      el.style.transform = "";
      const r = el.getBoundingClientRect();
      const t = ink(el, el.textContent.trim());
      const inkTop = baselineAt(el, false) - t.above;
      const inkBottom = baselineAt(el, true) + t.below;
      el.style.marginTop = -(inkTop - r.top).toFixed(2) + "px";
      el.style.marginBottom = -(r.bottom - inkBottom).toFixed(2) + "px";
    });
  }

  // after the borders are drawn: move the letters to the exact middle between them
  function centerInk() {
    document.querySelectorAll("[data-center-ink]").forEach(el => {
      const frame = el.closest(".frame");
      const border = frame && frame.querySelector(":scope > .frame-border");
      if (!border || !frame._rows) return;
      el.style.transform = "";

      // drawn border lines: top row and bottom row of the border text
      const hChar = [...border.textContent][1];
      const b = ink(border, hChar);
      const row0 = baselineAt(border, false) - (b.above - b.below) / 2;
      const lineMid = row0 + ((frame._rows - 1) * lh) / 2;

      // drawn letters: first line's baseline to last line's baseline
      const text = el.textContent.trim();
      const t = ink(el, text);
      const top = baselineAt(el, false) - t.above;
      const bottom = baselineAt(el, true) + t.below;

      el.style.transform = `translateY(${(lineMid - (top + bottom) / 2).toFixed(2)}px)`;
    });
  }

  window.redrawFrames = draw;   // used by viewer.js after it swaps boxes

  let raf;
  const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); };
  addEventListener("resize", () => { if (innerWidth !== lastW || innerHeight !== lastH) schedule(); });
  if (document.fonts) document.fonts.ready.then(schedule);
  addEventListener("load", schedule);   // images change heights once loaded
  document.querySelectorAll("img").forEach(img => img.addEventListener("load", schedule));
  draw();
})();
