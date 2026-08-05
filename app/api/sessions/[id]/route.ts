import { NextResponse } from "next/server";
import { PaymentApiError, requirePaymentUser, supabaseAdmin } from "@/lib/supabase/server";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePaymentUser(request);
    const { id } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid session." }, { status: 400 });
    const { error } = await supabaseAdmin!.from("user_sessions").update({
      is_active: false, revoked_at: new Date().toISOString(),
    }).eq("id", id).eq("user_id", user.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof PaymentApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to revoke device." }, { status });
  }
}
