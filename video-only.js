// Click-to-load YouTube video for pages with a gameplay video but no playable build.
// The player is only added when the poster is clicked, and is paused when scrolled out of view.
const facade = document.getElementById("gameplay-facade");
const panel = document.getElementById("panel-gameplay");
let player = null;

facade.addEventListener("click", () => {
  if (player) return;
  player = document.createElement("iframe");
  player.src = "https://www.youtube-nocookie.com/embed/" + facade.dataset.videoId + "?autoplay=1&rel=0&playsinline=1&enablejsapi=1";
  player.title = facade.dataset.title || "Video";
  player.allow = "accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen";
  player.allowFullscreen = true;
  facade.hidden = true;
  panel.appendChild(player);
});

if ("IntersectionObserver" in window) {
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting || !player) return;
    try {
      player.contentWindow.postMessage(JSON.stringify({ event: "command", func: "pauseVideo", args: [] }), "*");
    } catch { /* player not ready */ }
  }, { threshold: 0.2 }).observe(panel);
}
