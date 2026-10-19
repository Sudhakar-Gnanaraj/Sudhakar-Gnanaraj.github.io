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

// Some browsers stop a GIF after its first pass. Once an image has loaded, wait
// for one full pass and swap in a fresh copy so it restarts from frame one.
function keepLooping(img) {
  const ms = Number(img.dataset.loopMs);
  const arm = () =>
    setTimeout(() => {
      if (document.hidden) return arm_again();
      const fresh = img.cloneNode();
      fresh.loading = "eager";
      img.replaceWith(fresh);
      keepLooping(fresh);
    }, ms);
  const arm_again = () => setTimeout(() => keepLooping(img), 500);
  if (img.complete && img.naturalWidth) arm();
  else img.addEventListener("load", arm, { once: true });
}
document.querySelectorAll("img[data-loop-ms]").forEach(keepLooping);
