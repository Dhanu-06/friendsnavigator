export async function fetchJson(input: RequestInfo | URL, init?: RequestInit) {
  const res = await fetch(input, init);
  const text = await res.text();
  let data: any;
  try { data = text ? JSON.parse(text) : {}; } catch { data = text; }
  // Unlike the original, we will return the data and ok status, not throw
  return { ok: res.ok, status: res.status, data };
}
