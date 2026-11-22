// The studio's API, from its pages.

export const api = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init);
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(body.error ?? `${response.status} ${response.statusText}`);
  return body as T;
};

export const send = <T>(url: string, method: string, value: unknown) =>
  api<T>(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
