import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { CollectedArtifact } from "@testpilot/test-runtime";
import type { WorkerConfig } from "./config.js";

export class ArtifactStorage {
  private readonly client?: S3Client;
  private bucketReady: Promise<void> | undefined;

  constructor(
    private readonly config: WorkerConfig["s3"],
    private readonly fallbackDirectory = "/tmp/testpilot-artifacts",
  ) {
    if (config) {
      this.client = new S3Client({
        endpoint: config.endpoint,
        region: config.region,
        forcePathStyle: config.forcePathStyle,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      });
    }
  }

  private ensureBucket(): Promise<void> {
    if (!this.client || !this.config) return Promise.resolve();
    const client = this.client;
    const config = this.config;
    this.bucketReady ??= (async () => {
      try {
        await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
      } catch {
        await client.send(
          new CreateBucketCommand({ Bucket: config.bucket }),
        );
      }
    })();
    return this.bucketReady;
  }

  async upload(
    keyPrefix: string,
    artifact: CollectedArtifact,
  ): Promise<{ key: string; storageUrl: string }> {
    const safeName = artifact.name
      .replaceAll("\\", "/")
      .split("/")
      .filter((segment) => segment && segment !== "." && segment !== "..")
      .join("/");
    const key = `${keyPrefix}/${safeName}`;
    if (this.client && this.config) {
      await this.ensureBucket();
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
          Body: await readFile(artifact.absolutePath),
          ContentType: artifact.contentType,
          Metadata: { sha256: artifact.checksum },
        }),
      );
      return {
        key,
        storageUrl: `s3://${this.config.bucket}/${key}`,
      };
    }
    const root = resolve(this.fallbackDirectory);
    const destination = resolve(root, key);
    if (destination !== root && !destination.startsWith(`${root}${sep}`)) {
      throw new Error("Artifact key escapes the filesystem storage root");
    }
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(artifact.absolutePath, destination);
    return {
      key,
      storageUrl: new URL(`file://${destination}`).toString(),
    };
  }
}
