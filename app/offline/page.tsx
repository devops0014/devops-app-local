import Link from "next/link";
import { CloudOff, RefreshCw } from "lucide-react";
import { Brand } from "@/components/brand";

export default function OfflinePage() {
  return (
    <main id="main-content" className="grid min-h-screen place-items-center bg-[#09090b] px-6 text-white">
      <section className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-white/[.035] p-8 text-center shadow-2xl backdrop-blur-xl">
        <div className="flex justify-center"><Brand /></div>
        <CloudOff className="mx-auto mt-10 text-violet-300" size={42} />
        <h1 className="mt-5 text-2xl font-semibold">You’re offline</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">Previously opened learning pages may still be available. Reconnect to sync progress, take quizzes, or start a mock interview.</p>
        <Link href="/dashboard" className="mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-black">
          <RefreshCw size={15} /> Try again
        </Link>
      </section>
    </main>
  );
}
