const API_BASE = "http://localhost:30301";

export const fetchNodeData = async (uuid: string, index: number) => {
  const response = await fetch(`${API_BASE}/node/${uuid}/${index}`);

  if (!response.ok) {
    throw new Error(`Node fetch failed: ${response.status}`);
  }

  const json = await response.json();
  console.log("Node info json:\n", JSON.stringify(json, null, 2));
  return json;
};
