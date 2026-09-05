"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[DevOpsCrack] route error", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <main id="main-content" className="grid min-h-[70vh] place-items-center px-6">
      <section className="max-w-md text-center">
        <AlertTriangle className="mx-auto text-amber-300" size={38} />
        <h1 className="mt-5 text-2xl font-semibold">This workspace hit a snag</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">Your progress is safe. Retry the view, or return to the dashboard if the issue continues.</p>
        <button onClick={reset} className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-violet-500 px-5 text-sm font-semibold text-white">
          <RefreshCw size={15} /> Retry
        </button>
      </section>
    </main>
  );
}
