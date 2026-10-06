import { NextResponse } from "next/server";
import { assertSameOrigin, isAuthenticated } from "./auth";
export async function guard(request: Request) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
  try { assertSameOrigin(request); } catch { return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 }); }
  return null;
}
export function errorResponse(error: unknown) {
  console.error("Admin request failed:", error);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
