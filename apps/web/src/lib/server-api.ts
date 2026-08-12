import { cookies } from "next/headers";

import { API_BASE_URL, ApiError } from "./api";

function messageFromPayload(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as Record<string, unknown>;
  if (typeof record.message === "string") return record.message;
  if (typeof record.error === "string") return record.error;
  if (record.error && typeof record.error === "object") {
    const nested = record.error as Record<string, unknown>;
    if (typeof nested.message === "string") return nested.message;
  }
  return fallback;
}

export async function serverApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = (await cookies()).get("testpilot_token")?.value;
  const clean = path.replace(/^\/+/, "");
  const apiPath = clean.startsWith("api/v1/") ? clean : `api/v1/${clean}`;
  const response = await fetch(`${API_BASE_URL}/${apiPath}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
    cache: "no-store",
  });
  const contentType = response.headers.get("content-type") ?? "";
  const payload: unknown = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new ApiError(
      messageFromPayload(payload, `Request failed (${response.status})`),
      response.status,
      payload,
    );
  }
  return payload as T;
}
