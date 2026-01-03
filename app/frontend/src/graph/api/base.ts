export const API_BASE = "http://localhost:30301";

export type ApiError = {
  message: string;
  status: number;
};

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body?.error && typeof body.error === "string") return body.error;
    if (body?.message && typeof body.message === "string") return body.message;
  } catch {
    // ignore
  }
  return `HTTP ${res.status}`;
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new Error(msg);
  }
  return (await res.json()) as T;
}
