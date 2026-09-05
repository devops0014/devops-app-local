import Link from "next/link";
import { ArrowLeft, Radar } from "lucide-react";

export default function NotFound() {
  return (
    <main id="main-content" className="grid min-h-screen place-items-center bg-[#09090b] px-6 text-white">
      <section className="text-center">
        <Radar className="mx-auto text-cyan-300" size={44} />
        <p className="mt-5 font-mono text-xs uppercase tracking-[.2em] text-violet-300">404 · route not found</p>
        <h1 className="mt-3 text-3xl font-semibold">This deployment path doesn’t exist.</h1>
        <Link href="/" className="mt-7 inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-white"><ArrowLeft size={15} /> Return home</Link>
      </section>
    </main>
  );
}
