/* Image viewer for post pages.
   Clicking any image in a post swaps the [ post ] box for a viewer box showing that
   image full size, with "<-  3 / 8  ->" to step through every image in the post.
   - URL becomes /posts/name/#image-3, so links to a single image work and the
     browser back button returns to the post
   - keys: left/right arrows to step, Esc to close
   - clicking the image goes to the next one
   The viewer box is sized to the window (see .viewer in global.css), so the frame
   and arrows stay in the same place for every image. */
(() => {
  const post = document.querySelector(".post-panel");
  if (!post) return;
  const imgs = [...post.querySelectorAll(".prose img")];
  if (!imgs.length) return;

  const items = imgs.map((img) => {
    const fig = img.closest("figure");
    const cap = fig && fig.querySelector("figcaption");
    const title = (fig && fig.dataset.title) || img.alt || "";
    const year = (fig && fig.dataset.footer) || "";
    return {
      src: img.currentSrc || img.src,
      alt: title,
      label: [title, year].filter(Boolean).join(", "),   // [ title, 2026 ]
      description: cap ? cap.textContent : "",
    };
  });

  const viewer = document.createElement("article");
  viewer.className = "frame panel viewer";
  viewer.dataset.frame = "single";
  viewer.hidden = true;
  viewer.innerHTML = `
    <p class="viewer-close"><a href="#">x close</a></p>
    <figure class="viewer-figure">
      <img class="viewer-img" alt="">
      <figcaption class="viewer-desc"></figcaption>
    </figure>
    <nav class="viewer-nav" aria-label="image navigation">
      <a href="#" class="viewer-prev" aria-label="previous image">&lt;-</a>
      <span class="viewer-count"></span>
      <a href="#" class="viewer-next" aria-label="next image">-&gt;</a>
    </nav>`;
  post.after(viewer);

  const $ = (s) => viewer.querySelector(s);
  const vImg = $(".viewer-img"), vDesc = $(".viewer-desc"), vCount = $(".viewer-count");
  let openedByClick = false, returnTo = null;

  const redraw = () => window.redrawFrames && window.redrawFrames();
  vImg.addEventListener("load", redraw);

  const current = () => {
    const m = location.hash.match(/^#image-(\d+)$/);
    const i = m ? parseInt(m[1], 10) - 1 : -1;
    return i >= 0 && i < items.length ? i : -1;
  };

  function render() {
    const i = current();
    if (i < 0) {
      if (!viewer.hidden) {
        viewer.hidden = true;
        post.hidden = false;
        redraw();
        if (returnTo) returnTo.scrollIntoView({ block: "center" });
      }
      return;
    }
    const it = items[i];
    const opening = viewer.hidden;
    if (opening) returnTo = imgs[i];
    vImg.src = it.src;
    vImg.alt = it.alt;
    viewer.dataset.title = it.label;
    if (!it.label) delete viewer.dataset.title;
    vDesc.textContent = it.description;
    vDesc.hidden = !it.description;
    vCount.textContent = `${i + 1} / ${items.length}`;
    post.hidden = true;
    viewer.hidden = false;
    redraw();
    // on open, centre the box in the window. while stepping, nothing moves.
    if (opening) {
      const r = viewer.getBoundingClientRect();
      scrollTo({ top: scrollY + r.top - Math.max(0, (innerHeight - r.height) / 2) });
    }
    // preload neighbours
    [i - 1, i + 1].forEach((j) => { if (items[j]) new Image().src = items[j].src; });
  }

  const go = (i) => location.replace("#image-" + (((i % items.length) + items.length) % items.length + 1));
  const step = (d) => go(current() + d);

  function close() {
    if (openedByClick) { openedByClick = false; history.back(); }
    else { history.replaceState(null, "", location.pathname + location.search); render(); }
  }

  imgs.forEach((img, i) => {
    img.classList.add("zoomable");
    img.addEventListener("click", () => { openedByClick = true; location.hash = "image-" + (i + 1); });
  });
  $(".viewer-prev").addEventListener("click", (e) => { e.preventDefault(); step(-1); });
  $(".viewer-next").addEventListener("click", (e) => { e.preventDefault(); step(1); });
  $(".viewer-close a").addEventListener("click", (e) => { e.preventDefault(); close(); });
  vImg.addEventListener("click", () => step(1));
  document.addEventListener("keydown", (e) => {
    if (current() < 0 || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
    else if (e.key === "Escape") close();
  });
  addEventListener("hashchange", render);
  render();
})();
