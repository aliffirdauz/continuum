import { PageSkeleton } from "@/components/page-skeleton";

export default function Loading() {
  return (
    <PageSkeleton
      panels={["pair", "chart", "list"]}
      label="Loading the transfer plan"
    />
  );
}
