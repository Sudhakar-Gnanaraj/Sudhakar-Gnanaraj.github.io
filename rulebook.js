// Flip-through rule book. Wide screens show a two-page spread with 3D page turns;
// narrow screens show one page at a time. The pages come from the list in the HTML.
(function () {
  const root = document.getElementById("rulebook");
  if (!root) return;

  const pages = [...root.querySelectorAll(".rb-source li")].map((li) => ({ src: li.dataset.src, alt: li.dataset.alt }));
  const stage = root.querySelector(".rb-stage");
  const prev = root.querySelector(".rb-prev");
  const next = root.querySelector(".rb-next");
  const status = root.querySelector(".rb-status");
  const leafCount = pages.length / 2; // each leaf has a front page and a back page
  const narrow = matchMedia("(max-width: 700px)");

  const TURN_MS = 900; // matches the page-turn transition in the stylesheet

  let spread = 0; // two-page mode: how many leaves have been turned (0 .. leafCount)
  let single = 0; // one-page mode: index of the page being shown

  function img(page, eager) {
    const el = document.createElement("img");
    el.src = page.src;
    el.alt = page.alt;
    el.width = 994;
    el.height = 1406;
    el.draggable = false;
    if (!eager) el.loading = "lazy";
    return el;
  }

  // ---- Two-page mode ---------------------------------------------------------
  let leaves = [];
  function buildSpread() {
    stage.className = "rb-stage rb-double";
    stage.textContent = "";
    const book = document.createElement("div");
    book.className = "rb-book";
    leaves = [];
    for (let i = 0; i < leafCount; i++) {
      const leaf = document.createElement("div");
      leaf.className = "rb-leaf";
      const front = document.createElement("div");
      front.className = "rb-face rb-front";
      front.append(img(pages[2 * i], i === 0));
      const back = document.createElement("div");
      back.className = "rb-face rb-back";
      back.append(img(pages[2 * i + 1], i === 0));
      leaf.append(front, back);
      book.append(leaf);
      leaves.push(leaf);
    }
    stage.append(book);
    // Clicking the right page turns forward, the left page turns back
    book.addEventListener("click", (e) => {
      const rect = book.getBoundingClientRect();
      go(e.clientX < rect.left + rect.width / 2 ? -1 : 1);
    });
    renderSpread();
  }

  function renderSpread() {
    const book = stage.querySelector(".rb-book");
    leaves.forEach((leaf, i) => {
      const turned = i < spread;
      const resting = turned ? i + 1 : leafCount - i; // stacking order once the leaf has landed
      if (leaf.classList.contains("turned") !== turned) {
        // A turning leaf stays on top until it has landed, so the page under it isn't seen early
        leaf.style.zIndex = 100;
        clearTimeout(leaf.landing);
        leaf.landing = setTimeout(() => {
          leaf.style.zIndex = resting;
          leaf.landing = null;
        }, TURN_MS);
      } else if (!leaf.landing) {
        leaf.style.zIndex = resting;
      }
      leaf.classList.toggle("turned", turned);
    });
    // Centre the book while only one side of it is showing
    book.style.transform = spread === 0 ? "translateX(-25%)" : spread === leafCount ? "translateX(25%)" : "none";
    const left = spread === 0 ? null : 2 * spread - 1;
    const right = spread === leafCount ? null : 2 * spread;
    status.textContent =
      left === null ? "Cover" : right === null ? "Back cover" : "Pages " + (left + 1) + " and " + (right + 1) + " of " + pages.length;
    prev.disabled = spread === 0;
    next.disabled = spread === leafCount;
  }

  // ---- One-page mode ---------------------------------------------------------
  function buildSingle() {
    stage.className = "rb-stage rb-single";
    stage.textContent = "";
    const page = document.createElement("div");
    page.className = "rb-page";
    stage.append(page);
    page.addEventListener("click", (e) => {
      const rect = page.getBoundingClientRect();
      go(e.clientX < rect.left + rect.width / 2 ? -1 : 1);
    });
    renderSingle();
  }

  function renderSingle() {
    const page = stage.querySelector(".rb-page");
    page.classList.add("fade");
    setTimeout(() => {
      page.textContent = "";
      page.append(img(pages[single], true));
      page.classList.remove("fade");
    }, 120);
    status.textContent = "Page " + (single + 1) + " of " + pages.length;
    prev.disabled = single === 0;
    next.disabled = single === pages.length - 1;
  }

  // ---- Shared ----------------------------------------------------------------
  function go(step) {
    if (narrow.matches) {
      single = Math.min(pages.length - 1, Math.max(0, single + step));
      renderSingle();
    } else {
      spread = Math.min(leafCount, Math.max(0, spread + step));
      renderSpread();
    }
  }

  function build() {
    if (narrow.matches) {
      single = spread === 0 ? 0 : spread === leafCount ? pages.length - 1 : 2 * spread - 1;
      buildSingle();
    } else {
      spread = single === 0 ? 0 : single === pages.length - 1 ? leafCount : Math.ceil(single / 2);
      buildSpread();
    }
  }

  prev.addEventListener("click", () => go(-1));
  next.addEventListener("click", () => go(1));
  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") go(-1);
    else if (e.key === "ArrowRight") go(1);
    else return;
    e.preventDefault();
  });
  narrow.addEventListener("change", build);
  build();
})();
