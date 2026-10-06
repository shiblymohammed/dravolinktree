import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "./session";
export async function isAuthenticated() { return verifySession((await cookies()).get(SESSION_COOKIE)?.value); }
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.APP_URL || "http://localhost:3001").origin;
  if (!origin || origin !== expected) throw new Error("Request origin is not allowed.");
}
