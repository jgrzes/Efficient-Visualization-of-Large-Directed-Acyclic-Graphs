import cosmosLib from "@cosmograph/cosmos/dist/index.min.js?raw";
import viewerScript from "./standaloneViewer.js?raw";
import { DEFAULT_BACKGROUND_BY_THEME, DEFAULT_GRAPH_COLORS } from "../config";

export type ExportGraphVertex = {
  index: number;
  N: number[];
  pos: [number, number];
  name?: string;
  [key: string]: unknown;
};

export type ExportGraphPayload = {
  name: string;
  num_of_vertices: number;
  vertices: ExportGraphVertex[];
  point_size?: number;
};

// Prevents embedded graph data (e.g. node names/properties) from breaking
// out of the inline <script> tag it's serialized into.
function escapeForInlineScript(json: string): string {
  return json.replace(/<\/(script)/gi, "<\\/$1").replace(/<!--/g, "<\\!--");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Small graphs read better with big, well-separated dots; dense ones need
// smaller points so the layout doesn't turn into a solid blob.
function defaultPointSizeFor(nodeCount: number, configuredSize?: number): number {
  const floor = nodeCount <= 300 ? 6 : nodeCount <= 3000 ? 4 : nodeCount <= 10000 ? 2.5 : 1.5;
  return Math.max(configuredSize || 0, floor);
}

export function buildStandaloneGraphHtml(payload: ExportGraphPayload): string {
  const vertices = payload.vertices ?? [];
  const n = vertices.length;

  const positions = new Array<number>(n * 2);
  const properties = new Array<Record<string, unknown>>(n);
  const links: number[] = [];

  for (const v of vertices) {
    const { index, N, pos, ...rest } = v;
    positions[index * 2] = pos[0];
    positions[index * 2 + 1] = pos[1];
    properties[index] = rest;
    for (const target of N) {
      links.push(index, target);
    }
  }

  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const theme: "light" | "dark" = isDark ? "dark" : "light";
  const background = DEFAULT_BACKGROUND_BY_THEME[theme];
  const pointSize = defaultPointSizeFor(n, payload.point_size);

  const graphData = {
    positions,
    links,
    properties,
    pointSize,
    pointColor: DEFAULT_GRAPH_COLORS.default,
    linkColor: "#9CA3AF",
    theme,
    background,
  };

  const title = payload.name || "Graph export";
  const dataScript = escapeForInlineScript(
    `window.__GRAPH_DATA__ = ${JSON.stringify(graphData)};`
  );

  const themeButtons = (["dark", "light"] as const)
    .map(
      (t) =>
        `<button type="button" data-theme-option="${t}" class="${t === theme ? "active" : ""}">${
          t === "dark" ? "Dark" : "Light"
        }</button>`
    )
    .join("");

  return `<!doctype html>
<html lang="en" data-theme="${theme}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
  :root {
    --bg: #0b0b0f;
    --panel-bg: rgba(20, 20, 24, 0.7);
    --panel-border: rgba(255, 255, 255, 0.08);
    --text: #f4f4f5;
    --muted: rgba(244, 244, 245, 0.65);
    --control-bg: rgba(255, 255, 255, 0.1);
    --control-bg-hover: rgba(255, 255, 255, 0.18);
    --control-active-border: #f4f4f5;
  }
  :root[data-theme="light"] {
    --bg: #ffffff;
    --panel-bg: rgba(255, 255, 255, 0.8);
    --panel-border: rgba(0, 0, 0, 0.08);
    --text: #111114;
    --muted: rgba(17, 17, 20, 0.6);
    --control-bg: rgba(0, 0, 0, 0.06);
    --control-bg-hover: rgba(0, 0, 0, 0.1);
    --control-active-border: #111114;
  }
  html, body { margin: 0; height: 100%; background: var(--bg); overflow: hidden; }
  #graph { position: fixed; inset: 0; }
  .panel {
    background: var(--panel-bg); color: var(--text);
    border: 1px solid var(--panel-border); border-radius: 12px;
    font: 13px/1.4 system-ui, sans-serif; backdrop-filter: blur(8px);
  }
  #panel { position: fixed; top: 12px; left: 12px; z-index: 10; width: 220px; padding: 12px 14px; }
  #panel h1 { font-size: 13px; font-weight: 600; margin: 0 0 4px; word-break: break-word; }
  #counts { color: var(--muted); font-size: 12px; margin-bottom: 10px; }
  .field { margin-top: 10px; }
  .field label {
    display: flex; justify-content: space-between; color: var(--muted);
    font-size: 11px; text-transform: uppercase; letter-spacing: 0.02em; margin-bottom: 5px;
  }
  input[type="range"] { width: 100%; accent-color: var(--control-active-border); }
  .btn-row { display: flex; gap: 6px; }
  .btn-row button {
    flex: 1; background: var(--control-bg); border: 1px solid transparent; color: var(--text);
    padding: 5px 8px; border-radius: 6px; cursor: pointer; font-size: 12px;
  }
  .btn-row button:hover { background: var(--control-bg-hover); }
  .btn-row button.active { border-color: var(--control-active-border); }
  #fit-view { width: 100%; }
  #tooltip {
    display: none; position: fixed; z-index: 20; pointer-events: none;
    background: var(--panel-bg); color: var(--text); padding: 4px 8px;
    border: 1px solid var(--panel-border); border-radius: 6px;
    font: 12px system-ui, sans-serif; max-width: 280px; backdrop-filter: blur(8px);
  }
  #node-info {
    position: fixed; top: 12px; right: 12px; z-index: 10; width: 260px;
    max-height: calc(100% - 24px); overflow-y: auto; padding: 12px 14px;
  }
  #node-info[hidden] { display: none; }
  .node-info-header {
    display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;
    margin-bottom: 8px;
  }
  #node-info-title { font-size: 13px; font-weight: 600; margin: 0; word-break: break-word; }
  #node-info-close {
    flex-shrink: 0; background: var(--control-bg); border: none; color: var(--text);
    width: 22px; height: 22px; border-radius: 6px; cursor: pointer; line-height: 1; font-size: 14px;
  }
  #node-info-close:hover { background: var(--control-bg-hover); }
  .prop-row { margin-top: 8px; }
  .prop-key { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.02em; }
  .prop-value { font-size: 12px; word-break: break-word; white-space: pre-wrap; }
  .empty-state {
    display: flex; align-items: center; justify-content: center;
    height: 100%; color: var(--muted); font: 14px system-ui, sans-serif;
  }
</style>
</head>
<body>
  <div id="graph"></div>
  <div id="panel" class="panel">
    <h1>${escapeHtml(title)}</h1>
    <div id="counts"></div>

    <div class="field">
      <div class="btn-row">
        <button id="fit-view" type="button">Fit view</button>
      </div>
    </div>

    <div class="field">
      <label>Point size <span id="point-size-value"></span></label>
      <input id="point-size" type="range" min="0.5" max="16" step="0.5" />
    </div>

    <div class="field">
      <label>Background</label>
      <div class="btn-row" id="theme-row">${themeButtons}</div>
    </div>
  </div>

  <div id="node-info" class="panel" hidden>
    <div class="node-info-header">
      <h2 id="node-info-title"></h2>
      <button id="node-info-close" type="button" aria-label="Close">&times;</button>
    </div>
    <div id="node-info-body"></div>
  </div>

  <div id="tooltip"></div>
  <script>${cosmosLib}</script>
  <script>${dataScript}</script>
  <script>${viewerScript}</script>
</body>
</html>`;
}
