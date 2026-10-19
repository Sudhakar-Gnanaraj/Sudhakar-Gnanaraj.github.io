// Trailer / Play toggle. Trailer is the default; the WebGL build loads only on the first Play click.
const tabTrailer = document.getElementById("tab-trailer");
const tabPlay = document.getElementById("tab-play");
const panelTrailer = document.getElementById("panel-trailer");
const panelPlay = document.getElementById("panel-play");
const frame = document.getElementById("game-frame");
const fsBtn = document.getElementById("btn-fullscreen");
const playTools = document.getElementById("play-tools");

function show(which) {
  const play = which === "play";
  tabTrailer.classList.toggle("active", !play);
  tabPlay.classList.toggle("active", play);
  tabTrailer.setAttribute("aria-selected", String(!play));
  tabPlay.setAttribute("aria-selected", String(play));
  panelTrailer.hidden = play;
  panelPlay.hidden = !play;
  playTools.hidden = !play;

  if (play && !frame.src) frame.src = frame.dataset.src;

  // Stop the trailer when switching away by reloading its iframe, if there is one
  if (play) {
    const trailer = panelTrailer.querySelector("iframe");
    if (trailer) trailer.src = trailer.src;
  }
}

// Fit Unity's fixed 960x600 canvas inside the page's game window (keeps the 16:10 shape,
// hides Unity's footer). Done here so re-exporting the build from Unity doesn't undo it.
frame.addEventListener("load", () => {
  try {
    const doc = frame.contentDocument;
    if (!doc || !doc.querySelector("#unity-canvas")) return;
    const style = doc.createElement("style");
    style.textContent = `
      html, body { height: 100%; margin: 0; overflow: hidden; background: #000; }
      body { display: flex; align-items: center; justify-content: center; }
      #unity-container.unity-desktop { position: static !important; transform: none !important; left: auto !important; top: auto !important; }
      #unity-canvas { display: block; width: min(100vw, 160vh) !important; height: min(62.5vw, 100vh) !important; }
      #unity-footer { display: none !important; }`;
    doc.head.appendChild(style);
  } catch {
    /* cross-origin or not loaded: leave the build as exported */
  }
});

tabTrailer.addEventListener("click", () => show("trailer"));
tabPlay.addEventListener("click", () => show("play"));
// Fullscreen the whole game window from this page's own click. This avoids Unity's
// internal fullscreen code, which doesn't cope well with running inside an iframe.
fsBtn.addEventListener("click", () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
    return;
  }
  const request = panelPlay.requestFullscreen ? panelPlay.requestFullscreen() : null;
  if (request && request.catch) request.catch(() => window.open(frame.dataset.src, "_blank", "noopener"));
});

// Keep GIFs looping. Each GIF is fetched once into memory (a blob URL); after one
// full pass the <img> is swapped for a fresh copy of that same in-memory file, so the
// animation restarts from frame one without another network request.
async function keepLooping(img) {
  const ms = Number(img.dataset.loopMs);
  // Download the whole file into memory, retrying a few times if the connection drops.
  let blobUrl;
  for (let attempt = 0; attempt < 5 && !blobUrl; attempt++) {
    try {
      const res = await fetch(img.dataset.src, { cache: attempt ? "reload" : "default" });
      if (res.ok) blobUrl = URL.createObjectURL(await res.blob());
    } catch {
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    }
  }
  if (!blobUrl) {
    img.src = img.dataset.src; // last resort: let the browser load it directly
    return;
  }

  let current = img;
  const play = () => {
    const fresh = current.cloneNode();
    fresh.loading = "eager";
    fresh.src = blobUrl;
    fresh.addEventListener("error", () => setTimeout(() => (fresh.src = blobUrl), 300), { once: true });
    current.replaceWith(fresh);
    current = fresh;
  };
  const tick = () => {
    if (!document.hidden) play();
    setTimeout(tick, ms);
  };
  play();
  setTimeout(tick, ms);
}
// One at a time, so three large downloads don't compete with each other.
(async () => {
  for (const img of document.querySelectorAll("img[data-loop-ms]")) await keepLooping(img);
})();
