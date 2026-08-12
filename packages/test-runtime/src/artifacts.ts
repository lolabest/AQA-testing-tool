import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { extname, relative } from "node:path";

export type RuntimeArtifactKind =
  | "SCREENSHOT"
  | "VIDEO"
  | "TRACE"
  | "LOG"
  | "REPORT"
  | "DOM_SNAPSHOT"
  | "OTHER";

export interface CollectedArtifact {
  absolutePath: string;
  relativePath: string;
  name: string;
  kind: RuntimeArtifactKind;
  contentType: string;
  sizeBytes: number;
  checksum: string;
}

const MIME_TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html",
  ".json": "application/json",
  ".log": "text/plain",
  ".png": "image/png",
  ".txt": "text/plain",
  ".webm": "video/webm",
  ".zip": "application/zip",
};

export function classifyArtifact(path: string): {
  kind: RuntimeArtifactKind;
  contentType: string;
} {
  const extension = extname(path).toLowerCase();
  const lower = path.toLowerCase();
  const contentType = MIME_TYPES[extension] ?? "application/octet-stream";
  if (extension === ".png" || extension === ".jpg" || extension === ".jpeg") {
    return { kind: "SCREENSHOT", contentType };
  }
  if (extension === ".webm") return { kind: "VIDEO", contentType };
  if (extension === ".zip" && lower.includes("trace")) {
    return { kind: "TRACE", contentType };
  }
  if (lower.includes("dom") && (extension === ".html" || extension === ".txt")) {
    return { kind: "DOM_SNAPSHOT", contentType };
  }
  if (extension === ".log" || extension === ".txt") {
    return { kind: "LOG", contentType };
  }
  if (extension === ".json" || extension === ".html") {
    return { kind: "REPORT", contentType };
  }
  return { kind: "OTHER", contentType };
}

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths: string[] = [];
  for (const entry of entries) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) paths.push(...(await walk(path)));
    else if (entry.isFile()) paths.push(path);
  }
  return paths;
}

export async function collectArtifacts(
  directory: string,
): Promise<CollectedArtifact[]> {
  const files = await walk(directory);
  return Promise.all(
    files.map(async (absolutePath) => {
      const [contents, metadata] = await Promise.all([
        readFile(absolutePath),
        stat(absolutePath),
      ]);
      const relativePath = relative(directory, absolutePath);
      const classification = classifyArtifact(relativePath);
      return {
        absolutePath,
        relativePath,
        name: relativePath.replaceAll("\\", "/"),
        ...classification,
        sizeBytes: metadata.size,
        checksum: createHash("sha256").update(contents).digest("hex"),
      };
    }),
  );
}
