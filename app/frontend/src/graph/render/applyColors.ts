import type { Graph } from "@cosmograph/cosmos";
import type { GraphColors } from "../types";
import { COLOR_DEFAULT_LINK, hexToRgba01 } from "../utils/color";

export const applyGraphColors = (args: {
  g: Graph;
  links: Float32Array;
  colors: GraphColors;

  selectedIndices: number[];
  parents: number[];
  children: number[];

  searchSet: Set<number>;
  hoveredCardIndex: number | null;
}): number[] => {
  const {
    g,
    links,
    colors,
    selectedIndices,
    parents,
    children,
    searchSet,
    hoveredCardIndex,
  } = args;

  const positions = g.getPointPositions();
  if (!positions || positions.length === 0) return [];

  const pointCount = positions.length / 2;
  const linkCount = links.length / 2;

  const DEFAULT_POINT = hexToRgba01(colors.default, 0.9);
  const SELECTED_POINT = hexToRgba01(colors.selected, 0.9);
  const PARENT_POINT = hexToRgba01(colors.parent, 0.9);
  const CHILD_POINT = hexToRgba01(colors.child, 0.9);
  const HOVER_POINT = hexToRgba01(colors.hover, 0.95);
  const SEARCH_POINT = hexToRgba01(colors.search, 0.9);

  const pointColors = new Float32Array(pointCount * 4);
  const linkColors = new Float32Array(linkCount * 4);
  const linkWidths = new Float32Array(linkCount);

  const selectedSet = new Set<number>(selectedIndices);
  const parentsSet = new Set<number>(parents);
  const childrenSet = new Set<number>(children);

  // Links
  for (let i = 0; i < links.length; i += 2) {
    const edgeIndex = i / 2;
    const source = links[i];
    const target = links[i + 1];

    let color = COLOR_DEFAULT_LINK;
    let width = 2;

    if (selectedSet.size > 0) {
      if (selectedSet.has(target)) {
        color = PARENT_POINT;
        width = 3;
      } else if (selectedSet.has(source)) {
        color = CHILD_POINT;
        width = 3;
      }
    }

    linkColors.set(color, edgeIndex * 4);
    linkWidths[edgeIndex] = width;
  }

  // Points priority: hoveredCard > selected > parent > child > searched > default
  for (let i = 0; i < pointCount; i++) {
    let color = DEFAULT_POINT;

    if (hoveredCardIndex != null && hoveredCardIndex === i) color = HOVER_POINT;
    else if (selectedSet.has(i)) color = SELECTED_POINT;
    else if (parentsSet.has(i)) color = PARENT_POINT;
    else if (childrenSet.has(i)) color = CHILD_POINT;
    else if (searchSet.has(i)) color = SEARCH_POINT;

    pointColors.set(color, i * 4);
  }

  g.setPointColors(pointColors);
  g.setLinkColors(linkColors);
  g.setLinkWidths(linkWidths);

  return Array.from(new Set<number>([...selectedIndices, ...parents, ...children]));
};
