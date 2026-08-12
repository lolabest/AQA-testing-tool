export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

function apiPath(path: string): string {
  const clean = path.replace(/^\/+/, "");
  return clean.startsWith("api/v1/") ? clean : `api/v1/${clean}`;
}

function messageFromPayload(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const candidate = payload as Record<string, unknown>;
  const message = candidate.message ?? candidate.error;
  if (typeof message === "string") return message;
  if (message && typeof message === "object") {
    const nested = message as Record<string, unknown>;
    if (typeof nested.message === "string") return nested.message;
  }
  return fallback;
}

export async function api<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`/api/proxy/${apiPath(path)}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload: unknown = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      const ingress = new URLSearchParams(window.location.search).get(
        "_ingress_token",
      );
      const params = new URLSearchParams({ reason: "session" });
      if (ingress) params.set("_ingress_token", ingress);
      window.location.assign(`/sign-in?${params.toString()}`);
    }
    throw new ApiError(
      messageFromPayload(payload, `Request failed (${response.status})`),
      response.status,
      payload,
    );
  }

  return payload as T;
}

export function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (!payload || typeof payload !== "object") return [];

  const record = payload as Record<string, unknown>;
  for (const key of [
    "data",
    "items",
    "results",
    "projects",
    "requirements",
    "testPlans",
    "testCases",
    "suites",
    "runs",
    "failures",
    "proposals",
    "environments",
    "schedules",
    "members",
    "events",
    "configurations",
    "maps",
  ]) {
    if (Array.isArray(record[key])) return record[key] as T[];
  }
  if (record.data && typeof record.data === "object") {
    return unwrapList<T>(record.data);
  }
  return [];
}

export function unwrapObject<T extends object>(payload: unknown): T {
  if (!payload || typeof payload !== "object") return {} as T;
  const record = payload as Record<string, unknown>;
  if (record.data && !Array.isArray(record.data) && typeof record.data === "object") {
    return record.data as T;
  }
  return record as T;
}

export function eventStreamUrl(path: string): string {
  return `/api/proxy/${apiPath(path)}`;
}
