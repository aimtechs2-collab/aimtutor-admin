/* eslint-disable @typescript-eslint/no-explicit-any */

export type ApiResponse<T> = { data: T };

function buildError(data: any, fallback: string) {
  const err = new Error(data?.message ?? data?.error ?? fallback) as Error & {
    response: { data: any };
  };
  err.response = { data };
  return err;
}

export async function apiRequest<T>(
  method: string,
  url: string,
  body?: unknown,
): Promise<ApiResponse<T>> {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const res = await fetch(url, {
    method,
    headers: isForm ? undefined : body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: isForm ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({} as any));
  if (!res.ok) {
    throw buildError(data, "Request failed");
  }
  return { data };
}

export const api = {
  get: <T = any>(url: string) => apiRequest<T>("GET", url),
  post: <T = any>(url: string, body?: unknown) => apiRequest<T>("POST", url, body),
  put: <T = any>(url: string, body?: unknown) => apiRequest<T>("PUT", url, body),
  delete: <T = any>(url: string) => apiRequest<T>("DELETE", url),
};
