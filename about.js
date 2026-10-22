// About section.
// - Hovering, focusing or tapping a floating skill shows its note in one fixed spot below the
//   photo. The note stays on the last skill chosen; Game Design is shown to start with.
// - The photo turns slightly left or right towards the mouse while it is anywhere in the
//   About section.
(() => {
  const note = document.getElementById("skill-note");
  const stage = document.querySelector(".about-stage");
  if (!note || !stage) return;
  const photo = stage.querySelector(".about-photo");
  const skills = [...stage.querySelectorAll(".skill")];

  function show(li) {
    skills.forEach((s) => s.classList.toggle("active", s === li));
    note.textContent = li.querySelector("button").dataset.note;
  }

  skills.forEach((li) => {
    const btn = li.querySelector("button");
    li.addEventListener("mouseenter", () => show(li));
    btn.addEventListener("focus", () => show(li));
    btn.addEventListener("click", () => show(li));
  });
  show(skills.find((li) => li.querySelector("[data-default]")) || skills[0]);

  // Photo tilt (mouse only, and not for people who prefer reduced motion)
  const section = stage.closest(".panel-section") || stage;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  section.addEventListener("pointermove", (e) => {
    // Left and right only
    const p = photo.getBoundingClientRect();
    const s = section.getBoundingClientRect();
    const x = (e.clientX - (p.left + p.width / 2)) / (s.width / 2);
    photo.style.setProperty("--ry", (Math.max(-1, Math.min(1, x)) * 4).toFixed(2) + "deg");
  });
  section.addEventListener("pointerleave", () => photo.style.setProperty("--ry", "0deg"));
})();
