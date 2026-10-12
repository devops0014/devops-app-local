"use client";

import { adminFetch } from "@/lib/repositories/admin-repository";
import { supabase } from "@/lib/supabase/client";
import type { Lead, LeadActivity, LeadStatus } from "@/lib/leads";
import type { Role } from "@/lib/rbac";

export type LeadFilters = { from: string; to: string; status: string; verified: string; q: string };
export type LeadCounts = Record<LeadStatus, number> & { total: number; verified: number };
export type TeamMember = { id: string; name: string | null; email: string; role: Role; created_at: string };

function query(filters: LeadFilters, extra: Record<string, string> = {}) {
  return new URLSearchParams({ ...filters, ...extra }).toString();
}

export async function listLeads(filters: LeadFilters) {
  return adminFetch<{ leads: Lead[]; counts: LeadCounts; range: { from: string; to: string } }>(`/api/leads?${query(filters)}`);
}

export async function updateLeadStatus(id: string, status: LeadStatus) {
  return adminFetch<{ status: LeadStatus; statusUpdatedAt: string }>(`/api/leads/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
}

export async function listLeadActivity(id: string) {
  return (await adminFetch<{ activity: LeadActivity[] }>(`/api/leads/${id}/activity`)).activity;
}

export async function addLeadNote(id: string, body: string) {
  return adminFetch<{ id: string; createdAt: string }>(`/api/leads/${id}/activity`, { method: "POST", body: JSON.stringify({ body }) });
}

export async function downloadLeadsCsv(filters: LeadFilters) {
  const { data } = await supabase!.auth.getSession();
  const response = await fetch(`/api/leads?${query(filters, { format: "csv" })}`, {
    headers: { authorization: `Bearer ${data.session?.access_token ?? ""}` },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? "Export failed.");
  }
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filters.from === filters.to ? `leads-${filters.from}.csv` : `leads-${filters.from}-to-${filters.to}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function listTeam() {
  return (await adminFetch<{ members: TeamMember[] }>("/api/team")).members;
}

export async function setMemberRole(email: string, role: Role) {
  return (await adminFetch<{ member: TeamMember }>("/api/team", { method: "POST", body: JSON.stringify({ email, role }) })).member;
}
