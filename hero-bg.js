// Home-page hero background: a slow starfield. Stars near the cursor (or a tap) brighten and
// link up like a constellation; a click sends out a small burst. Pauses when the hero is off
// screen, and draws a still frame for people who prefer reduced motion.
(() => {
  const hero = document.querySelector(".hero");
  if (!hero) return;

  const canvas = document.createElement("canvas");
  canvas.className = "hero-bg";
  canvas.setAttribute("aria-hidden", "true");
  hero.prepend(canvas);
  const ctx = canvas.getContext("2d");

  const STAR = [122, 162, 255]; // --accent
  const rgba = (a) => `rgba(${STAR[0]},${STAR[1]},${STAR[2]},${a})`;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const REACH = 180; // how far from the cursor stars respond
  const LINK = 130;  // longest constellation line

  let W = 0, H = 0;
  let stars = [];
  const sparks = [];
  const pointer = { x: -1e4, y: -1e4 };
  const rand = (a, b) => a + Math.random() * (b - a);

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const r = hero.getBoundingClientRect();
    if (Math.round(r.width) === W && Math.abs(r.height - H) < 120 && stars.length) return; // ignore mobile toolbar resizes
    W = Math.round(r.width); H = Math.round(r.height);
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.round((W * H) / 7000) }, () => ({
      x: rand(0, W), y: rand(0, H), vx: rand(-0.06, 0.06), vy: rand(-0.04, 0.04),
      r: rand(0.5, 1.5), tw: rand(0, Math.PI * 2),
    }));
    if (reduceMotion) draw(0);
  }

  function local(e) {
    const r = hero.getBoundingClientRect();
    pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top;
  }
  hero.addEventListener("pointermove", local);
  hero.addEventListener("pointerleave", () => { pointer.x = pointer.y = -1e4; });
  hero.addEventListener("pointerdown", (e) => {
    local(e);
    if (reduceMotion) return;
    for (let i = 0; i < 18; i++) {
      const a = rand(0, Math.PI * 2), v = rand(0.8, 3);
      sparks.push({ x: pointer.x, y: pointer.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1 });
    }
  });

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    const near = [];
    for (const s of stars) {
      if (!reduceMotion) { s.x = (s.x + s.vx + W) % W; s.y = (s.y + s.vy + H) % H; }
      const d = Math.hypot(s.x - pointer.x, s.y - pointer.y);
      const glow = d < REACH ? 1 - d / REACH : 0;
      if (glow > 0) near.push([s, glow]);
      ctx.fillStyle = rgba(0.22 + 0.12 * Math.sin(t / 1100 + s.tw) + glow * 0.45);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r + glow, 0, Math.PI * 2); ctx.fill();
    }
    ctx.lineWidth = 1;
    for (let i = 0; i < near.length; i++) {
      for (let j = i + 1; j < near.length; j++) {
        const [a, ga] = near[i], [b, gb] = near[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < LINK) {
          ctx.strokeStyle = rgba(Math.min(ga, gb) * (1 - d / LINK) * 0.45);
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.x += p.vx; p.y += p.vy; p.vx *= 0.95; p.vy *= 0.95; p.life -= 0.025;
      if (p.life <= 0) { sparks.splice(i, 1); continue; }
      ctx.fillStyle = rgba(p.life * 0.6);
      ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
    }
  }

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hero);
  function loop(t) {
    if (visible && !document.hidden) draw(t);
    requestAnimationFrame(loop);
  }

  addEventListener("resize", resize);
  resize();
  if (!reduceMotion) requestAnimationFrame(loop);
})();
