export async function fetchJson(input: RequestInfo | URL, init?: RequestInit) {
  const res = await fetch(input, init);
  const text = await res.text();
  let data: any;
  try { data = text ? JSON.parse(text) : {}; } catch { data = text; }
  if (!res.ok) {
    const message = (data && data.error) ? data.error : data;
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }
  return data;
}
