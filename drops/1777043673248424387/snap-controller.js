(function () {
  "use strict";

  const grid = document.getElementById("snap-grid");
  const cells = Array.from(document.querySelectorAll(".snap-cell"));
  const snapper = document.getElementById("snapper");
  let index = 4;

  function snapTo(nextIndex) {
    index = (nextIndex + cells.length) % cells.length;
    const cell = cells[index];
    const gridRect = grid.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    const x = cellRect.left - gridRect.left + cellRect.width / 2;
    const y = cellRect.top - gridRect.top + cellRect.height / 2;

    cells.forEach((node) => node.classList.remove("snapped", "snap-animating"));
    cell.classList.add("snapped", "snap-animating");
    snapper.style.transform = `translate(${x}px, ${y}px)`;
    window.setTimeout(() => cell.classList.remove("snap-animating"), 160);
  }

  cells.forEach((cell, i) => {
    cell.addEventListener("click", () => snapTo(i));
    cell.setAttribute("tabindex", "0");
    cell.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") snapTo(i);
    });
  });

  window.addEventListener("keydown", (event) => {
    const x = Number(cells[index].dataset.gridX);
    const y = Number(cells[index].dataset.gridY);
    if (event.key === "ArrowRight") snapTo(y * 3 + Math.min(2, x + 1));
    if (event.key === "ArrowLeft") snapTo(y * 3 + Math.max(0, x - 1));
    if (event.key === "ArrowDown") snapTo(Math.min(2, y + 1) * 3 + x);
    if (event.key === "ArrowUp") snapTo(Math.max(0, y - 1) * 3 + x);
  });

  window.addEventListener("resize", () => snapTo(index));
  snapTo(index);
})();
