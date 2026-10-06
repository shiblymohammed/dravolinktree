import { NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/session";
export async function POST(request: Request) {
  try { assertSameOrigin(request); } catch { return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 }); }
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
  return response;
}
