import { API_BASE, fetchJson } from "./base";
import type { CommentItem } from "../../hooks/useComments";

export type LoadedGraph = {
  graph_hash?: string;
  uuid: string;
  canvas_positions: number[];
  links: number[];
  names?: string[];
  meta?: Record<string, unknown>;
  config?: {
    point_size?: number;
    favorites?: number[];
    comments?: CommentItem[];
  };
};

export async function loadGraphByHash(hash: string) {
  return fetchJson<LoadedGraph>(`${API_BASE}/load_graph/${hash}`);
}

export async function exportGraph(uuid: string) {
  return fetchJson<any>(`${API_BASE}/export_graph/${uuid}`);
}

export async function analyzeGraph(uuid: string | null) {
  if (!uuid) throw new Error("No graph uuid");
  return fetchJson<any>(`${API_BASE}/analyze_graph/${uuid}`, { method: "POST" });
}

export async function loadGraphFromJson(file: File, layoutType: "cpp" | "radial") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("layout_type", layoutType);

  return fetchJson<LoadedGraph>(`${API_BASE}/load_graph_from_json`, {
    method: "POST",
    body: formData,
  });
}

export async function makeGraphStructure(
  file: File,
  rootNamespace: string,
  layoutType: "cpp" | "radial"
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("root", rootNamespace);
  formData.append("layout_type", layoutType);

  return fetchJson<LoadedGraph>(`${API_BASE}/flask_make_graph_structure`, {
    method: "POST",
    body: formData,
  });
}

export type SaveGraphBody = {
  canvas_positions: number[];
  links: number[];
  graph_hash: string | null;

  point_size: number | null;
  favorites: number[];
  comments: CommentItem[];

  default_color?: string;
  parent_color?: string;
  child_color?: string;
  selected_color?: string;
  hover_color?: string;
  search_color?: string;

  group_name?: string;
  group_password?: string;
};

export async function saveGraphToDb(uuid: string | null, body: SaveGraphBody) {
  if (!uuid) throw new Error("No graph uuid");
  return fetchJson<{ hash: string }>(`${API_BASE}/save_graph/${uuid}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function updateGraphConfig(hash: string, payload: any, signal?: AbortSignal) {
  return fetchJson<any>(`${API_BASE}/update_graph_config/${hash}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
}
