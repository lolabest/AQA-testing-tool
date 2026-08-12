import { Prisma, type PrismaClient } from "@testpilot/database";
import { assertSafeRedirect, assertSafeUrl, type SsrfPolicy } from "@testpilot/security";
import type { WorkerConfig } from "../config.js";
import type { DiscoveryJob } from "../types.js";

const MAX_RESPONSE_BYTES = 1_000_000;

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function environmentConfig(value: Prisma.JsonValue): string[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return [];
  const domains = (value as Record<string, Prisma.JsonValue>).allowedDomains;
  return Array.isArray(domains)
    ? domains.filter((item): item is string => typeof item === "string")
    : [];
}

async function boundedText(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_RESPONSE_BYTES) {
    throw new Error(`Discovery response exceeds ${MAX_RESPONSE_BYTES} bytes`);
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error(`Discovery response exceeds ${MAX_RESPONSE_BYTES} bytes`);
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

async function safeFetch(url: URL, policy: SsrfPolicy): Promise<Response> {
  let current = url;
  for (let redirects = 0; redirects <= 5; redirects += 1) {
    await assertSafeUrl(current.toString(), policy);
    const response = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(5_000),
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "TestPilot-Discovery/1.0",
      },
    });
    if (response.status < 300 || response.status >= 400) return response;
    const location = response.headers.get("location");
    if (!location) throw new Error(`Redirect from ${current} has no location`);
    current = await assertSafeRedirect(new URL(location, current).toString(), policy);
  }
  throw new Error(`Too many redirects while discovering ${url}`);
}

function text(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
}

function structuralPageData(html: string, pageUrl: URL): {
  title: string;
  links: Array<{ href: string; label: string }>;
  forms: Array<{ action: string; method: string }>;
} {
  const withoutExecutableContent = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi, "");
  const titleMatch = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(
    withoutExecutableContent,
  );
  const links = [...withoutExecutableContent.matchAll(
    /<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi,
  )]
    .slice(0, 100)
    .flatMap((match) => {
      try {
        const url = new URL(match[1]!, pageUrl);
        url.hash = "";
        return [{ href: url.toString(), label: text(match[2] ?? "") }];
      } catch {
        return [];
      }
    });
  const forms = [...withoutExecutableContent.matchAll(/<form\b([^>]*)>/gi)]
    .slice(0, 30)
    .map((match) => {
      const attributes = match[1] ?? "";
      const action =
        /\baction\s*=\s*["']([^"']+)["']/i.exec(attributes)?.[1] ?? pageUrl.pathname;
      const method =
        /\bmethod\s*=\s*["']([^"']+)["']/i.exec(attributes)?.[1] ?? "GET";
      return { action: new URL(action, pageUrl).toString(), method: method.toUpperCase() };
    });
  return { title: text(titleMatch?.[1] ?? pageUrl.pathname), links, forms };
}

export async function processDiscovery(
  database: PrismaClient,
  config: WorkerConfig,
  data: DiscoveryJob,
): Promise<{ applicationMapId: string; pages: number }> {
  const environment = await database.environment.findFirstOrThrow({
    where: {
      id: data.environmentId,
      workspaceId: data.workspaceId,
      projectId: data.projectId,
      deletedAt: null,
    },
  });
  const baseUrl = new URL(environment.baseUrl || config.demoSutUrl);
  const configuredDomains = environmentConfig(environment.config);
  const policy: SsrfPolicy = {
    allowPrivateNetwork: config.allowPrivateNetworkTargets,
    allowLocalhost: config.allowLocalhost,
    allowedHosts:
      configuredDomains.length > 0 ? configuredDomains : [baseUrl.hostname],
  };
  await assertSafeUrl(baseUrl.toString(), policy);
  const maximumPages = Math.max(1, Math.min(data.maxPages ?? 10, 25));
  const pending = [baseUrl];
  const visited = new Set<string>();
  const nodes: unknown[] = [];
  const edges: unknown[] = [];

  while (pending.length > 0 && visited.size < maximumPages) {
    const pageUrl = pending.shift()!;
    pageUrl.hash = "";
    if (visited.has(pageUrl.toString())) continue;
    visited.add(pageUrl.toString());
    try {
      const response = await safeFetch(pageUrl, policy);
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html")) {
        nodes.push({
          url: pageUrl.toString(),
          status: response.status,
          reviewStatus: "PROPOSED",
          untrustedPageData: { contentType },
        });
        continue;
      }
      const page = structuralPageData(await boundedText(response), pageUrl);
      nodes.push({
        url: pageUrl.toString(),
        status: response.status,
        reviewStatus: "PROPOSED",
        trustBoundary: "UNTRUSTED_SUT_CONTENT",
        untrustedPageData: {
          title: page.title,
          forms: page.forms,
        },
      });
      for (const link of page.links) {
        const target = new URL(link.href);
        if (target.origin !== baseUrl.origin) continue;
        edges.push({
          from: pageUrl.toString(),
          to: target.toString(),
          untrustedLabel: link.label,
        });
        if (!visited.has(target.toString()) && pending.length < maximumPages * 3) {
          pending.push(target);
        }
      }
    } catch (error) {
      nodes.push({
        url: pageUrl.toString(),
        reviewStatus: "PROPOSED",
        error: error instanceof Error ? error.message : "Discovery failed",
      });
    }
  }

  const name = `Discovery: ${environment.name}`;
  const graph = {
    schemaVersion: "1.0.0",
    reviewStatus: "PROPOSED",
    requiresHumanReview: true,
    promptIsolation:
      "SUT content is retained only in untrustedPageData and was not supplied to an AI prompt",
    rootUrl: baseUrl.toString(),
    nodes,
    edges,
  };
  const map = await database.applicationMap.upsert({
    where: { projectId_name: { projectId: data.projectId, name } },
    create: {
      workspaceId: data.workspaceId,
      projectId: data.projectId,
      environmentId: environment.id,
      name,
      graph: json(graph),
      createdById: data.createdById,
      updatedById: data.createdById,
    },
    update: {
      environmentId: environment.id,
      graph: json(graph),
      generatedAt: new Date(),
      updatedById: data.createdById,
      deletedAt: null,
    },
  });
  return { applicationMapId: map.id, pages: visited.size };
}
