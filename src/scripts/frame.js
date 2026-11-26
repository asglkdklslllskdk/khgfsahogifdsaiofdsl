/* ascii frame renderer
   - any .frame element gets a box drawn around it in text characters
   - data-frame="ascii|single|double|round|hash|dots"  (charset)
   - data-title="..."  / data-footer="..."  (labels set into the border)
   - any .rule element is filled with a line of data-char (default "-")
   widths/heights are snapped to whole character cells so the box lines up.

   Page changes happen without a reload (Astro ClientRouter), so this sets itself up
   once and redraws whenever new page content is swapped in, before it's shown. */
if (!window.__frames) {
  window.__frames = true;

  const SETS = {
    ascii:  "+-+|++",
    single: "┌─┐│└┘",
    double: "╔═╗║╚╝",
    round:  "╭─╮│╰╯",
    hash:   "######",
    dots:   ".-.:''",
  };
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

    window.__framesReady = true;
    document.documentElement.classList.add("js");   // page swaps reset <html>'s classes
    document.documentElement.classList.remove("loading");   // show the page (see Base.astro)
    if (scrollX !== sx || scrollY !== sy) scrollTo(sx, sy);
  }

  window.redrawFrames = draw;   // used by viewer.js after it swaps boxes

  let raf;
  const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); };
  addEventListener("resize", () => { if (innerWidth !== lastW || innerHeight !== lastH) schedule(); });
  if (document.fonts) document.fonts.ready.then(schedule);
  // a new page's content was just swapped in: draw before it is painted
  document.addEventListener("astro:after-swap", draw);
  // load doesn't bubble, but it can be caught on the way down: covers every image
  document.addEventListener("load", (e) => { if (e.target.tagName === "IMG") schedule(); }, true);

  draw();
}
