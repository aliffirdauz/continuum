import { PageSkeleton } from "@/components/page-skeleton";

export default function Loading() {
  return (
    <PageSkeleton panels={["pair", "pair"]} label="Loading transfer plans" />
  );
}
