import { formatPercent } from "@/lib/format";

export function CriticalityMeter({ value }: { value: number }) {
  const percent = formatPercent(value);

  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="w-9 text-sm font-semibold text-slate-900 tabular-nums">
        {percent}
      </span>
      <span
        aria-hidden="true"
        className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-200"
      >
        <span
          className="block h-full rounded-full bg-emerald-800"
          style={{ width: percent }}
        />
      </span>
    </span>
  );
}
