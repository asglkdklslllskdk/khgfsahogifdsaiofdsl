/* Images inside .img-wrap start invisible with "..." dots over their reserved space
   (see .img-wrap in global.css) and fade in once loaded. */
if (!window.__images) {
  window.__images = true;
  const done = (img) => { const w = img.closest(".img-wrap"); if (w) w.classList.add("loaded"); };
  // load / error don't bubble, but can be caught on the way down
  document.addEventListener("load", (e) => { if (e.target.tagName === "IMG") done(e.target); }, true);
  document.addEventListener("error", (e) => { if (e.target.tagName === "IMG") done(e.target); }, true);
  // images that finished before this ran (cached), on every page
  const sweep = () => document.querySelectorAll(".img-wrap img").forEach((img) => { if (img.complete) done(img); });
  document.addEventListener("astro:page-load", sweep);
  sweep();
}
