import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Panel = "list" | "chart" | "pair";

/** A placeholder shaped like the page it stands in for. */
export function PageSkeleton({
  stats = 0,
  panels,
  label = "Loading",
}: {
  stats?: number;
  panels: Panel[];
  label?: string;
}) {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <span className="sr-only">{label}</span>
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-9 w-full max-w-md" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>
      {stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: stats }, (_, index) => (
            <Card key={index} className="space-y-3 p-5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-36" />
            </Card>
          ))}
        </div>
      ) : null}
      {panels.map((panel, index) =>
        panel === "pair" ? (
          <div key={index} className="grid gap-4 lg:grid-cols-2">
            {[0, 1].map((side) => (
              <Card key={side} className="space-y-3 p-5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-2.5 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </Card>
            ))}
          </div>
        ) : panel === "chart" ? (
          <Card key={index} className="grid gap-6 p-5 md:grid-cols-2">
            {[0, 1].map((side) => (
              <div key={side} className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="aspect-[2/1] w-full" />
              </div>
            ))}
          </Card>
        ) : (
          <Card key={index} className="space-y-4 p-5">
            {Array.from({ length: 5 }, (_, row) => (
              <div key={row} className="flex items-center gap-4">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="hidden h-4 w-28 sm:block" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </Card>
        ),
      )}
    </div>
  );
}
