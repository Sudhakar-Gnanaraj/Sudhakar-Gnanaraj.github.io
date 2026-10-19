// Trailer / Play toggle. Trailer is the default; the WebGL build loads only on the first Play click.
const tabTrailer = document.getElementById("tab-trailer");
const tabPlay = document.getElementById("tab-play");
const panelTrailer = document.getElementById("panel-trailer");
const panelPlay = document.getElementById("panel-play");
const frame = document.getElementById("game-frame");
const fsBtn = document.getElementById("btn-fullscreen");

function show(which) {
  const play = which === "play";
  tabTrailer.classList.toggle("active", !play);
  tabPlay.classList.toggle("active", play);
  tabTrailer.setAttribute("aria-selected", String(!play));
  tabPlay.setAttribute("aria-selected", String(play));
  panelTrailer.hidden = play;
  panelPlay.hidden = !play;
  fsBtn.hidden = !play;

  if (play && !frame.src) frame.src = frame.dataset.src;

  // Stop the trailer when switching away by reloading its iframe, if there is one
  if (play) {
    const trailer = panelTrailer.querySelector("iframe");
    if (trailer) trailer.src = trailer.src;
  }
}

tabTrailer.addEventListener("click", () => show("trailer"));
tabPlay.addEventListener("click", () => show("play"));
fsBtn.addEventListener("click", () => {
  if (frame.requestFullscreen) frame.requestFullscreen();
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
