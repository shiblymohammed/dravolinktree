import { NextResponse } from "next/server";
import { createR2Storage, readR2Config } from "@/lib/r2";

export const runtime = "nodejs";

export async function GET(request: Request, props: { params: Promise<{ filename: string }> }) {
  const { filename } = await props.params;

  try {
    const r2 = createR2Storage(readR2Config());
    const result = await r2.get(`carousel/${filename}`);
    
    const headers: Record<string, string> = {
      "Cache-Control": "public, max-age=31536000, immutable",
    };
    
    if (result.size !== undefined) headers["Content-Length"] = String(result.size);
    if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) headers["Content-Type"] = "image/jpeg";
    if (filename.endsWith(".png")) headers["Content-Type"] = "image/png";
    if (filename.endsWith(".webp")) headers["Content-Type"] = "image/webp";

    return new Response(result.body, { headers });
  } catch (error) {
    return new NextResponse("Image not found", { status: 404 });
  }
}
