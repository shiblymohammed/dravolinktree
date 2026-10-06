import { NextResponse } from "next/server";
import { guard, errorResponse } from "@/lib/api";
import { updateDatabase } from "@/lib/store";
import { validateSettings } from "@/lib/validation";
export async function PUT(request: Request) {
  const denial = await guard(request); if (denial) return denial;
  let settings;
  try { settings = validateSettings(await request.json()); } catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
  try { await updateDatabase(database => { database.settings = settings; }); return NextResponse.json({ settings }); }
  catch (error) { return errorResponse(error); }
}
