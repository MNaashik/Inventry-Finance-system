/**
 * Cash Book Running Balance Utility
 *
 * Implements standard accounting running balance calculation.
 * The running balance is ALWAYS computed in chronological order
 * (date ASC, then OPENING entries first, then createdAt ASC) regardless
 * of how the UI displays the rows.
 *
 * Algorithm:
 *   1. Sort entries: date ASC → OPENING reference first → createdAt ASC → id ASC
 *   2. Walk the sorted list accumulating: balance += debit - credit
 *   3. Attach the computed runningBalance to each entry
 *   4. Return entries in the same chronological order (caller decides display order)
 */

export interface CashBookEntryInput {
  id: string;
  date: Date | string;
  createdAt: Date | string;
  debit: number | null;
  credit: number | null;
  reference?: string | null;
}

export interface CashBookEntryWithBalance extends CashBookEntryInput {
  runningBalance: number;
}

/**
 * Computes the running balance for a collection of cash book entries.
 *
 * @param entries  Raw entries (any order).
 * @param openingBalance  Starting balance before the first entry (default 0).
 * @returns  The same entries enriched with `runningBalance`, sorted
 *           chronologically (oldest first).  The caller is responsible
 *           for reversing / re-sorting for display purposes.
 */
export function computeRunningBalances<T extends CashBookEntryInput>(
  entries: T[],
  openingBalance = 0
): Array<T & { runningBalance: number }> {
  // Step 1 – sort chronologically with OPENING entries always first on same date
  const sorted = [...entries].sort((a, b) => {
    // Primary: transaction date ascending
    const dateDiff =
      new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateDiff !== 0) return dateDiff;

    // Secondary: OPENING entries always come before all others on the same date
    const aIsOpening = a.reference === "OPENING" ? 0 : 1;
    const bIsOpening = b.reference === "OPENING" ? 0 : 1;
    if (aIsOpening !== bIsOpening) return aIsOpening - bIsOpening;

    // Tertiary: createdAt ascending
    const createdDiff =
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (createdDiff !== 0) return createdDiff;

    // Final tie-breaker: lexicographic id order
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  // Step 2 – accumulate running balance
  let balance = openingBalance;
  return sorted.map((entry) => {
    const debit = entry.debit ?? 0;
    const credit = entry.credit ?? 0;
    balance += debit - credit;
    return Object.assign({}, entry, { runningBalance: balance }) as T & { runningBalance: number };
  });
}
