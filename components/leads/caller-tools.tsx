"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, ChevronDown, Copy, Mail, MessageCircle, PhoneOff, ScrollText, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui";
import { topicLabel, type Lead } from "@/lib/leads";
import {
  blockedNoticeTemplate, fillTemplate, firstNameOf, mailtoLink, messageTemplates, whatsappLink, type MessageTemplate,
} from "@/lib/message-templates";
import { blockLead, type BlockReason } from "@/lib/repositories/leads-repository";
import { cn } from "@/lib/utils";

function siteUrl() {
  return typeof window === "undefined" ? "" : window.location.origin;
}

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied((value) => (value === key ? null : value)), 1500);
    } catch {
      window.prompt("Copy this message:", text);
    }
  };
  return { copied, copy };
}

/** Ready-made WhatsApp / email messages and a call script, filled in for this student. */
export function QuickMessages({ lead, callerName }: { lead: Lead; callerName: string | null }) {
  const [open, setOpen] = useState<string | null>(null);
  const { copied, copy } = useCopy();
  const context = {
    firstName: firstNameOf(lead.name),
    caller: callerName,
    topic: topicLabel(lead.profile.interestTopic),
    email: lead.email,
    phone: lead.mobile,
    siteUrl: siteUrl(),
  };

  return (
    <div className="mt-5">
      <p className="mb-2 text-xs font-medium uppercase tracking-[.12em] text-zinc-500">Quick messages</p>
      <ul className="divide-y divide-white/[.06] rounded-xl border border-white/[.07]">
        {messageTemplates.map((template) => {
          const body = fillTemplate(template.body, context);
          const subject = template.subject ? fillTemplate(template.subject, context) : "";
          const isOpen = open === template.id;
          return (
            <li key={template.id}>
              <button onClick={() => setOpen(isOpen ? null : template.id)} aria-expanded={isOpen} className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
                <ChannelIcon channel={template.channel} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-zinc-100">{template.title}</span>
                  <span className="block truncate text-xs text-zinc-500">{template.when}</span>
                </span>
                <ChevronDown size={16} className={cn("shrink-0 text-zinc-500 transition-transform", isOpen && "rotate-180")} />
              </button>
              {isOpen && (
                <div className="px-3 pb-3">
                  {subject && <p className="mb-1.5 text-xs text-zinc-400">Subject: <span className="text-zinc-200">{subject}</span></p>}
                  <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-white/[.06] bg-black/30 p-3 font-sans text-sm leading-6 text-zinc-200">{body}</pre>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {template.channel === "whatsapp" && lead.mobile && !lead.doNotContact && (
                      <a href={whatsappLink(lead.mobile, body)} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 text-sm text-emerald-200 hover:bg-emerald-500/25">
                        <MessageCircle size={14} /> Send on WhatsApp
                      </a>
                    )}
                    {template.channel === "email" && !lead.doNotContact && (
                      <a href={mailtoLink(lead.email, subject, body)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-violet-500/15 px-3 text-sm text-violet-200 hover:bg-violet-500/25">
                        <Mail size={14} /> Open in email
                      </a>
                    )}
                    <button onClick={() => void copy(template.id, subject ? `Subject: ${subject}\n\n${body}` : body)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/[.1] px-3 text-sm text-zinc-300 hover:text-white">
                      {copied === template.id ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ChannelIcon({ channel }: { channel: MessageTemplate["channel"] }) {
  const map = {
    whatsapp: { Icon: MessageCircle, className: "bg-emerald-400/10 text-emerald-300", label: "WhatsApp" },
    email: { Icon: Mail, className: "bg-violet-400/10 text-violet-300", label: "Email" },
    script: { Icon: ScrollText, className: "bg-sky-400/10 text-sky-300", label: "Call script" },
  }[channel];
  return <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", map.className)} title={map.label}><map.Icon size={15} /></span>;
}

const reasonLabels: Record<BlockReason, string> = {
  unreachable: "Number doesn't exist / switched off for days",
  someone_else: "Number belongs to someone else",
  fake: "Clearly fake number (e.g. 9999999999)",
};

export type BlockedResult = { name: string | null; email: string | null; phone: string | null };

/** "Wrong number" → remove the account and block the number, then send the notice. */
export function WrongNumberPanel({ lead, onBlocked }: { lead: Lead; onBlocked: (result: BlockedResult) => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<BlockReason | "">("");
  const [note, setNote] = useState("");
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!reason) return;
    setBusy(true);
    setError("");
    try {
      const result = await blockLead(lead.id, reason, note);
      onBlocked({ name: result.name, email: result.email, phone: result.phone });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove the account.");
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-5 inline-flex items-center gap-2 text-sm text-rose-300 hover:text-rose-200">
        <PhoneOff size={15} /> Wrong number? Remove this account
      </button>
    );
  }

  return (
    <div className="mt-5 rounded-xl border border-rose-400/25 bg-rose-400/[.05] p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-rose-100"><ShieldAlert size={16} /> Remove account for wrong number</p>
      <p className="mt-1 text-xs leading-5 text-zinc-400">This permanently deletes {lead.name || "the student"}&rsquo;s account and progress, and blocks {lead.mobile ?? "this number"} from being used again. You&rsquo;ll then send them the formal notice by email.</p>
      <fieldset className="mt-3 space-y-1.5">
        <legend className="sr-only">Reason</legend>
        {(Object.keys(reasonLabels) as BlockReason[]).map((key) => (
          <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-zinc-200">
            <input type="radio" name="block-reason" checked={reason === key} onChange={() => setReason(key)} className="accent-rose-400" />
            {reasonLabels[key]}
          </label>
        ))}
      </fieldset>
      <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} maxLength={500} placeholder="Optional note, e.g. called 3 times on different days" className="mt-3 w-full resize-none rounded-lg border border-white/[.1] bg-black/20 p-2.5 text-sm text-zinc-100 placeholder:text-zinc-500" />
      <label className="mt-2 flex cursor-pointer items-start gap-2 text-xs leading-5 text-zinc-300">
        <input type="checkbox" checked={sure} onChange={(event) => setSure(event.target.checked)} className="mt-0.5 accent-rose-400" />
        I tried this number and I&rsquo;m sure it&rsquo;s wrong. Delete the account.
      </label>
      {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
      <div className="mt-3 flex gap-2">
        <Button variant="danger" size="sm" disabled={!reason || !sure || busy} onClick={() => void submit()}>{busy ? "Removing…" : "Remove account & block number"}</Button>
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => { setOpen(false); setReason(""); setSure(false); setError(""); }}>Cancel</Button>
      </div>
    </div>
  );
}

/** Shown after blocking: the formal notice, ready to send by email. */
export function BlockedNoticeDialog({ result, callerName, onClose }: { result: BlockedResult | null; callerName: string | null; onClose: () => void }) {
  const { copied, copy } = useCopy();
  const context = { firstName: firstNameOf(result?.name), caller: callerName, email: result?.email, phone: result?.phone, siteUrl: siteUrl() };
  const subject = fillTemplate(blockedNoticeTemplate.subject ?? "", context);
  const body = fillTemplate(blockedNoticeTemplate.body, context);

  return (
    <Dialog.Root open={Boolean(result)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[95] bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[100] max-h-[90vh] w-[calc(100%-24px)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/10 bg-[var(--panel)] p-6 shadow-[0_35px_120px_rgba(0,0,0,.6)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-lg font-semibold">Account removed</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-zinc-400">{result?.phone ?? "The number"} is now blocked. Send {firstNameOf(result?.name) ?? "the student"} this notice so they know why.</Dialog.Description>
            </div>
            <Dialog.Close className="grid size-9 shrink-0 place-items-center rounded-xl text-zinc-400 hover:bg-white/[.06]" aria-label="Close"><X size={18} /></Dialog.Close>
          </div>
          <p className="mt-4 text-xs text-zinc-400">To: <span className="text-zinc-200">{result?.email}</span></p>
          <p className="mt-1 text-xs text-zinc-400">Subject: <span className="text-zinc-200">{subject}</span></p>
          <pre className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg border border-white/[.06] bg-black/30 p-3 font-sans text-sm leading-6 text-zinc-200">{body}</pre>
          <div className="mt-4 flex flex-wrap gap-2">
            {result?.email && (
              <a href={mailtoLink(result.email, subject, body)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400"><Mail size={15} /> Open in email</a>
            )}
            <button onClick={() => void copy("notice", `To: ${result?.email ?? ""}\nSubject: ${subject}\n\n${body}`)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[.12] px-4 text-sm text-zinc-200 hover:text-white">
              {copied === "notice" ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy message</>}
            </button>
          </div>
          <p className="mt-4 text-xs leading-5 text-zinc-500">If they try to sign in again, they&rsquo;ll also see a message asking them to create a new account with their own mobile number.</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
