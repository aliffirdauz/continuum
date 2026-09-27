import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  inverse?: boolean;
}

export function BrandMark({ className, inverse = false }: BrandMarkProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "relative grid size-9 place-items-center rounded-xl border",
          inverse
            ? "border-white/20 bg-white/10"
            : "border-emerald-900/10 bg-emerald-950",
        )}
      >
        <span className="absolute h-4 w-2 -translate-x-1 rounded-full border-2 border-emerald-300" />
        <span className="absolute h-4 w-2 translate-x-1 rounded-full border-2 border-emerald-100" />
      </span>
      <span
        className={cn(
          "text-lg font-semibold tracking-tight",
          inverse ? "text-white" : "text-slate-950",
        )}
      >
        Continuum
      </span>
    </div>
  );
}
