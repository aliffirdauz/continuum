import { PageSkeleton } from "@/components/page-skeleton";

export default function Loading() {
  return (
    <PageSkeleton
      stats={4}
      panels={["pair", "pair", "list"]}
      label="Loading the simulation result"
    />
  );
}
