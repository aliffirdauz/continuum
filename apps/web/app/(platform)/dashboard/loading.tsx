import { PageSkeleton } from "@/components/page-skeleton";

export default function Loading() {
  return (
    <PageSkeleton
      stats={4}
      panels={["list", "pair", "list"]}
      label="Loading the risk overview"
    />
  );
}
