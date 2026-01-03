import { API_BASE, fetchJson } from "./base";

export type NodeApiResponse = {
  name?: string;
  [key: string]: unknown;
};

export function fetchNodeData(uuid: string, index: number) {
  return fetchJson<NodeApiResponse>(
    `${API_BASE}/node/${uuid}/${index}`
  );
}
