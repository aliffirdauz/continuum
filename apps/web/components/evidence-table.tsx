import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EvidenceItem } from "@/lib/api-types";
import { evidenceTypeLabels, formatDate } from "@/lib/format";

interface EvidenceTableProps {
  caption: string;
  evidence: EvidenceItem[];
  // The related record the page is not already about.
  context: "person" | "knowledgeArea";
}

export function EvidenceTable({
  caption,
  evidence,
  context,
}: EvidenceTableProps) {
  return (
    <Table>
      <TableCaption>{caption}</TableCaption>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead scope="col">Evidence</TableHead>
          <TableHead scope="col" className="hidden md:table-cell">
            Type
          </TableHead>
          <TableHead scope="col" className="hidden sm:table-cell">
            {context === "person" ? "Person" : "Knowledge area"}
          </TableHead>
          <TableHead scope="col" className="text-right">
            Date
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {evidence.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="min-w-56">
              <p className="font-medium text-slate-900">{item.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {item.source}
                {item.sourceReference ? ` · ${item.sourceReference}` : null}
                <span className="md:hidden">
                  {` · ${evidenceTypeLabels[item.type]}`}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-slate-600 sm:hidden">
                {context === "person"
                  ? item.employee.name
                  : item.knowledgeArea.name}
              </p>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              <Badge className="whitespace-nowrap">
                {evidenceTypeLabels[item.type]}
              </Badge>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              {context === "person" ? (
                <Link
                  href={`/people/${item.employee.id}`}
                  className="font-medium text-slate-800 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:outline-none"
                >
                  {item.employee.name}
                </Link>
              ) : (
                <Link
                  href={`/knowledge/${item.knowledgeArea.id}`}
                  className="font-medium text-slate-800 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:outline-none"
                >
                  {item.knowledgeArea.name}
                </Link>
              )}
            </TableCell>
            <TableCell className="text-right whitespace-nowrap tabular-nums">
              <time dateTime={item.occurredAt}>
                {formatDate(item.occurredAt)}
              </time>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
