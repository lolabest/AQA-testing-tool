import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class SsrfError extends Error {
  readonly code = "SSRF_BLOCKED";
  constructor(message: string) {
    super(message);
    this.name = "SsrfError";
  }
}

export interface SsrfPolicy {
  allowPrivateNetwork: boolean;
  allowLocalhost: boolean;
  allowedHosts?: string[];
}

const BLOCKED_HOSTNAMES = new Set([
  "metadata.google.internal",
  "metadata.google.com",
  "169.254.169.254",
]);

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;
  const [a, b] = parts as [number, number, number, number];
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80")
  );
}

export function isPrivateIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return true;
}

export async function assertSafeUrl(
  rawUrl: string,
  policy: SsrfPolicy,
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SsrfError("Invalid URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfError("Only HTTP and HTTPS are allowed");
  }

  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new SsrfError("Metadata endpoints are blocked");
  }

  if (policy.allowedHosts && policy.allowedHosts.length > 0) {
    const allowed = policy.allowedHosts.some(
      (h) => hostname === h.toLowerCase() || hostname.endsWith(`.${h.toLowerCase()}`),
    );
    if (!allowed) {
      throw new SsrfError(`Host ${hostname} is not in the allowlist`);
    }
  }

  const isLocal =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  if (isLocal && !policy.allowLocalhost) {
    throw new SsrfError("Localhost targets are blocked");
  }

  // Resolve DNS and re-check (DNS rebinding protection)
  let addresses: string[] = [];
  if (isIP(hostname)) {
    addresses = [hostname];
  } else {
    try {
      const records = await lookup(hostname, { all: true, verbatim: true });
      addresses = records.map((r) => r.address);
    } catch {
      throw new SsrfError(`Unable to resolve host ${hostname}`);
    }
  }

  for (const address of addresses) {
    if (isPrivateIp(address)) {
      if (isLocal && policy.allowLocalhost) continue;
      if (!policy.allowPrivateNetwork) {
        throw new SsrfError(`Private network address blocked: ${address}`);
      }
    }
  }

  return url;
}

export async function assertSafeRedirect(
  redirectUrl: string,
  policy: SsrfPolicy,
): Promise<URL> {
  return assertSafeUrl(redirectUrl, policy);
}
