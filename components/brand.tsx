import Link from "next/link";
import { TerminalSquare } from "lucide-react";

export function Brand({ compact = false, href = "/" }: { compact?: boolean; href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5" aria-label={href === "/dashboard" ? "DevOpsCrack dashboard" : "DevOpsCrack home"}>
      <span className="brand-glow grid size-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 text-white transition-transform group-hover:-rotate-3">
        <TerminalSquare size={19} strokeWidth={2.4} />
      </span>
      {!compact && (
        <span className="text-[17px] font-semibold tracking-[-0.04em]">
          DevOps<span className="text-violet-400">Crack</span>
        </span>
      )}
    </Link>
  );
}
