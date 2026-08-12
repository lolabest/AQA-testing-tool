const STORAGE_KEY = "testpilot_access_token";

export function getClientAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setClientAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, token);
}

export function clearClientAccessToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function signInRedirectPath(): string {
  const params = new URLSearchParams(window.location.search);
  const ingress = params.get("_ingress_token");
  const query = ingress
    ? `?_ingress_token=${encodeURIComponent(ingress)}`
    : "";
  return `/sign-in${query}`;
}
