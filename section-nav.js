// Section links (a vertical rail on wide screens, a horizontal bar on small ones)
// with scroll highlighting.
(function () {
  const bar = document.getElementById("section-bar");
  if (!bar) return;

  const chips = [...bar.querySelectorAll(".chip")];

  // Each chip covers one or more sections (data-also lists extra section ids,
  // e.g. "Overview" also covers the Trailer/Play window right below it).
  const items = [];
  chips.forEach((chip) => {
    const ids = [chip.dataset.target, ...(chip.dataset.also ? chip.dataset.also.split(" ") : [])];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) items.push({ chip, el });
    });
  });

  const wide = matchMedia("(min-width: 1180px)");

  // Which section are we in? The last one whose top has passed the line under the fixed nav/bar.
  function update() {
    const line = wide.matches ? 120 : innerWidth <= 480 ? 130 : 150;
    const atBottom = innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
    let current = null;
    let best = -Infinity;
    for (const item of items) {
      const top = item.el.getBoundingClientRect().top;
      if (top <= line && top > best) {
        best = top;
        current = item;
      }
    }
    if (atBottom && items.length) {
      current = items.reduce((a, b) => (a.el.getBoundingClientRect().top > b.el.getBoundingClientRect().top ? a : b));
    }

    chips.forEach((chip) => {
      const on = !!current && chip === current.chip;
      chip.classList.toggle("active", on);
      if (on) chip.setAttribute("aria-current", "true");
      else chip.removeAttribute("aria-current");
    });

    // Keep the highlighted chip in view when the bar scrolls sideways (phones).
    if (current && !wide.matches && bar.scrollWidth > bar.clientWidth) {
      const c = current.chip;
      bar.scrollTo({ left: c.offsetLeft - (bar.clientWidth - c.offsetWidth) / 2, behavior: "smooth" });
    }
  }

  let queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      update();
    });
  }
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  update();
})();
