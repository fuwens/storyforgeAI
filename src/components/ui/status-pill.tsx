import { cn } from "@/lib/utils";

const toneMap: Record<string, string> = {
  draft: "bg-white/10 text-slate-200",
  generating: "bg-amber-400/20 text-amber-200",
  completed: "bg-emerald-400/20 text-emerald-200",
  archived: "bg-slate-400/20 text-slate-200",
  queued: "bg-slate-400/20 text-slate-100",
  in_progress: "bg-indigo-400/20 text-indigo-100",
  failed: "bg-rose-400/20 text-rose-100",
};

export function StatusPill({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border border-white/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wide",
        toneMap[value] || "bg-white/10 text-white",
      )}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}
