// Trailer / Play toggle. Trailer is the default; the WebGL build loads only on the first Play click.
// Trailer and Gameplay tabs are optional: a page can have any mix of them plus the Play tab.
const tabTrailer = document.getElementById("tab-trailer");
const tabPlay = document.getElementById("tab-play");
const panelTrailer = document.getElementById("panel-trailer");
const tabGameplay = document.getElementById("tab-gameplay");
const panelGameplay = document.getElementById("panel-gameplay");
const panelPlay = document.getElementById("panel-play");
const frame = document.getElementById("game-frame");
const fsBtn = document.getElementById("btn-fullscreen");
const muteBtn = document.getElementById("btn-mute");
const playTools = document.getElementById("play-tools");
const loadNote = document.getElementById("load-note");
const focusNote = document.getElementById("focus-note");
const mobileWarning = document.getElementById("mobile-warning");

// ---- Mobile warning --------------------------------------------------------
const isMobile =
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
  (matchMedia("(pointer: coarse)").matches && !matchMedia("(any-pointer: fine)").matches);
// (shown only while the Play tab is open: see show())

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

// ---- "Click the game to resume" notice -------------------------------------
// The game pauses itself when it loses keyboard/mouse focus (the player clicked somewhere
// else on the page). Tell the player how to get going again.
let hadFocus = false; // has the player clicked into this copy of the game yet?
function checkFocus() {
  let has = false;
  try {
    has = !!(frame.contentDocument && frame.contentDocument.hasFocus());
  } catch { /* frame not ready */ }
  if (has) hadFocus = true;
  focusNote.hidden = !(hadFocus && !has && !panelPlay.hidden && gameLoaded());
}
setInterval(checkFocus, 300);

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

// ---- Videos (YouTube, loaded only when their poster is clicked) --------------
// Two of them: the trailer and the gameplay video. Each is a poster with a play button;
// the YouTube player is added on click and removed again when the viewer leaves the tab.
function makeVideo(tab, panel, facadeId) {
  const facade = document.getElementById(facadeId);
  const video = { tab, panel, facade, title: facade.dataset.title || "Video", frame: null };
  facade.addEventListener("click", () => loadVideo(video));
  return video;
}

function loadVideo(v) {
  if (v.frame) return;
  v.frame = document.createElement("iframe");
  v.frame.src =
    "https://www.youtube-nocookie.com/embed/" + v.facade.dataset.videoId +
    "?autoplay=1&rel=0&playsinline=1&enablejsapi=1";
  v.frame.title = v.title;
  v.frame.allow = "accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen";
  v.frame.allowFullscreen = true;
  v.facade.hidden = true;
  v.panel.appendChild(v.frame);
}

// Remove the player (which stops its sound) and bring the poster back.
function resetVideo(v) {
  if (!v.frame) return;
  v.frame.remove();
  v.frame = null;
  v.facade.hidden = false;
}

function pauseVideo(v) {
  try {
    v.frame.contentWindow.postMessage(JSON.stringify({ event: "command", func: "pauseVideo", args: [] }), "*");
  } catch { /* player not ready */ }
}

const videos = {};
if (tabTrailer && panelTrailer) videos.trailer = makeVideo(tabTrailer, panelTrailer, "trailer-facade");
if (tabGameplay && panelGameplay) videos.gameplay = makeVideo(tabGameplay, panelGameplay, "gameplay-facade");

function show(which) {
  const play = which === "play";
  // Decide before switching: was the game left half-loaded or broken while hidden?
  const needsReload = play && !!frame.getAttribute("src") && (!gameLoaded() || gameBroken());

  // Tabs and panels: exactly one is open
  const present = (o) => Object.fromEntries(Object.entries(o).filter(([, el]) => el));
  const tabs = present({ trailer: tabTrailer, gameplay: tabGameplay, play: tabPlay });
  const panels = present({ trailer: panelTrailer, gameplay: panelGameplay, play: panelPlay });
  for (const name of Object.keys(tabs)) {
    tabs[name].classList.toggle("active", name === which);
    tabs[name].setAttribute("aria-selected", String(name === which));
    panels[name].hidden = name !== which;
  }
  playTools.hidden = !play;
  if (mobileWarning) mobileWarning.hidden = !(isMobile && play);
  // Any note a page marks as play-only is shown just while the Play tab is open
  document.querySelectorAll(".play-only").forEach((el) => (el.hidden = !play));

  // Stop any video we just left (its sound with it)
  for (const [name, v] of Object.entries(videos)) if (name !== which) resetVideo(v);

  if (!play) {
    loadNote.hidden = true;
    clearInterval(loadWatcher);
    syncPause(); // silence and freeze the game while a video shows
  } else {
    inView = visibleFraction() >= 0.2;
    if (!frame.getAttribute("src")) loadGame(false);
    else if (needsReload) { gameHook = null; loadGame(true); }
    else syncPause();
    watchLoading();
  }
}

// ---- Sound: mute / unmute --------------------------------------------------
// The game page is same-origin, so when it loads we wrap its audio (Web Audio and
// <audio>/<video> elements) so the page can switch everything off with one button.
let muted = false;
const masters = new Set(); // master gain nodes, one per AudioContext the game creates
const mediaEls = new Map(); // media element -> its original muted state
const contexts = new Set(); // every AudioContext the game creates (so they can be suspended)
const resumeMedia = new Set(); // media elements we paused, to restart on return
let gameHook = null; // controls for the game page currently in the frame: { setPaused(bool) }
let inView = true; // is the game window on screen (not scrolled away)?

// How much of the game window is on screen right now (0 to 1).
function visibleFraction(el = panelPlay) {
  const r = el.getBoundingClientRect();
  if (!r.height) return 0;
  const shown = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
  return Math.max(0, shown) / r.height;
}

// The game runs only while the Play tab is showing AND the window is on screen.
function syncPause() {
  if (gameHook) gameHook.setPaused(panelPlay.hidden || !inView);
}

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

function hookGame(win) {
  if (win.__gameHook) return win.__gameHook;

  // A fresh game page: forget anything left over from a previous one.
  masters.clear();
  mediaEls.clear();
  contexts.clear();
  resumeMedia.clear();

  // Audio: route each AudioContext through a master volume node we control.
  for (const name of ["AudioContext", "webkitAudioContext"]) {
    const Orig = win[name];
    if (!Orig) continue;
    win[name] = class extends Orig {
      constructor(...args) {
        super(...args);
        contexts.add(this);
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

  // <audio>/<video> elements (the tutorial videos): remember them and honour mute.
  const proto = win.HTMLMediaElement && win.HTMLMediaElement.prototype;
  if (proto) {
    const origPlay = proto.play;
    proto.play = function (...args) {
      if (!mediaEls.has(this)) mediaEls.set(this, this.muted);
      if (muted) this.muted = true;
      return origPlay.apply(this, args);
    };
  }

  // Pausing: hold back the game's animation-frame loop while the window is hidden.
  let paused = false;
  let fakeId = 1e9;
  const queued = []; // [id, callback] waiting for resume
  const origRAF = win.requestAnimationFrame.bind(win);
  const origCancel = win.cancelAnimationFrame.bind(win);
  win.requestAnimationFrame = (cb) => {
    if (!paused) return origRAF(cb);
    queued.push([++fakeId, cb]);
    return fakeId;
  };
  win.cancelAnimationFrame = (id) => {
    const i = queued.findIndex((q) => q[0] === id);
    if (i >= 0) queued.splice(i, 1);
    else origCancel(id);
  };

  const hook = {
    setPaused(p) {
      if (p === paused) return;
      paused = p;
      if (p) {
        contexts.forEach((c) => { try { if (c.state === "running") c.suspend(); } catch { /* ignore */ } });
        mediaEls.forEach((_, el) => {
          try { if (!el.paused) { el.pause(); resumeMedia.add(el); } } catch { /* ignore */ }
        });
      } else {
        contexts.forEach((c) => { try { c.resume(); } catch { /* ignore */ } });
        resumeMedia.forEach((el) => { try { el.play(); } catch { /* ignore */ } });
        resumeMedia.clear();
        queued.splice(0).forEach(([, cb]) => origRAF(cb));
      }
    },
  };
  win.__gameHook = hook;
  return hook;
}

muteBtn.addEventListener("click", () => {
  muted = !muted;
  applyMute();
});

// ---- Fit the game into the page's window -----------------------------------
// Fit Unity's canvas inside the page's game window (keeps the shape the build was exported
// with, 16:9 or portrait, and hides Unity's footer). Done here so re-exporting the build
// from Unity doesn't undo it.
frame.addEventListener("load", () => {
  try {
    const win = frame.contentWindow;
    const doc = frame.contentDocument;
    if (!doc || !doc.querySelector("#unity-canvas")) return;
    hadFocus = false;
    focusNote.hidden = true;
    win.addEventListener("focus", checkFocus);
    win.addEventListener("blur", checkFocus);
    gameHook = hookGame(win);
    syncPause();
    const canvas = doc.querySelector("#unity-canvas");
    const ratio = canvas.width && canvas.height ? canvas.width / canvas.height : 16 / 9;
    const style = doc.createElement("style");
    style.textContent = `
      html, body { height: 100%; margin: 0; overflow: hidden; background: #000; }
      body { display: flex; align-items: center; justify-content: center; }
      #unity-container.unity-desktop { position: static !important; transform: none !important; left: auto !important; top: auto !important; }
      #unity-canvas { display: block; width: min(100vw, ${ratio * 100}vh) !important; height: min(${100 / ratio}vw, 100vh) !important; }
      #unity-footer { display: none !important; }
      html.fill #unity-canvas { width: 100vw !important; height: 100vh !important; }`;
    doc.head.appendChild(style);
    syncFill();
  } catch {
    /* cross-origin or not loaded: leave the build as exported */
  }
});

// Pause the game when it is scrolled out of view; resume when it comes back.
function onViewChange() {
  for (const v of Object.values(videos)) {
    if (!v.panel.hidden && v.frame && visibleFraction(v.panel) < 0.2) pauseVideo(v);
  }
  if (panelPlay.hidden) return; // the Trailer tab handles pausing on its own
  const nowInView = visibleFraction() >= 0.2;
  if (nowInView === inView) return;
  inView = nowInView;
  syncPause();
}
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(onViewChange, { threshold: [0, 0.2, 0.5] });
  [panelPlay, panelTrailer, panelGameplay].forEach((panel) => panel && io.observe(panel));
}
addEventListener("scroll", onViewChange, { passive: true });
addEventListener("resize", onViewChange);

if (tabTrailer) tabTrailer.addEventListener("click", () => show("trailer"));
if (tabGameplay) tabGameplay.addEventListener("click", () => show("gameplay"));
tabPlay.addEventListener("click", () => show("play"));
// Fullscreen the whole game window from this page's own click. This avoids Unity's
// internal fullscreen code, which doesn't cope well with running inside an iframe.
// Where the browser won't grant real fullscreen (some embedded browsers just ignore the
// request), the window is stretched over the page instead, with its own Exit button.
const fsLabel = fsBtn.textContent;
const fsExit = document.createElement("button");
fsExit.type = "button";
fsExit.className = "fs-exit";
fsExit.textContent = "Exit fullscreen ⤡";
fsExit.hidden = true;
panelPlay.appendChild(fsExit);

let coverFs = false;
function setCoverFs(on) {
  coverFs = on;
  panelPlay.classList.toggle("cover-fullscreen", on);
  document.body.classList.toggle("no-scroll", on);
  fsExit.hidden = !on;
  fsBtn.textContent = on ? "Exit fullscreen ⤡" : fsLabel;
  syncFill();
}
// On phones, fullscreen lets the game fill the whole screen (as it does on itch.io)
// instead of keeping its exported shape with bars around it.
function syncFill() {
  const on = isMobile && (document.fullscreenElement === panelPlay || coverFs);
  try {
    frame.contentDocument.documentElement.classList.toggle("fill", on);
  } catch { /* frame not ready */ }
}
document.addEventListener("fullscreenchange", syncFill);
function exitFs() {
  if (document.fullscreenElement) document.exitFullscreen();
  if (coverFs) setCoverFs(false);
}
fsBtn.addEventListener("click", () => {
  if (document.fullscreenElement || coverFs) {
    exitFs();
    return;
  }
  const request = panelPlay.requestFullscreen ? panelPlay.requestFullscreen() : null;
  // No answer (or a refusal) within a moment: use the page-cover version instead.
  const fallback = setTimeout(() => !document.fullscreenElement && setCoverFs(true), 400);
  document.addEventListener("fullscreenchange", () => clearTimeout(fallback), { once: true });
  if (request && request.catch) request.catch(() => { clearTimeout(fallback); setCoverFs(true); });
  else if (!request) { clearTimeout(fallback); setCoverFs(true); }
});
fsExit.addEventListener("click", exitFs);
addEventListener("keydown", (e) => e.key === "Escape" && coverFs && setCoverFs(false));

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
