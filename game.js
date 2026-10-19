// Trailer / Play toggle. Trailer is the default; the WebGL build loads only on the first Play click.
const tabTrailer = document.getElementById("tab-trailer");
const tabPlay = document.getElementById("tab-play");
const panelTrailer = document.getElementById("panel-trailer");
const panelPlay = document.getElementById("panel-play");
const frame = document.getElementById("game-frame");
const fsBtn = document.getElementById("btn-fullscreen");
const muteBtn = document.getElementById("btn-mute");
const playTools = document.getElementById("play-tools");
const loadNote = document.getElementById("load-note");
const mobileWarning = document.getElementById("mobile-warning");

// ---- Mobile warning --------------------------------------------------------
const isMobile =
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
  (matchMedia("(pointer: coarse)").matches && !matchMedia("(any-pointer: fine)").matches);
if (isMobile && mobileWarning) mobileWarning.hidden = false;

// ---- Game health -----------------------------------------------------------
// True when the game page inside the frame has finished loading and is still running.
function gameLoaded() {
  try {
    const doc = frame.contentDocument;
    const canvas = doc && doc.querySelector("#unity-canvas");
    const bar = doc && doc.querySelector("#unity-loading-bar");
    return !!(canvas && bar && getComputedStyle(bar).display === "none");
  } catch {
    return false;
  }
}

function gameBroken() {
  try {
    const doc = frame.contentDocument;
    const canvas = doc && doc.querySelector("#unity-canvas");
    if (!canvas) return true;
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    return !!(gl && gl.isContextLost());
  } catch {
    return true;
  }
}

// Load (or reload) the game in the frame.
function loadGame(fresh) {
  const base = frame.dataset.src;
  frame.src = fresh ? base + (base.includes("?") ? "&" : "?") + "r=" + Date.now() : base;
}

// Show the "takes a moment to load" note until the game is up.
let loadWatcher = null;
function watchLoading() {
  clearInterval(loadWatcher);
  if (gameLoaded()) {
    loadNote.hidden = true;
    return;
  }
  loadNote.hidden = false;
  let waited = 0;
  loadWatcher = setInterval(() => {
    waited += 500;
    if (gameLoaded() || waited > 180000) {
      loadNote.hidden = true;
      clearInterval(loadWatcher);
    }
  }, 500);
}

function show(which) {
  const play = which === "play";
  // Decide before switching: was the game left half-loaded or broken while hidden?
  const needsReload = play && !!frame.getAttribute("src") && (!gameLoaded() || gameBroken());

  tabTrailer.classList.toggle("active", !play);
  tabPlay.classList.toggle("active", play);
  tabTrailer.setAttribute("aria-selected", String(!play));
  tabPlay.setAttribute("aria-selected", String(play));
  panelTrailer.hidden = play;
  panelPlay.hidden = !play;
  playTools.hidden = !play;

  if (!play) {
    loadNote.hidden = true;
    clearInterval(loadWatcher);
  }

  if (play) {
    if (!frame.getAttribute("src")) loadGame(false);
    else if (needsReload) loadGame(true);
    watchLoading();

    // Stop the trailer when switching away by reloading its iframe, if there is one
    const trailer = panelTrailer.querySelector("iframe");
    if (trailer) trailer.src = trailer.src;
  }
}

// ---- Sound: mute / unmute --------------------------------------------------
// The game page is same-origin, so when it loads we wrap its audio (Web Audio and
// <audio>/<video> elements) so the page can switch everything off with one button.
let muted = false;
const masters = new Set(); // master gain nodes, one per AudioContext the game creates
const mediaEls = new Map(); // media element -> its original muted state

function applyMute() {
  masters.forEach((g) => {
    try { g.gain.value = muted ? 0 : 1; } catch { /* context gone */ }
  });
  mediaEls.forEach((orig, el) => {
    try { el.muted = muted ? true : orig; } catch { /* element gone */ }
  });
  muteBtn.textContent = muted ? "🔇 Muted" : "🔊 Sound on";
  muteBtn.setAttribute("aria-pressed", String(muted));
}

function hookAudio(win) {
  if (win.__audioHooked) return;
  win.__audioHooked = true;

  for (const name of ["AudioContext", "webkitAudioContext"]) {
    const Orig = win[name];
    if (!Orig) continue;
    win[name] = class extends Orig {
      constructor(...args) {
        super(...args);
        try {
          const master = this.createGain();
          master.connect(this.destination);
          master.gain.value = muted ? 0 : 1;
          Object.defineProperty(this, "destination", { value: master, configurable: true });
          masters.add(master);
        } catch { /* leave the context untouched */ }
      }
    };
  }

  const proto = win.HTMLMediaElement && win.HTMLMediaElement.prototype;
  if (proto) {
    const origPlay = proto.play;
    proto.play = function (...args) {
      if (!mediaEls.has(this)) mediaEls.set(this, this.muted);
      if (muted) this.muted = true;
      return origPlay.apply(this, args);
    };
  }
}

muteBtn.addEventListener("click", () => {
  muted = !muted;
  applyMute();
});

// ---- Fit the game into the page's window -----------------------------------
// Fit Unity's canvas inside the page's game window (keeps the build's 16:9 shape,
// hides Unity's footer). Done here so re-exporting the build from Unity doesn't undo it.
frame.addEventListener("load", () => {
  try {
    const win = frame.contentWindow;
    const doc = frame.contentDocument;
    if (!doc || !doc.querySelector("#unity-canvas")) return;
    hookAudio(win);
    const style = doc.createElement("style");
    style.textContent = `
      html, body { height: 100%; margin: 0; overflow: hidden; background: #000; }
      body { display: flex; align-items: center; justify-content: center; }
      #unity-container.unity-desktop { position: static !important; transform: none !important; left: auto !important; top: auto !important; }
      #unity-canvas { display: block; width: min(100vw, 177.7778vh) !important; height: min(56.25vw, 100vh) !important; }
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
