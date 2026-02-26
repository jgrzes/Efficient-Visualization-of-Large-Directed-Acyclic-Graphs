import type { Graph } from "@cosmograph/cosmos";
import type { GraphColors } from "../types";
import { COLOR_DEFAULT_LINK, hexToRgba01 } from "../utils/color";

export const applyGraphColors = (args: {
  g: Graph;
  links: Float32Array;
  colors: GraphColors;
  size: number;

  selectedIndices: number[];
  parents: number[];
  children: number[];

  searchSet: Set<number>;
  hoveredCardIndex: number | null;
  focusMode?: "off" | "on";
  focusedNodeIndices?: Set<number>;
}): number[] => {
  const {
    g,
    links,
    colors,
    size,
    selectedIndices,
    parents,
    children,
    searchSet,
    hoveredCardIndex,
    focusMode = "off",
    focusedNodeIndices = new Set(),
  } = args;

  const alphaMultiplier = focusMode === "on" ? 0.2 : 1.0;

  const positions = g.getPointPositions();
  if (!positions || positions.length === 0) return [];

  const pointCount = positions.length / 2;
  const linkCount = links.length / 2;

  const DEFAULT_POINT = hexToRgba01(colors.default, 0.9 * alphaMultiplier);
  const SELECTED_POINT = hexToRgba01(colors.selected, 0.9);
  const PARENT_POINT = hexToRgba01(colors.parent, 0.9);
  const CHILD_POINT = hexToRgba01(colors.child, 0.9);
  const HOVER_POINT = hexToRgba01(colors.hover, 0.95);
  const SEARCH_POINT = hexToRgba01(colors.search, 0.9 * alphaMultiplier);

  const DEFAULT_POINT_SOLID = hexToRgba01(colors.default, 1.0);
  const SELECTED_POINT_SOLID = hexToRgba01(colors.selected, 1.0);
  const PARENT_POINT_SOLID = hexToRgba01(colors.parent, 1.0);
  const CHILD_POINT_SOLID = hexToRgba01(colors.child, 1.0);
  const HOVER_POINT_SOLID = hexToRgba01(colors.hover, 1.0);
  const SEARCH_POINT_SOLID = hexToRgba01(colors.search, 1.0);

  const pointColors = new Float32Array(pointCount * 4);
  const linkColors = new Float32Array(linkCount * 4);
  const linkWidths = new Float32Array(linkCount);

  const pointSizes = new Float32Array(pointCount);

  const selectedSet = new Set<number>(selectedIndices);
  const parentsSet = new Set<number>(parents);
  const childrenSet = new Set<number>(children);

  const FOCUSED_LINK = hexToRgba01(colors.default, 1.0);
  const PARENT_LINK_SOLID = hexToRgba01(colors.parent, 1.0);
  const CHILD_LINK_SOLID = hexToRgba01(colors.child, 1.0);

  // Links
  for (let i = 0; i < links.length; i += 2) {
    const edgeIndex = i / 2;
    const source = links[i];
    const target = links[i + 1];

    let color = hexToRgba01(colors.default, 0.3 * alphaMultiplier);
    let width = 2;

    let isRelated = false;
    if (selectedSet.size > 0) {
      if (selectedSet.has(target)) {
        color = PARENT_POINT;
        width = 3;
        isRelated = true;
      } else if (selectedSet.has(source)) {
        color = CHILD_POINT;
        width = 3;
        isRelated = true;
      }
    }

    if (focusedNodeIndices.has(source) || focusedNodeIndices.has(target)) {
      if (isRelated) {
        color = selectedSet.has(target) ? PARENT_LINK_SOLID : CHILD_LINK_SOLID;
      } else {
        color = FOCUSED_LINK;
      }
      width = Math.max(width, 3);
    }

    linkColors.set(color, edgeIndex * 4);
    linkWidths[edgeIndex] = width;
  }

  // Points priority: hoveredCard > selected > parent > child > searched > default
  for (let i = 0; i < pointCount; i++) {
    let color = DEFAULT_POINT;
    let pointSize = size;
    const isFocused = focusedNodeIndices.has(i);

    if (hoveredCardIndex != null && hoveredCardIndex === i) {
      color = isFocused ? HOVER_POINT_SOLID : HOVER_POINT;
      pointSize = size * 1.75;
    } else if (selectedSet.has(i)) {
      color = isFocused ? SELECTED_POINT_SOLID : SELECTED_POINT;
    } else if (parentsSet.has(i)) {
      color = isFocused ? PARENT_POINT_SOLID : PARENT_POINT;
    } else if (childrenSet.has(i)) {
      color = isFocused ? CHILD_POINT_SOLID : CHILD_POINT;
    } else if (searchSet.has(i)) {
      color = isFocused ? SEARCH_POINT_SOLID : SEARCH_POINT;
      pointSize = size * 1.5;
    } else if (isFocused) {
      color = DEFAULT_POINT_SOLID;
    }

    if (isFocused) {
      pointSize = Math.max(pointSize, size * 1.5);
    }

    pointColors.set(color, i * 4);
    pointSizes[i] = pointSize;
  }

  g.setPointColors(pointColors);
  g.setPointSizes(pointSizes);
  g.setLinkColors(linkColors);
  g.setLinkWidths(linkWidths);

  return Array.from(new Set<number>([...selectedIndices, ...parents, ...children]));
};
