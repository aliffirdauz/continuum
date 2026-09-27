export interface EvidenceGroupRow<K extends string = string> {
  key: string;
  subKey: K;
  count: number;
  lastOccurredAt: Date | null;
}

export interface EvidenceRollup<K extends string = string> {
  evidenceCount: number;
  lastEvidenceAt: Date | null;
  breakdown: Array<{ key: K; count: number }>;
}

export const emptyRollup: EvidenceRollup<never> = {
  evidenceCount: 0,
  lastEvidenceAt: null,
  breakdown: [],
};

/**
 * Rolls grouped evidence counts up to one summary per key, merging repeated
 * sub-keys. The breakdown is ordered by count, then key, so responses are
 * deterministic.
 */
export function rollUpEvidence<K extends string>(
  rows: ReadonlyArray<EvidenceGroupRow<K>>,
): Map<string, EvidenceRollup<K>> {
  const rollups = new Map<string, EvidenceRollup<K>>();

  for (const row of rows) {
    const rollup = rollups.get(row.key) ?? {
      evidenceCount: 0,
      lastEvidenceAt: null,
      breakdown: [],
    };
    const entry = rollup.breakdown.find(({ key }) => key === row.subKey);

    rollup.evidenceCount += row.count;
    if (entry) {
      entry.count += row.count;
    } else {
      rollup.breakdown.push({ key: row.subKey, count: row.count });
    }
    if (
      row.lastOccurredAt &&
      (!rollup.lastEvidenceAt || row.lastOccurredAt > rollup.lastEvidenceAt)
    ) {
      rollup.lastEvidenceAt = row.lastOccurredAt;
    }

    rollups.set(row.key, rollup);
  }

  for (const rollup of rollups.values()) {
    rollup.breakdown.sort(
      (left, right) =>
        right.count - left.count || left.key.localeCompare(right.key),
    );
  }

  return rollups;
}
