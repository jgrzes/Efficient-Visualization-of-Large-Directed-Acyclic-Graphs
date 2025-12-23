// import type { GraphColors } from "./components/SettingsModal";

// export const DEFAULT_GRAPH_COLORS: GraphColors = {
//   // neutral gray (nodes)
//   default: "#6B7280", // gray-500

//   // hierarchy
//   parent: "#EF4444",  // red-500
//   child: "#22C55E",   // green-500

//   // interaction
//   selected: "#3B82F6", // blue-500
//   hover: "#A855F7",    // purple-500
//   search: "#06B6D4",   // cyan-500

//   background: "#000000", // black
// };

// export const DEFAULT_POINT_SIZE = 1;


import type { GraphColors } from "./components/SettingsModal";

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
  // bazowy fallback
  background: DEFAULT_BACKGROUND_BY_THEME.dark,
};

export const DEFAULT_POINT_SIZE = 1;
