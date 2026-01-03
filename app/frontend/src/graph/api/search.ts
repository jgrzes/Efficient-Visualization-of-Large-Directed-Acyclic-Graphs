import { API_BASE, fetchJson } from "./base";
import type { NodeInfoProps } from "../../components/leftsidebar/NodeInfo";

export type SearchFilter = {
  id: string;
  field: string;
  query: string;
};

export type SearchOptions = {
  matchCase: boolean;
  matchWords: boolean;
};

export async function searchNodes(
  graphUUID: string | null,
  filters: Array<Pick<SearchFilter, "field" | "query">>,
  options: SearchOptions
) {
  if (!graphUUID) throw new Error("No graph uuid");

  return fetchJson<NodeInfoProps[] | NodeInfoProps>(`${API_BASE}/search_node/${graphUUID}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filters,
      matchCase: options.matchCase,
      matchWords: options.matchWords,
    }),
  });
}
