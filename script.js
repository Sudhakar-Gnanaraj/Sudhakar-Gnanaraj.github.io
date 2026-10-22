const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Give each project thumbnail its own hue
document.querySelectorAll(".card").forEach((card) => {
  card.querySelector(".thumb").style.setProperty("--h", card.dataset.hue);
});

// Fade through the roles in the headline; Game Designer is first (marked .active in the HTML)
const roles = document.querySelectorAll(".roles em");
if (roles.length && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let i = 0;
  setInterval(() => {
    roles[i].classList.remove("active");
    i = (i + 1) % roles.length;
    roles[i].classList.add("active");
  }, 2600);
}
