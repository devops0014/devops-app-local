import { AdminApiError, apiError, requirePermission } from "@/lib/admin/server";
import { formatIst, istRange, istToday, leadStatuses, leadStatusMeta, type Lead } from "@/lib/leads";
import { loadLeads } from "@/lib/leads-server";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const csv = url.searchParams.get("format") === "csv";
    await requirePermission(request, csv ? "leads.export" : "leads.view");

    const today = istToday();
    const from = url.searchParams.get("from") ?? today;
    const to = url.searchParams.get("to") ?? from;
    if (!datePattern.test(from) || !datePattern.test(to) || from > to) throw new AdminApiError("Invalid date range.");
    const days = (Date.parse(to) - Date.parse(from)) / 86_400_000;
    if (days > 366) throw new AdminApiError("Choose a range of one year or less.");

    const [startIso, endIso] = istRange(from, to);
    const all = await loadLeads(startIso, endIso);

    const term = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const searched = term
      ? all.filter((lead) => `${lead.name ?? ""} ${lead.email} ${lead.mobile ?? ""}`.toLowerCase().includes(term))
      : all;
    const status = url.searchParams.get("status");
    const verified = url.searchParams.get("verified");
    const leads = searched.filter((lead) =>
      (!status || status === "all" || lead.status === status)
      && (verified !== "yes" || lead.phoneVerified)
      && (verified !== "no" || !lead.phoneVerified));

    if (csv) return csvResponse(leads, from, to);

    const counts = Object.fromEntries(leadStatuses.map((key) => [key, searched.filter((lead) => lead.status === key).length]));
    return Response.json({
      range: { from, to },
      counts: { total: searched.length, verified: searched.filter((lead) => lead.phoneVerified).length, ...counts },
      leads,
    });
  } catch (cause) {
    return apiError(cause);
  }
}

function csvResponse(leads: Lead[], from: string, to: string) {
  const rows = [
    ["Name", "Email", "Phone", "WhatsApp verified", "Registered (IST)", "Status", "Status updated by", "Quiz attempts", "Notes", "Latest note"],
    ...leads.map((lead) => [
      lead.name ?? "", lead.email, lead.mobile ?? "", lead.phoneVerified ? "Yes" : "No",
      formatIst(lead.registeredAt), leadStatusMeta[lead.status].label, lead.statusUpdatedBy ?? "",
      lead.quizAttempts, lead.noteCount, lead.lastNote ?? "",
    ]),
  ];
  // Prefix formula-like cells so spreadsheet apps don't execute them.
  const cell = (value: unknown) => {
    const text = String(value).replace(/^([=+\-@])/, "'$1");
    return `"${text.replaceAll('"', '""')}"`;
  };
  const body = "﻿" + rows.map((row) => row.map(cell).join(",")).join("\r\n");
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="leads-${from}${from === to ? "" : `-to-${to}`}.csv"`,
      "cache-control": "no-store",
    },
  });
}
