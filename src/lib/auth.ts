import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "./session";
export async function isAuthenticated() { return verifySession((await cookies()).get(SESSION_COOKIE)?.value); }
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) throw new Error("Request origin is missing.");

  let expected = "";
  if (process.env.APP_URL) {
    try { expected = new URL(process.env.APP_URL).origin; } catch {}
  }
  
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  let originHost = "";
  try { originHost = new URL(origin).host; } catch {}
  
  if (origin !== expected && originHost !== host) {
    throw new Error("Request origin is not allowed.");
  }
}
