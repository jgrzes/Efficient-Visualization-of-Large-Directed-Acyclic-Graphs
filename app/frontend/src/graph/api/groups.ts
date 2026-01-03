import { API_BASE, fetchJson } from "./base";

export type GroupInfo = {
  group_name: string;
  created_at?: string;
};

export type GraphListItem = {
  id: string;
  name?: string;
  num_of_vertices?: number;
  last_entry_update?: string;
};

export function getGroups() {
  return fetchJson<GroupInfo[]>(`${API_BASE}/groups`);
}

export function getGraphsInGroup(groupName: string, password: string) {
  return fetchJson<GraphListItem[]>(
    `${API_BASE}/groups/${encodeURIComponent(groupName)}/graphs`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    }
  );
}
