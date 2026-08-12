import { readFile } from "node:fs/promises";
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { CollectedArtifact } from "@testpilot/test-runtime";
import type { WorkerConfig } from "./config.js";

export class ArtifactStorage {
  private readonly client: S3Client;
  private bucketReady: Promise<void> | undefined;

  constructor(private readonly config: WorkerConfig["s3"]) {
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

  private ensureBucket(): Promise<void> {
    this.bucketReady ??= (async () => {
      try {
        await this.client.send(new HeadBucketCommand({ Bucket: this.config.bucket }));
      } catch {
        await this.client.send(
          new CreateBucketCommand({ Bucket: this.config.bucket }),
        );
      }
    })();
    return this.bucketReady;
  }

  async upload(
    keyPrefix: string,
    artifact: CollectedArtifact,
  ): Promise<{ key: string; storageUrl: string }> {
    await this.ensureBucket();
    const safeName = artifact.name.replaceAll("\\", "/").replace(/\.\./g, "_");
    const key = `${keyPrefix}/${safeName}`;
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
}
