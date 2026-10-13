import { AdminApiError, apiError, requirePermission } from "@/lib/admin/server";
import {
  experienceLabels, formatIst, goalLabels, heatLabel, istRange, istToday, leadStatuses, leadStatusMeta, sourceLabel, type Lead,
} from "@/lib/leads";
import { loadCallers, loadLeads, type LeadQuery } from "@/lib/leads-server";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
type View = "registered" | "followups" | "callbacks";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const csv = url.searchParams.get("format") === "csv";
    const user = await requirePermission(request, csv ? "leads.export" : "leads.view");

    const today = istToday();
    const view = (["registered", "followups", "callbacks"].includes(url.searchParams.get("view") ?? "") ? url.searchParams.get("view") : "registered") as View;
    const from = url.searchParams.get("from") ?? today;
    const to = url.searchParams.get("to") ?? from;
    if (!datePattern.test(from) || !datePattern.test(to) || from > to) throw new AdminApiError("Invalid date range.");
    if ((Date.parse(to) - Date.parse(from)) / 86_400_000 > 366) throw new AdminApiError("Choose a range of one year or less.");

    let query: LeadQuery;
    if (view === "followups") query = { kind: "followups", dueOn: today };
    else if (view === "callbacks") query = { kind: "callbacks" };
    else {
      const [startIso, endIso] = istRange(from, to);
      query = { kind: "registered", startIso, endIso };
    }
    const [all, callers] = await Promise.all([loadLeads(query), loadCallers()]);

    const term = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const owner = url.searchParams.get("owner") ?? "all";
    const source = url.searchParams.get("source") ?? "all";
    const base = all.filter((lead) =>
      (!term || `${lead.name ?? ""} ${lead.email} ${lead.mobile ?? ""} ${lead.profile.city ?? ""}`.toLowerCase().includes(term))
      && (owner === "all" || (owner === "me" ? lead.assignedTo === user.id : owner === "unassigned" ? !lead.assignedTo : lead.assignedTo === owner))
      && (source === "all" || sourceLabel(lead.source).split(" · ")[0] === source));

    const status = url.searchParams.get("status");
    const verified = url.searchParams.get("verified");
    const sort = url.searchParams.get("sort") === "hot" ? "hot" : "recent";
    const leads = base.filter((lead) =>
      (!status || status === "all" || lead.status === status)
      && (verified !== "yes" || lead.phoneVerified)
      && (verified !== "no" || !lead.phoneVerified));
    if (sort === "hot") leads.sort((a, b) => b.score - a.score);
    if (view === "followups") leads.sort((a, b) => (a.followUpAt ?? "").localeCompare(b.followUpAt ?? ""));

    if (csv) return csvResponse(leads, view === "registered" ? `${from}${from === to ? "" : `-to-${to}`}` : view);

    const counts = Object.fromEntries(leadStatuses.map((key) => [key, base.filter((lead) => lead.status === key).length]));
    const sources = [...new Set(all.map((lead) => sourceLabel(lead.source).split(" · ")[0]))].sort();
    return Response.json({
      view,
      range: { from, to },
      counts: { total: base.length, verified: base.filter((lead) => lead.phoneVerified).length, hot: base.filter((lead) => lead.score >= 60).length, ...counts },
      sources,
      callers,
      leads,
    });
  } catch (cause) {
    return apiError(cause);
  }
}

function csvResponse(leads: Lead[], label: string) {
  const rows = [
    ["Name", "Email", "Phone", "WhatsApp verified", "Registered (IST)", "Status", "Follow-up", "Assigned to", "Heat", "Score",
      "Experience", "Role", "Goal", "City", "Source", "Medium", "Campaign", "Ad", "Quizzes", "Flashcards", "Callback requested", "Do not contact", "Notes", "Latest note"],
    ...leads.map((lead) => [
      lead.name ?? "", lead.email, lead.mobile ?? "", lead.phoneVerified ? "Yes" : "No", formatIst(lead.registeredAt),
      leadStatusMeta[lead.status].label, lead.followUpAt ?? "", lead.assignedToName ?? "", heatLabel(lead.score).label, lead.score,
      lead.profile.experience ? experienceLabels[lead.profile.experience] ?? lead.profile.experience : "", lead.profile.jobTitle ?? "",
      lead.profile.goal ? goalLabels[lead.profile.goal] ?? lead.profile.goal : "", lead.profile.city ?? "",
      lead.source.utmSource ?? (lead.source.referrer ? "referral" : "direct"), lead.source.utmMedium ?? "", lead.source.utmCampaign ?? "", lead.source.utmContent ?? "",
      lead.quizAttempts, lead.flashcards, lead.callbackRequestedAt ? formatIst(lead.callbackRequestedAt) : "", lead.doNotContact ? "Yes" : "No",
      lead.noteCount, lead.lastNote ?? "",
    ]),
  ];
  // Prefix formula-like cells so spreadsheet apps don't execute them.
  const cell = (value: unknown) => `"${String(value).replace(/^([=+\-@])/, "'$1").replaceAll('"', '""')}"`;
  const body = "﻿" + rows.map((row) => row.map(cell).join(",")).join("\r\n");
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="leads-${label}.csv"`,
      "cache-control": "no-store",
    },
  });
}
