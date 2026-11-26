/* Image viewer for post pages.
   Clicking any image in a post swaps the [ post ] box for a viewer box showing that
   image full size, with "<-  3 / 8  ->" to step through every image in the post.
   - the address shows /posts/name/#image-3, so a link to one image opens the viewer
   - keys: left/right arrows to step, Esc to close
   - clicking the image goes to the next one
   The viewer box is sized to the window (see .viewer in global.css), so the frame
   and arrows stay in the same place for every image.

   Pages change without a reload, so global listeners are set once and the viewer is
   rebuilt for each page (astro:page-load). */
if (!window.__viewer) {
  window.__viewer = true;
  let v = null;   // state for the current page, or null if it has no images

  const redraw = () => window.redrawFrames && window.redrawFrames();
  const setHash = (hash) =>   // keep the router's history state; no new history entries
    history.replaceState(history.state, "", location.pathname + location.search + hash);
  const fromHash = () => {
    const m = location.hash.match(/^#image-(\d+)$/);
    const i = m ? parseInt(m[1], 10) - 1 : -1;
    return v && i >= 0 && i < v.items.length ? i : -1;
  };

  function show(i) {
    const { post, viewer, img, desc, count, items } = v;
    const opening = viewer.hidden;
    if (opening) v.returnTo = v.imgs[i];
    v.index = i;
    const it = items[i];
    setHash("#image-" + (i + 1));

    // fade the new image in once it has loaded; dots show meanwhile
    v.wrap.classList.remove("loaded");
    img.onload = () => v.wrap.classList.add("loaded");
    img.src = it.src;
    if (img.complete && img.naturalWidth) v.wrap.classList.add("loaded");
    img.alt = it.alt;

    if (it.label) viewer.dataset.title = it.label; else delete viewer.dataset.title;
    desc.textContent = it.description;
    desc.hidden = !it.description;
    count.textContent = `${i + 1} / ${items.length}`;
    post.hidden = true;
    viewer.hidden = false;
    redraw();
    // on open, centre the box in the window. while stepping, nothing moves.
    if (opening) {
      const r = viewer.getBoundingClientRect();
      scrollTo({ top: scrollY + r.top - Math.max(0, (innerHeight - r.height) / 2), behavior: "instant" });
    }
    // preload neighbours
    [i - 1, i + 1].forEach((j) => { if (items[j]) new Image().src = items[j].src; });
  }

  function close() {
    if (!v || v.viewer.hidden) return;
    setHash("");
    v.viewer.hidden = true;
    v.post.hidden = false;
    v.index = -1;
    redraw();
    if (v.returnTo) v.returnTo.scrollIntoView({ block: "center", behavior: "instant" });
  }

  const step = (d) => { if (v && v.index >= 0) show((v.index + d + v.items.length) % v.items.length); };

  function setup() {
    v = null;
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
        <span class="img-wrap viewer-wrap"><img class="viewer-img" alt=""></span>
        <figcaption class="viewer-desc"></figcaption>
      </figure>
      <nav class="viewer-nav" aria-label="image navigation">
        <a href="#" class="viewer-prev" aria-label="previous image">&lt;-</a>
        <span class="viewer-count"></span>
        <a href="#" class="viewer-next" aria-label="next image">-&gt;</a>
      </nav>`;
    post.after(viewer);
    const $ = (s) => viewer.querySelector(s);
    v = {
      post, viewer, imgs, items, index: -1, returnTo: null,
      img: $(".viewer-img"), wrap: $(".viewer-wrap"), desc: $(".viewer-desc"), count: $(".viewer-count"),
    };

    imgs.forEach((im, i) => {
      im.classList.add("zoomable");
      im.addEventListener("click", () => show(i));
    });
    $(".viewer-prev").addEventListener("click", (e) => { e.preventDefault(); step(-1); });
    $(".viewer-next").addEventListener("click", (e) => { e.preventDefault(); step(1); });
    $(".viewer-close a").addEventListener("click", (e) => { e.preventDefault(); close(); });
    v.img.addEventListener("click", () => step(1));

    const start = fromHash();
    if (start >= 0) show(start);
  }

  document.addEventListener("keydown", (e) => {
    if (!v || v.index < 0 || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
    else if (e.key === "Escape") close();
  });
  document.addEventListener("astro:page-load", setup);
}
