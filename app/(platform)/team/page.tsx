"use client";

import { FormEvent, useEffect, useState } from "react";
import { LoaderCircle, ShieldCheck, UserPlus, UsersRound } from "lucide-react";
import { RoleGate } from "@/components/access-gate";
import { Badge, Button, Card } from "@/components/ui";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { formatIst } from "@/lib/leads";
import { roleDescriptions, roleLabels, roles, type Role } from "@/lib/rbac";
import { listTeam, setMemberRole, type TeamMember } from "@/lib/repositories/leads-repository";

const staffRoles = roles.filter((role) => role !== "student");

export default function TeamPage() {
  return <RoleGate permission="team.manage"><TeamManager /></RoleGate>;
}

function TeamManager() {
  const { profile } = useCurrentUser();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("sales");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const load = async () => {
    try { setMembers(await listTeam()); }
    catch (cause) { setMessage({ tone: "error", text: cause instanceof Error ? cause.message : "Could not load the team." }); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const assign = async (targetEmail: string, targetRole: Role) => {
    setBusy(true);
    setMessage(null);
    try {
      const member = await setMemberRole(targetEmail, targetRole);
      setMessage({ tone: "ok", text: targetRole === "student" ? `${member.email} no longer has team access.` : `${member.email} is now ${roleLabels[targetRole]}.` });
      await load();
      return true;
    } catch (cause) {
      setMessage({ tone: "error", text: cause instanceof Error ? cause.message : "Could not update the role." });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (await assign(email, role)) setEmail("");
  };

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <Badge tone="violet"><ShieldCheck size={11} className="mr-1" /> Super admin</Badge>
      <h1 className="mt-3 text-2xl font-semibold tracking-[-.04em] sm:text-3xl">Team &amp; roles</h1>
      <p className="mt-2 text-xs text-zinc-500">Give your team access. They sign up like a student first, then you add them here by email.</p>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        {staffRoles.map((item) => (
          <Card key={item} className="p-4">
            <p className="text-sm font-medium">{roleLabels[item]}</p>
            <p className="mt-1 text-[11px] leading-5 text-zinc-500">{roleDescriptions[item]}</p>
          </Card>
        ))}
      </section>

      <Card className="mt-5 p-5">
        <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required placeholder="teammate@example.com" className="h-10 flex-1 rounded-xl border border-white/[.08] bg-white/[.03] px-3 text-xs" />
          <select value={role} onChange={(event) => setRole(event.target.value as Role)} className="h-10 rounded-xl border border-white/[.08] bg-[var(--panel)] px-3 text-xs">
            {staffRoles.map((item) => <option key={item} value={item}>{roleLabels[item]}</option>)}
          </select>
          <Button type="submit" disabled={busy}><UserPlus size={14} /> Give access</Button>
        </form>
        {message && <p className={`mt-3 rounded-xl border p-3 text-xs ${message.tone === "ok" ? "border-emerald-400/15 bg-emerald-400/[.05] text-emerald-300" : "border-rose-400/15 bg-rose-400/[.05] text-rose-300"}`}>{message.text}</p>}
      </Card>

      <Card className="mt-4 overflow-hidden">
        {loading ? (
          <div className="grid min-h-40 place-items-center"><LoaderCircle className="animate-spin text-violet-400" /></div>
        ) : !members.length ? (
          <div className="grid min-h-40 place-items-center text-center"><div><UsersRound size={26} className="mx-auto text-zinc-600" /><p className="mt-2 text-xs text-zinc-500">No team members yet.</p></div></div>
        ) : members.map((member) => {
          const self = member.id === profile?.id;
          return (
            <div key={member.id} className="grid gap-3 border-b border-white/[.05] p-4 last:border-0 sm:grid-cols-[1fr_180px_110px] sm:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm">{member.name || member.email} {self && <span className="text-xs text-zinc-500">(you)</span>}</p>
                <p className="truncate text-[11px] text-zinc-500">{member.email} · joined {formatIst(member.created_at, { dateStyle: "medium" })}</p>
              </div>
              <select value={member.role} disabled={self || busy} onChange={(event) => void assign(member.email, event.target.value as Role)} className="h-9 rounded-lg border border-white/[.08] bg-[var(--panel)] px-2.5 text-xs disabled:opacity-60" aria-label={`Role for ${member.email}`}>
                {staffRoles.map((item) => <option key={item} value={item}>{roleLabels[item]}</option>)}
              </select>
              <Button variant="danger" size="sm" disabled={self || busy} onClick={() => void assign(member.email, "student")}>Remove access</Button>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
