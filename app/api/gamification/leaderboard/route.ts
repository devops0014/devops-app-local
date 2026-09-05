import { NextResponse } from "next/server";
import { levelForXp } from "@/lib/gamification";
import { PaymentApiError, requirePaymentUser, supabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const user = await requirePaymentUser(request);
    const period = new URL(request.url).searchParams.get("period") ?? "weekly";
    if (!["weekly", "monthly", "all"].includes(period)) throw new PaymentApiError("Invalid leaderboard period.");
    const since = new Date();
    if (period === "weekly") since.setDate(since.getDate() - 7);
    if (period === "monthly") since.setDate(since.getDate() - 30);

    const eventsQuery = supabaseAdmin!.from("xp_events").select("user_id,amount").limit(5000);
    const { data: events } = period === "all" ? await eventsQuery : await eventsQuery.gte("created_at", since.toISOString());
    const totals = new Map<string, number>();
    for (const event of events ?? []) totals.set(event.user_id, (totals.get(event.user_id) ?? 0) + event.amount);
    const ids = [...totals.keys()];
    if (!ids.length) return NextResponse.json({ leaders: [] });
    const { data: profiles } = await supabaseAdmin!.from("profiles").select("id,name,email,avatar,streak,xp").in("id", ids);
    const leaders = (profiles ?? [])
      .map((profile) => ({
        id: profile.id,
        name: profile.name || profile.email?.split("@")[0] || "DevOps Learner",
        xp: period === "all" ? profile.xp : totals.get(profile.id) ?? 0,
        streak: profile.streak,
        levelName: levelForXp(profile.xp).name,
        initials: String(profile.name || profile.email || "DL").split(/\s|@/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
        you: profile.id === user.id,
      }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 50)
      .map((leader, index) => ({ ...leader, rank: index + 1 }));
    return NextResponse.json({ leaders });
  } catch (error) {
    const status = error instanceof PaymentApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Leaderboard unavailable." }, { status });
  }
}
