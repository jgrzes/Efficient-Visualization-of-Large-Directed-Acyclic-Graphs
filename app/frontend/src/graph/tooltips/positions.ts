import type { Graph } from "@cosmograph/cosmos";

export type NodeTooltip = {
  index: number;
  x: number;
  y: number;
  content: string;
};

export const computePinnedTooltips = (
  g: Graph,
  el: HTMLDivElement,
  indices: number[],
  getName: (idx: number) => string
): NodeTooltip[] => {
  if (!indices.length) return [];

  const positions = g.getPointPositions();
  if (!positions || positions.length === 0) return [];

  const rect = el.getBoundingClientRect();
  const next: NodeTooltip[] = [];

  for (const idx of indices) {
    if (idx < 0 || idx * 2 + 1 >= positions.length) continue;

    const xSpace = positions[2 * idx];
    const ySpace = positions[2 * idx + 1];

    const [sx, sy] = g.spaceToScreenPosition([xSpace, ySpace]);

    next.push({
      index: idx,
      x: rect.left + sx - 30,
      y: rect.top + sy - 30,
      content: getName(idx),
    });
  }

  return next;
};

export const computeHoverTooltip = (
  g: Graph,
  el: HTMLDivElement,
  index: number,
  getName: (idx: number) => string,
  pointPos?: [number, number]
): NodeTooltip | null => {
  let spacePos: [number, number];

  if (pointPos) {
    spacePos = pointPos;
  } else {
    const positions = g.getPointPositions();
    if (!positions || index * 2 + 1 >= positions.length) return null;
    spacePos = [positions[2 * index], positions[2 * index + 1]];
  }

  const [sx, sy] = g.spaceToScreenPosition(spacePos);
  const rect = el.getBoundingClientRect();

  return {
    index,
    content: getName(index),
    x: rect.left + sx + 8,
    y: rect.top + sy + 8,
  };
};
