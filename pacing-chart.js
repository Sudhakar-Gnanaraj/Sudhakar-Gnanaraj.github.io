// Pacing graph for the Level design section (Chart.js 4.4.1, loaded from cdnjs on the page).
(function () {
  const canvas = document.getElementById("pacing");
  if (!canvas || typeof Chart === "undefined") return;

  const C = {
    novelty: "#66c0f4",
    intensity: "#e6edf3",
    tension: "#a4d007",
    grid: "rgba(255, 255, 255, 0.08)",
    muted: "#8f98a0",
    band: "rgba(102, 192, 244, 0.06)",
    divider: "rgba(255, 255, 255, 0.2)",
    label: "#c6d4df",
    surface: "#18222f",
  };

  const narrow = () => canvas.parentElement.clientWidth < 560;
  const cycles = [
    { a: 0, b: 3, long: "Cycle 1", short: "Cycle 1" },
    { a: 4, b: 7, long: "Cycle 2: health reset, armor", short: "Cycle 2" },
    { a: 8, b: 11, long: "Cycle 3: health reset, shields", short: "Cycle 3" },
  ];

  // Shaded bands, dashed dividers and a label for each 4-level cycle
  const bands = {
    id: "bands",
    beforeDatasetsDraw(chart) {
      const { ctx, chartArea: ca, scales: { x } } = chart;
      const w = x.getPixelForValue(1) - x.getPixelForValue(0);
      cycles.forEach((c, k) => {
        const x0 = Math.max(ca.left, x.getPixelForValue(c.a) - w / 2);
        const x1 = Math.min(ca.right, x.getPixelForValue(c.b) + w / 2);
        if (k % 2 === 0) {
          ctx.fillStyle = C.band;
          ctx.fillRect(x0, ca.top, x1 - x0, ca.bottom - ca.top);
        }
        if (k > 0) {
          ctx.save();
          ctx.strokeStyle = C.divider;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(x0, ca.top);
          ctx.lineTo(x0, ca.bottom);
          ctx.stroke();
          ctx.restore();
        }
        ctx.fillStyle = C.label;
        ctx.font = "12px Inter, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(narrow() ? c.short : c.long, x0 + 6, ca.top + 14);
      });
    },
  };

  const line = (label, data, color, dash) => ({
    label,
    data,
    borderColor: color,
    backgroundColor: color,
    borderWidth: 2,
    borderDash: dash,
    tension: 0.35,
    pointRadius: 4,
    pointHoverRadius: 6,
    pointBorderColor: C.surface,
    pointBorderWidth: 2,
    borderCapStyle: "round",
    borderJoinStyle: "round",
  });

  new Chart(canvas, {
    type: "line",
    plugins: [bands],
    data: {
      labels: ["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9", "L10", "L11", "L12"],
      datasets: [
        line("Novelty", [9, 5, 5.5, 4, 9, 5.5, 6, 4.5, 9, 6, 6.5, 5], C.novelty, []),
        line("Intensity", [3, 5, 7, 4, 3.5, 6, 8, 5, 4.5, 7, 9, 6], C.intensity, [6, 3]),
        line("Tension", [2, 3, 5, 8, 2.5, 4, 6, 9, 3, 5, 7, 10], C.tension, [2, 3]),
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      layout: { padding: { top: 4 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#171a21",
          borderColor: "rgba(102, 192, 244, 0.35)",
          borderWidth: 1,
          titleColor: "#fff",
          bodyColor: C.label,
          callbacks: {
            title: (items) => "Level " + (items[0].dataIndex + 1),
            label: (item) => " " + item.dataset.label + ": " + item.parsed.y,
          },
        },
      },
      scales: {
        y: {
          min: 0,
          max: 11,
          ticks: { stepSize: 2, color: C.muted, font: { size: 11 } },
          grid: { color: C.grid },
          border: { display: false },
          title: { display: true, text: "Relative level (0–10)", color: C.muted, font: { size: 11 } },
        },
        x: {
          ticks: { color: C.muted, font: { size: 11 }, autoSkip: false },
          grid: { display: false },
          border: { color: C.divider },
        },
      },
    },
  });
})();
