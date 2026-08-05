"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, CircleDollarSign, FileJson, Plus, Search, ShieldCheck, UsersRound } from "lucide-react";
import { RevenueChart } from "@/components/charts";
import { Badge, Button, Card, SectionTitle } from "@/components/ui";
import { AdminGate } from "@/components/access-gate";
import { AIContentEngine } from "@/components/admin/ai-content-engine";
import { QuestionManager } from "@/components/admin/question-manager";
import { PlatformManager } from "@/components/admin/platform-manager";
import { CategoryManager } from "@/components/admin/category-manager";
import { getAdminOverview, listAdminQuestions, type AdminStudent, type AdminSubscription } from "@/lib/repositories/admin-repository";

function AdminContent() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"ai-engine" | "questions" | "students" | "subscriptions" | "audit" | "categories">("ai-engine");
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const managementRef = useRef<HTMLElement>(null);
  const openQuestionManager = () => {
    setTab("questions");
    window.requestAnimationFrame(() => managementRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  useEffect(() => {
    void Promise.all([getAdminOverview(), listAdminQuestions()]).then(([overview, questionRows]) => {
      setStudents(overview.students);
      setSubscriptions(overview.subscriptions);
      setQuestionCount(questionRows.length);
    }).catch(() => {
      // Admin widgets remain empty until Supabase is configured.
    });
  }, []);
  const activeSubscriptions = useMemo(() => subscriptions.filter((item) => item.status === "active"), [subscriptions]);
  const estimatedRevenue = useMemo(() => activeSubscriptions.reduce((total, item) => total + (item.plan === "yearly" ? 999 : item.plan === "half_yearly" ? 799 : 199), 0), [activeSubscriptions]);

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone="violet"><ShieldCheck size={11} className="mr-1" /> Admin access</Badge>
            <span className="text-[9px] text-zinc-700">admin@devopscrack.com</span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-.04em] sm:text-3xl">Control center</h1>
          <p className="mt-2 text-xs text-zinc-500">Manage content, students, subscriptions, and platform performance.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={openQuestionManager}><Plus size={14} /> Manage questions</Button>
        </div>
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total students", value: students.length.toLocaleString(), delta: "Live", icon: UsersRound, color: "text-violet-300 bg-violet-400/10" },
          { label: "Active subscribers", value: activeSubscriptions.length.toLocaleString(), delta: "Live", icon: ShieldCheck, color: "text-emerald-300 bg-emerald-400/10" },
          { label: "Active plan value", value: `₹${estimatedRevenue.toLocaleString("en-IN")}`, delta: "Razorpay", icon: CircleDollarSign, color: "text-cyan-300 bg-cyan-400/10" },
          { label: "Question library", value: questionCount.toLocaleString(), delta: "Live", icon: FileJson, color: "text-amber-300 bg-amber-400/10" },
        ].map((stat) => (
          <Card key={stat.label} className="p-5">
            <div className="flex items-start justify-between">
              <span className={`grid size-10 place-items-center rounded-xl ${stat.color}`}><stat.icon size={18} /></span>
              <Badge tone="green">{stat.delta}</Badge>
            </div>
            <p className="mt-5 text-2xl font-semibold">{stat.value}</p>
            <p className="mt-1 text-[10px] text-zinc-600">{stat.label}</p>
          </Card>
        ))}
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <Card className="p-5">
          <SectionTitle eyebrow="Last 6 months" title="Revenue growth" action={<Badge tone="green"><ArrowUpRight size={10} className="mr-1" /> 128%</Badge>} />
          <div className="mt-5 h-[270px]"><RevenueChart /></div>
        </Card>
        <Card className="p-5">
          <SectionTitle eyebrow="Subscription mix" title="Plan distribution" />
          <div className="mt-7 flex items-center justify-center gap-8">
            <div className="relative size-36 rounded-full" style={{ background: "conic-gradient(#8b5cf6 0 48%, #22d3ee 48% 78%, #f59e0b 78%)" }}>
              <div className="absolute inset-5 grid place-items-center rounded-full bg-[var(--panel)] text-center"><span><span className="block text-xl font-semibold">8.4k</span><span className="text-[9px] text-zinc-600">subscribers</span></span></div>
            </div>
            <div className="space-y-4">
              {[["6 Months", "48%", "bg-violet-500"], ["Yearly", "30%", "bg-cyan-400"], ["Monthly", "22%", "bg-amber-400"]].map(([label, value, color]) => (
                <div key={label} className="flex items-center gap-2 text-[10px]"><span className={`size-2 rounded-full ${color}`} /><span className="w-16 text-zinc-500">{label}</span><span>{value}</span></div>
              ))}
            </div>
          </div>
        </Card>
      </section>

      <section ref={managementRef} className="mt-7 scroll-mt-24">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex rounded-xl border border-white/[.07] bg-white/[.025] p-1">
            {(["ai-engine", "questions", "students", "subscriptions", "audit", "categories"] as const).map((item) => (
              <button key={item} onClick={() => setTab(item)} className={`rounded-lg px-3 py-2 text-[10px] capitalize ${tab === item ? "bg-white/[.07] text-white" : "text-zinc-600"}`}>{item === "ai-engine" ? "AI Engine" : item}</button>
            ))}
          </div>
          <div className="flex h-9 w-full items-center gap-2 rounded-xl border border-white/[.07] bg-white/[.025] px-3 sm:w-64">
            <Search size={13} className="text-zinc-600" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${tab === "ai-engine" ? "content" : tab}...`} className="min-w-0 flex-1 bg-transparent text-[10px] placeholder:text-zinc-700" />
          </div>
        </div>

        {tab === "ai-engine" && <AIContentEngine />}

        {tab === "questions" && <QuestionManager />}

        {tab === "students" && <PlatformManager mode="students" query={query} />}
        {tab === "subscriptions" && <PlatformManager mode="subscriptions" query={query} />}
        {tab === "audit" && <PlatformManager mode="audit" query={query} />}

        {tab === "categories" && <CategoryManager query={query} />}
      </section>

    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminGate>
      <AdminContent />
    </AdminGate>
  );
}
