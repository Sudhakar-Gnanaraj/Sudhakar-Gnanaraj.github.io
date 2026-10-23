// About section: hovering, focusing or tapping a floating skill shows that skill's illustration
// and its note in one fixed spot below. The last skill chosen stays shown; Game Design is
// shown to start with.
(() => {
  const note = document.getElementById("skill-note");
  const stage = document.querySelector(".about-stage");
  if (!note || !stage) return;
  const skills = [...stage.querySelectorAll(".skill")];
  const art = [...stage.querySelectorAll(".skill-art")];

  function show(li) {
    const btn = li.querySelector("button");
    skills.forEach((s) => s.classList.toggle("active", s === li));
    art.forEach((img) => img.classList.toggle("is-active", img.dataset.art === btn.dataset.art));
    note.textContent = btn.dataset.note;
  }

  skills.forEach((li) => {
    const btn = li.querySelector("button");
    li.addEventListener("mouseenter", () => show(li));
    btn.addEventListener("focus", () => show(li));
    btn.addEventListener("click", () => show(li));
  });
  show(skills.find((li) => li.querySelector("[data-default]")) || skills[0]);

  // Fetch the other illustrations once the section is near, so switching is instant
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      art.forEach((img) => { img.loading = "eager"; });
    }, { rootMargin: "400px" });
    io.observe(stage);
  }
})();
