import { NextResponse } from "next/server";
import { ApiError, requireUser, supabaseAdmin } from "@/lib/supabase/server";

/**
 * Lets a student withdraw (or give again) consent to be contacted.
 * Withdrawing marks the lead "do not contact" so the sales team stops calling.
 */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const { data } = await supabaseAdmin!.from("profiles").select("marketing_consent").eq("id", user.id).maybeSingle();
    return NextResponse.json({ consent: Boolean(data?.marketing_consent) });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed." }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = (await request.json().catch(() => null)) as { consent?: boolean } | null;
    if (typeof body?.consent !== "boolean") throw new ApiError("Missing consent value.");
    const now = new Date().toISOString();
    await supabaseAdmin!.from("profiles").update({ marketing_consent: body.consent, marketing_consent_at: now, updated_at: now }).eq("id", user.id);
    const { data: profile } = await supabaseAdmin!.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role === "student") {
      await supabaseAdmin!.from("leads").upsert(
        { user_id: user.id, do_not_contact: !body.consent, do_not_contact_at: body.consent ? null : now, ...(body.consent ? {} : { follow_up_at: null }) },
        { onConflict: "user_id" },
      );
      await supabaseAdmin!.from("lead_activity").insert({
        user_id: user.id, author_id: user.id, kind: "opt_out",
        body: body.consent ? "Student allowed contact again" : "Student withdrew consent — do not contact",
      });
    }
    return NextResponse.json({ consent: body.consent });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed." }, { status });
  }
}
