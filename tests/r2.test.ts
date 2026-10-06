import test from "node:test";
import assert from "node:assert/strict";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { createR2Client, createR2Storage, readR2Config, StorageConfigurationError } from "../src/lib/r2";

const config = { accountId: "0123456789abcdef0123456789abcdef", bucket: "dravo-brochures", accessKeyId: "test-access-key", secretAccessKey: "test-secret-key" };

test("R2 requires complete, valid server credentials", () => {
  assert.deepEqual(readR2Config({ R2_ACCOUNT_ID: config.accountId, R2_BUCKET: config.bucket, R2_ACCESS_KEY_ID: config.accessKeyId, R2_SECRET_ACCESS_KEY: config.secretAccessKey }), config);
  assert.throws(() => readR2Config({}), StorageConfigurationError);
  assert.throws(() => readR2Config({ R2_ACCOUNT_ID: "evil.example", R2_BUCKET: config.bucket, R2_ACCESS_KEY_ID: config.accessKeyId, R2_SECRET_ACCESS_KEY: config.secretAccessKey }), StorageConfigurationError);
});

test("R2 upload, temporary preview, stream download and delete use the private bucket", async () => {
  const commands: unknown[] = [];
  const client = createR2Client(config);
  const bytes = Buffer.from("%PDF-1.4\n%%EOF");
  const send = async (command: unknown) => {
    commands.push(command);
    if (command instanceof GetObjectCommand) return { ContentLength: bytes.length, Body: { transformToWebStream: () => new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close(); } }) } };
    return {};
  };
  Object.assign(client, { send: send as typeof client.send });
  const storage = createR2Storage(config, client);
  await storage.put("test.pdf", bytes);
  assert.ok(commands[0] instanceof PutObjectCommand);
  assert.equal((commands[0] as PutObjectCommand).input.Bucket, config.bucket);
  assert.equal((commands[0] as PutObjectCommand).input.Key, "test.pdf");
  assert.equal((commands[0] as PutObjectCommand).input.ContentType, "application/pdf");
  const url = new URL(await storage.previewUrl("test.pdf"));
  assert.equal(url.hostname, `${config.bucket}.${config.accountId}.r2.cloudflarestorage.com`);
  assert.equal(url.searchParams.get("X-Amz-Expires"), "300");
  assert.ok(url.searchParams.has("X-Amz-Signature"));
  const result = await storage.get("test.pdf");
  assert.ok(commands[1] instanceof GetObjectCommand);
  assert.equal(result.size, bytes.length);
  assert.equal(Buffer.from(await new Response(result.body).arrayBuffer()).toString(), bytes.toString());
  await storage.delete("test.pdf");
  assert.ok(commands[2] instanceof DeleteObjectCommand);
  assert.equal((commands[2] as DeleteObjectCommand).input.Key, "test.pdf");
});
