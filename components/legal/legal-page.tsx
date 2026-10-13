import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/brand";
import { siteConfig } from "@/lib/site-config";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main id="main-content" className="min-h-screen bg-[#09090b] text-zinc-200">
      <header className="border-b border-white/[.06]">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <Brand />
          <Link href="/" className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white"><ArrowLeft size={15} /> Home</Link>
        </div>
      </header>
      <article className="legal-prose mx-auto max-w-3xl px-5 py-12">
        <h1 className="text-3xl font-semibold tracking-[-.03em] text-white sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-zinc-500">Last updated {siteConfig.policyUpdated}</p>
        <div className="mt-8 space-y-6 text-[15px] leading-7 text-zinc-300">{children}</div>
      </article>
    </main>
  );
}

export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-white">{heading}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
