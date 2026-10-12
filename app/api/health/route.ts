import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "devopscrack-web",
      timestamp: new Date().toISOString(),
      capabilities: {
        supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        adminAi: Boolean(process.env.OPENAI_API_KEY),
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
