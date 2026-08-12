import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { ApiConfig } from "./config.js";

export interface StoredArtifact {
  storageUrl: string;
  sizeBytes: number;
}

export class ArtifactStore {
  private readonly root = "/tmp/testpilot-artifacts";
  private readonly client?: S3Client;

  constructor(private readonly config: ApiConfig) {
    if (
      config.S3_ENDPOINT &&
      config.S3_ACCESS_KEY_ID &&
      config.S3_SECRET_ACCESS_KEY
    ) {
      this.client = new S3Client({
        endpoint: config.S3_ENDPOINT,
        region: config.S3_REGION,
        forcePathStyle: config.S3_FORCE_PATH_STYLE,
        credentials: {
          accessKeyId: config.S3_ACCESS_KEY_ID,
          secretAccessKey: config.S3_SECRET_ACCESS_KEY,
        },
      });
    }
  }

  async put(
    workspaceId: string,
    runId: string,
    name: string,
    contents: Buffer,
    contentType?: string,
  ): Promise<StoredArtifact> {
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${workspaceId}/${runId}/${randomUUID()}-${safeName}`;
    if (this.client) {
      try {
        await this.client.send(
          new PutObjectCommand({
            Bucket: this.config.S3_BUCKET,
            Key: key,
            Body: contents,
            ContentType: contentType,
          }),
        );
        return {
          storageUrl: `s3://${this.config.S3_BUCKET}/${key}`,
          sizeBytes: contents.byteLength,
        };
      } catch {
        // Local environments commonly omit MinIO. Preserve the artifact on disk.
      }
    }

    const path = join(this.root, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, contents);
    return { storageUrl: `file://${path}`, sizeBytes: contents.byteLength };
  }

  async get(storageUrl: string): Promise<Buffer> {
    if (storageUrl.startsWith("file://")) {
      const path = storageUrl.slice("file://".length);
      if (!path.startsWith(`${this.root}/`)) {
        throw new Error("Artifact path is outside the configured storage root");
      }
      return readFile(path);
    }

    if (storageUrl.startsWith("s3://") && this.client) {
      const withoutScheme = storageUrl.slice("s3://".length);
      const slash = withoutScheme.indexOf("/");
      const bucket = withoutScheme.slice(0, slash);
      const key = withoutScheme.slice(slash + 1);
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
      );
      if (!response.Body) throw new Error("Artifact has no content");
      return Buffer.from(await response.Body.transformToByteArray());
    }

    throw new Error("Artifact storage backend is unavailable");
  }

  destroy(): void {
    this.client?.destroy();
  }
}
