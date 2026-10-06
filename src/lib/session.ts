import { createHmac, timingSafeEqual } from "node:crypto";
export const SESSION_COOKIE = "dravo_session";
export const SESSION_SECONDS = 60 * 60 * 8;
function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("Set SESSION_SECRET to at least 32 characters in .env.local.");
  return value;
}
export function credentialsConfigured() {
  return Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 12 && process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32);
}
function signature(payload: string) { return createHmac("sha256", secret()).update(`${payload}:${process.env.ADMIN_PASSWORD}`).digest("base64url"); }
export function createSession(username: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ username, expires: now + SESSION_SECONDS * 1000 })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}
export function verifySession(token: string | undefined, now = Date.now()) {
  if (!token || !credentialsConfigured()) return false;
  try {
    const pieces = token.split(".");
    if (pieces.length !== 2) return false;
    const [payload, supplied] = pieces;
    const expected = Buffer.from(signature(payload));
    const actual = Buffer.from(supplied);
    if (actual.length !== expected.length || !timingSafeEqual(expected, actual)) return false;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    return data.username === process.env.ADMIN_USERNAME && typeof data.expires === "number" && data.expires > now;
  } catch { return false; }
}
export function validCredentials(username: string, password: string) {
  if (!credentialsConfigured()) return false;
  const hash = (value: string) => createHmac("sha256", secret()).update(value).digest();
  return timingSafeEqual(hash(username), hash(process.env.ADMIN_USERNAME!)) && timingSafeEqual(hash(password), hash(process.env.ADMIN_PASSWORD!));
}
