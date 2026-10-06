import test from "node:test";
import assert from "node:assert/strict";
import { createSession, validCredentials, verifySession, SESSION_SECONDS } from "../src/lib/session";
import { brochureFields, validatePdf, validateSettings, MAX_PDF_SIZE } from "../src/lib/validation";
process.env.ADMIN_USERNAME = "test-admin";
process.env.ADMIN_PASSWORD = "test-only-password-strong";
process.env.SESSION_SECRET = "test-only-secret-32-characters-minimum";
test("signed sessions reject tampering, wrong users and expired tokens", () => {
  const now = 1_000_000;
  const token = createSession("test-admin", now);
  assert.equal(verifySession(token, now), true);
  assert.equal(verifySession(`${token.slice(0, -2)}xx`, now), false);
  assert.equal(verifySession(createSession("other-admin", now), now), false);
  assert.equal(verifySession(token, now + SESSION_SECONDS * 1000), false);
  assert.equal(verifySession(`${token}.extra`, now), false);
  assert.equal(verifySession(undefined, now), false);
});
test("credentials require the correct username and password", () => {
  assert.equal(validCredentials("test-admin", "test-only-password-strong"), true);
  assert.equal(validCredentials("test-admin", "incorrect-password"), false);
  assert.equal(validCredentials("other-admin", "test-only-password-strong"), false);
});
test("changing the admin password invalidates existing sessions", () => {
  const token = createSession("test-admin");
  const previous = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_PASSWORD = "different-test-password-strong";
  assert.equal(verifySession(token), false);
  process.env.ADMIN_PASSWORD = previous;
});
test("uploads reject disguised, incomplete and oversized PDFs", () => {
  const pdf = Buffer.from("%PDF-1.4\nfixture\n%%EOF");
  assert.doesNotThrow(() => validatePdf(pdf, "collection.PDF"));
  assert.throws(() => validatePdf(Buffer.from("<html>hello</html>"), "file.pdf"));
  assert.throws(() => validatePdf(pdf, "file.html"));
  assert.throws(() => validatePdf(Buffer.from("%PDF-1.4\nmissing end"), "file.pdf"));
  assert.throws(() => validatePdf(Buffer.alloc(MAX_PDF_SIZE + 1), "file.pdf"));
});
test("brochures enforce valid categories, lengths and publication status", () => {
  assert.deepEqual(brochureFields({ title: " Living ", category: "Living", published: false }), { title: "Living", category: "Living", description: "", published: false });
  assert.throws(() => brochureFields({ title: "", category: "Living" }));
  assert.throws(() => brochureFields({ title: "New", category: "Invalid" }));
  assert.throws(() => brochureFields({ title: "New", category: "Living", published: "false" }));
});
test("social settings block scripts, wrong hosts, credentials and malformed phone numbers", () => {
  const settings = { instagram: "https://www.instagram.com/example", facebook: "https://facebook.com/example", whatsapp: "+91 98765 43210", phone: "+91 98765 43210" };
  assert.equal(validateSettings(settings).instagram, settings.instagram);
  assert.throws(() => validateSettings({ ...settings, instagram: "javascript:alert(1)" }));
  assert.throws(() => validateSettings({ ...settings, facebook: "https://facebook.com.evil.test/example" }));
  assert.throws(() => validateSettings({ ...settings, instagram: "https://user:password@instagram.com/example" }));
  assert.throws(() => validateSettings({ ...settings, phone: "abcdefg" }));
  assert.throws(() => validateSettings({ ...settings, phone: "-------" }));
});
