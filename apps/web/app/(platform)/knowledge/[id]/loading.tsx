import { PageSkeleton } from "@/components/page-skeleton";

export default function Loading() {
  return (
    <PageSkeleton
      stats={4}
      panels={["pair", "list", "list"]}
      label="Loading the knowledge area"
    />
  );
}
