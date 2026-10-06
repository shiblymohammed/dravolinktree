import { NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/auth";
import { credentialsConfigured, createSession, validCredentials, SESSION_COOKIE, SESSION_SECONDS } from "@/lib/session";
export const runtime = "nodejs";
const attempts = new Map<string, { count: number; reset: number }>();
let globalAttempts = { count: 0, reset: 0 };
export async function POST(request: Request) {
  try { assertSameOrigin(request); } catch { return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 }); }
  if (!credentialsConfigured()) return NextResponse.json({ error: "Admin access has not been configured. Set ADMIN_USERNAME, ADMIN_PASSWORD and SESSION_SECRET in .env.local." }, { status: 503 });
  const now = Date.now();
  for (const [key, value] of attempts) if (value.reset <= now) attempts.delete(key);
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limit = attempts.get(address) || { count: 0, reset: now + 15 * 60 * 1000 };
  if (globalAttempts.reset <= now) globalAttempts = { count: 0, reset: now + 15 * 60 * 1000 };
  if (limit.count >= 5 || globalAttempts.count >= 30) return NextResponse.json({ error: "Too many sign-in attempts. Try again in 15 minutes." }, { status: 429, headers: { "Retry-After": "900" } });
  limit.count += 1; globalAttempts.count += 1; attempts.set(address, limit);
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid sign-in request." }, { status: 400 }); }
  if (typeof body?.username !== "string" || typeof body?.password !== "string" || body.username.length > 100 || body.password.length > 1000 || !validCredentials(body.username, body.password)) return NextResponse.json({ error: "The username or password is incorrect." }, { status: 401 });
  attempts.delete(address);
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, createSession(body.username), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: SESSION_SECONDS });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
