const SENSITIVE_KEY =
  /^(authorization|cookie|set-cookie|x-api-key|api[_-]?key|token|password|secret|access[_-]?token|refresh[_-]?token|client[_-]?secret)$/i;

const SENSITIVE_VALUE =
  /(Bearer\s+[A-Za-z0-9\-._~+/]+=*|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|sk-[A-Za-z0-9]{10,}|password\s*[:=]\s*\S+)/gi;

export function redactHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_KEY.test(key)) {
      out[key] = "[REDACTED]";
    } else if (Array.isArray(value)) {
      out[key] = value.map((v) => redactText(v)).join(", ");
    } else if (typeof value === "string") {
      out[key] = redactText(value);
    }
  }
  return out;
}

export function redactText(input: string): string {
  return input.replace(SENSITIVE_VALUE, "[REDACTED]");
}

export function redactObject<T>(value: T): T {
  return redactDeep(value) as T;
}

function redactDeep(value: unknown): unknown {
  if (typeof value === "string") {
    return redactText(value);
  }
  if (Array.isArray(value)) {
    return value.map(redactDeep);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEY.test(k)) {
        out[k] = "[REDACTED]";
      } else {
        out[k] = redactDeep(v);
      }
    }
    return out;
  }
  return value;
}
