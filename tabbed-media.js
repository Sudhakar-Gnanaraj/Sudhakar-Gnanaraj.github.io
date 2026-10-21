// Tabs for a page whose media area has a click-to-load YouTube video and one other panel
// (for example a rule book). The YouTube player is only added when the poster is clicked,
// is removed again when the viewer leaves the video tab, and is paused when scrolled out of view.
(function () {
  const tabVideo = document.getElementById("tab-video");
  const tabOther = document.getElementById("tab-other");
  const panelVideo = document.getElementById("panel-video");
  const panelOther = document.getElementById("panel-other");
  const facade = document.getElementById("video-facade");
  if (!tabVideo || !tabOther || !panelVideo || !panelOther || !facade) return;

  let player = null;

  function loadVideo() {
    if (player) return;
    player = document.createElement("iframe");
    player.src = "https://www.youtube-nocookie.com/embed/" + facade.dataset.videoId + "?autoplay=1&rel=0&playsinline=1&enablejsapi=1";
    player.title = facade.dataset.title || "Video";
    player.allow = "accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen";
    player.allowFullscreen = true;
    facade.hidden = true;
    panelVideo.appendChild(player);
  }

  // Remove the player (which stops its sound) and bring the poster back.
  function resetVideo() {
    if (!player) return;
    player.remove();
    player = null;
    facade.hidden = false;
  }

  function show(which) {
    const video = which === "video";
    tabVideo.classList.toggle("active", video);
    tabVideo.setAttribute("aria-selected", String(video));
    tabOther.classList.toggle("active", !video);
    tabOther.setAttribute("aria-selected", String(!video));
    panelVideo.hidden = !video;
    panelOther.hidden = video;
    if (!video) resetVideo();
  }

  facade.addEventListener("click", loadVideo);
  tabVideo.addEventListener("click", () => show("video"));
  tabOther.addEventListener("click", () => show("other"));

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting || !player) return;
      try {
        player.contentWindow.postMessage(JSON.stringify({ event: "command", func: "pauseVideo", args: [] }), "*");
      } catch { /* player not ready */ }
    }, { threshold: 0.2 }).observe(panelVideo);
  }
})();
