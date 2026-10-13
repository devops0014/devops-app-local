import { NextResponse } from "next/server";
import { ApiError, requireUser, supabaseAdmin } from "@/lib/supabase/server";

const fields = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "referrer", "landing_path"] as const;

/**
 * Records where a new student came from, once. Covers Google sign-ups, where
 * the sign-up form can't attach this data. Ignored if a source is already set
 * or the account is more than two days old.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const { data: profile } = await supabaseAdmin!.from("profiles")
      .select("created_at,utm_source,referrer,landing_path").eq("id", user.id).maybeSingle();
    if (!profile || profile.utm_source || profile.referrer || profile.landing_path) return NextResponse.json({ saved: false });
    if (Date.now() - Date.parse(profile.created_at) > 2 * 24 * 60 * 60_000) return NextResponse.json({ saved: false });
    const update = Object.fromEntries(fields
      .map((key) => [key, typeof body?.[key] === "string" ? String(body[key]).trim().slice(0, key === "referrer" || key === "landing_path" ? 300 : 150) : ""])
      .filter(([, value]) => value));
    if (!Object.keys(update).length) return NextResponse.json({ saved: false });
    await supabaseAdmin!.from("profiles").update(update).eq("id", user.id);
    return NextResponse.json({ saved: true });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed." }, { status });
  }
}
