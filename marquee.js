// Skills marquee: the track moves left by exactly one group, then repeats, so the loop is
// seamless. Each group carries its own trailing gap, which keeps the jump exact. On wide
// screens more copies are added so the strip never runs out, and the duration follows the
// group's width so the speed is the same on every screen.
(() => {
  const track = document.querySelector(".marquee-track");
  if (!track) return;
  const first = track.querySelector(".marquee-group");
  const SPEED = 60; // pixels per second

  function fit() {
    const groupW = first.getBoundingClientRect().width;
    if (!groupW) return;
    // Enough groups to cover the screen twice over, so a full screen is always filled
    const need = Math.max(2, Math.ceil((innerWidth * 2) / groupW) + 1);
    let groups = track.querySelectorAll(".marquee-group");
    while (groups.length < need) {
      track.appendChild(first.cloneNode(true));
      groups = track.querySelectorAll(".marquee-group");
    }
    track.style.setProperty("--shift", `${groupW}px`);
    track.style.setProperty("--dur", `${(groupW / SPEED).toFixed(1)}s`);
  }

  addEventListener("resize", fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  fit();
})();
