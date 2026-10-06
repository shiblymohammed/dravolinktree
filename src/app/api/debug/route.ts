import { NextResponse } from "next/server";
import { readDatabase } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await readDatabase();
    return NextResponse.json({ success: true, count: data.brochures?.length });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: error.stack,
      name: error.name
    }, { status: 500 });
  }
}
