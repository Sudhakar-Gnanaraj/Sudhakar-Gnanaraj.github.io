// Embeds the interactive level maps: matches the site's dark theme and sizes the frame to the
// map's own content (so it can shrink as well as grow when the window is resized).
(function () {
  const frame = document.getElementById("map-frame");
  if (!frame) return;

  function fit() {
    try {
      const doc = frame.contentDocument;
      if (!doc || !doc.body) return;
      // The body's height follows its content. (The document's scrollHeight can never be
      // smaller than the frame itself, which is what made the old version only ever grow.)
      const height = Math.ceil(doc.body.getBoundingClientRect().height);
      if (height > 0) frame.style.height = height + "px";
    } catch { /* cross-origin: keep the default height */ }
  }

  frame.addEventListener("load", () => {
    try {
      const doc = frame.contentDocument;
      doc.documentElement.dataset.theme = "dark"; // the site is dark, whatever the viewer's setting
      doc.documentElement.style.overflow = "hidden";
      fit();
      if ("ResizeObserver" in window) new ResizeObserver(fit).observe(doc.body);
      frame.contentWindow.addEventListener("resize", fit);
      addEventListener("resize", fit);
    } catch { /* leave the map as it is */ }
  });
})();
