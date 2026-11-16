import type { MacroSeries } from "./research-briefing";

export function chartHighlights(points: MacroSeries["points"]) {
  if (!points.length) return [];
  let min = 0, max = 0;
  points.forEach((p, i) => {
    if (p.value < points[min].value) min = i;
    if (p.value > points[max].value) max = i;
  });
  return [
    { label: "Mínimo", index: min, ...points[min] },
    { label: "Máximo", index: max, ...points[max] },
    { label: "Último", index: points.length - 1, ...points[points.length - 1] },
  ];
}

// Snap to a real observation, including when there are missing calendar dates.
export function nearestChartPoint(coordinates: { x: number }[], x: number) {
  if (!coordinates.length) return -1;
  let nearest = 0;
  coordinates.forEach((p, i) => {
    if (Math.abs(p.x - x) < Math.abs(coordinates[nearest].x - x)) nearest = i;
  });
  return nearest;
}
