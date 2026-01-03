import type { GraphColors } from "./types";

export const DEFAULT_BACKGROUND_BY_THEME = {
  light: "#ffffff",
  dark: "#000000",
} as const;

export const DEFAULT_GRAPH_COLORS: GraphColors = {
  default: "#6B7280",
  parent: "#EF4444",
  child: "#22C55E",
  selected: "#3B82F6",
  hover: "#A855F7",
  search: "#06B6D4",
  background: DEFAULT_BACKGROUND_BY_THEME.light,
};

export const DEFAULT_POINT_SIZE = 1;
