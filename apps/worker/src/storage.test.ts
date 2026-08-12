import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ArtifactStorage } from "./storage.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("ArtifactStorage filesystem fallback", () => {
  it("copies an artifact beneath the configured root", async () => {
    const root = await mkdtemp(join(tmpdir(), "testpilot-storage-"));
    temporaryDirectories.push(root);
    const source = join(root, "source.log");
    await writeFile(source, "execution output");

    const uploaded = await new ArtifactStorage(undefined, join(root, "stored")).upload(
      "workspace/project/run",
      {
        absolutePath: source,
        relativePath: "playwright.log",
        name: "playwright.log",
        kind: "LOG",
        contentType: "text/plain",
        sizeBytes: 16,
        checksum: "checksum",
      },
    );

    expect(uploaded.storageUrl).toBe(
      `file://${join(root, "stored/workspace/project/run/playwright.log")}`,
    );
    expect(
      await readFile(join(root, "stored/workspace/project/run/playwright.log"), "utf8"),
    ).toBe("execution output");
  });

  it("strips traversal segments from artifact names", async () => {
    const root = await mkdtemp(join(tmpdir(), "testpilot-storage-"));
    temporaryDirectories.push(root);
    const source = join(root, "source.log");
    await writeFile(source, "safe");

    const uploaded = await new ArtifactStorage(undefined, join(root, "stored")).upload(
      "run",
      {
        absolutePath: source,
        relativePath: "../../outside.log",
        name: "../../outside.log",
        kind: "LOG",
        contentType: "text/plain",
        sizeBytes: 4,
        checksum: "checksum",
      },
    );

    expect(uploaded.key).toBe("run/outside.log");
    expect(await readFile(join(root, "stored/run/outside.log"), "utf8")).toBe("safe");
  });
});
