import type { RGBA } from "../types";

export const hexToRgba01 = (hex: string, alpha = 0.9): RGBA => {
  let h = hex.trim();
  if (h.startsWith("#")) h = h.slice(1);

  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    return [r / 255, g / 255, b / 255, alpha];
  }

  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return [r / 255, g / 255, b / 255, alpha];
  }

  return [1, 1, 1, alpha];
};

export const COLOR_DEFAULT_LINK: RGBA = [0.5, 0.5, 0.5, 1.0];
