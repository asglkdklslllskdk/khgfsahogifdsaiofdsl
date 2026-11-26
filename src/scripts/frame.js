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
  let cw = 8, lh = 16, lastW = 0;

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
    lastW = innerWidth;
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
  }

  let raf;
  const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); };
  addEventListener("resize", () => { if (innerWidth !== lastW) schedule(); });
  if (document.fonts) document.fonts.ready.then(schedule);
  addEventListener("load", schedule);   // images change heights once loaded
  document.querySelectorAll("img").forEach(img => img.addEventListener("load", schedule));
  draw();
})();
