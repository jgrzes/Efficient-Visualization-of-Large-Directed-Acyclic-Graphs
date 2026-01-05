export type Pos = { x: number; y: number };

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function fmtPct(x?: number) {
  if (x === undefined || Number.isNaN(x)) return "-";
  return `${x.toFixed(1)}%`;
}

export function fmtNum(x?: number, digits = 2) {
  if (x === undefined || Number.isNaN(x)) return "-";
  return Number.isInteger(x) ? String(x) : x.toFixed(digits);
}

export function defaultVertexLabel(vertexId: number) {
  return `v${vertexId}`;
}
