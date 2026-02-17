import type { GraphColors } from "./types";

export const DEFAULT_BACKGROUND_BY_THEME = {
  light: "#ffffff",
  dark: "#000000",
} as const;

export const DEFAULT_GRAPH_COLORS: GraphColors = {
  default: "#6B7280",   // gray-500
  parent: "#EF4444",    // red-500
  child: "#22C55E",     // green-500
  selected: "#3B82F6",  // blue-500
  hover: "#F97316",   // orange-500
  search: "#FACC15",        // yellow-400
  background: typeof document !== "undefined" &&
  document.documentElement.classList.contains("dark")
  ? DEFAULT_BACKGROUND_BY_THEME.dark
  : DEFAULT_BACKGROUND_BY_THEME.light

};

export const DEFAULT_POINT_SIZE = 1;
