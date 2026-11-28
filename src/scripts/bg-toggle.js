/* Background on/off switch.
   The choice is saved in the browser's localStorage (not a cookie: it never leaves
   the visitor's browser and isn't sent to the server), so it sticks across pages
   and visits. <html class="bg-off"> hides the background and stops it calculating.
   The class is first set by a tiny script in <head> (Base.astro) before the page is
   drawn, and set again here after each page change, because a page change replaces
   <html>'s classes. */
if (!window.__bgToggle) {
  window.__bgToggle = true;
  let on = true;
  try { on = localStorage.getItem("bg") !== "off"; } catch (e) {}

  const apply = () => {
    document.documentElement.classList.toggle("bg-off", !on);
    document.querySelectorAll(".bg-toggle").forEach((b) => {
      const state = b.querySelector(".bg-state");
      if (state) state.textContent = on ? "on" : "off";
      b.setAttribute("aria-pressed", String(on));
    });
    if (!on) { const bg = document.getElementById("bg"); if (bg) bg.textContent = ""; }
  };

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".bg-toggle")) return;
    on = !on;
    try { localStorage.setItem("bg", on ? "on" : "off"); } catch (e) {}
    apply();
  });
  document.addEventListener("astro:after-swap", apply);
  apply();
}
