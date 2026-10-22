// About section: hovering, focusing or tapping a floating skill shows its note in one fixed
// spot below the photo. The note stays on the last skill chosen; Game Design is shown to start with.
(() => {
  const note = document.getElementById("skill-note");
  const stage = document.querySelector(".about-stage");
  if (!note || !stage) return;
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
})();
