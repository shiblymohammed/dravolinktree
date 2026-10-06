import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class StorageConfigurationError extends Error {
  constructor(message: string) { super(message); this.name = "StorageConfigurationError"; }
}

export type R2Config = { accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string };

export function readR2Config(env: Record<string, string | undefined> = process.env): R2Config {
  const accountId = env.R2_ACCOUNT_ID?.trim() || "";
  const accessKeyId = env.R2_ACCESS_KEY_ID?.trim() || "";
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim() || "";
  const bucket = env.R2_BUCKET?.trim() || "";
  const missing = [
    ["R2_ACCOUNT_ID", accountId], ["R2_ACCESS_KEY_ID", accessKeyId],
    ["R2_SECRET_ACCESS_KEY", secretAccessKey], ["R2_BUCKET", bucket],
  ].filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) throw new StorageConfigurationError(`Cloudflare R2 is selected but ${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} missing.`);
  if (!/^[a-f0-9]{32}$/i.test(accountId)) throw new StorageConfigurationError("R2_ACCOUNT_ID must be the 32-character Cloudflare account ID.");
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)) throw new StorageConfigurationError("R2_BUCKET must be a valid lowercase bucket name.");
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

export function createR2Client(config: R2Config) {
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    requestChecksumCalculation: "WHEN_REQUIRED",
  });
}

export function createR2Storage(config: R2Config, client = createR2Client(config)) {
  const bucket = config.bucket;
  return {
    async put(filename: string, bytes: Uint8Array) {
      await client.send(new PutObjectCommand({
        Bucket: bucket, Key: filename, Body: bytes, ContentType: "application/pdf",
        ContentDisposition: "inline; filename=dravohome-brochure.pdf", CacheControl: "private, no-store",
      }));
    },
    async previewUrl(filename: string) {
      return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: filename }), { expiresIn: 300 });
    },
    async get(filename: string) {
      const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: filename }));
      if (!result.Body) throw new Error("Cloudflare R2 returned an empty brochure response.");
      return { body: result.Body.transformToWebStream(), size: result.ContentLength };
    },
    async delete(filename: string) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: filename }));
    },
  };
}
