import { describe, it, expect } from "vitest";
import { computeRunningBalances } from "@/lib/cash-book-utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal entry with sensible defaults. */
function makeEntry(
  overrides: {
    id?: string;
    date?: string;
    createdAt?: string;
    debit?: number | null;
    credit?: number | null;
    reference?: string | null;
  } = {}
) {
  return {
    id: overrides.id ?? "id-1",
    date: overrides.date ?? "2024-01-01",
    createdAt: overrides.createdAt ?? "2024-01-01T00:00:00.000Z",
    debit: overrides.debit ?? null,
    credit: overrides.credit ?? null,
    reference: overrides.reference ?? null,
  };
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe("computeRunningBalances", () => {
  // ── Test 1 ────────────────────────────────────────────────────────────────
  it("1. opening balance only – single debit entry", () => {
    const entries = [makeEntry({ id: "e1", debit: 5000, credit: null })];
    const result = computeRunningBalances(entries);

    expect(result).toHaveLength(1);
    expect(result[0].runningBalance).toBe(5000);
  });

  // ── Test 2 ────────────────────────────────────────────────────────────────
  it("2. income after opening balance: balance grows correctly", () => {
    // Timeline: opening +5000 → expense -150 → income +800
    const entries = [
      makeEntry({ id: "e1", date: "2024-01-01", createdAt: "2024-01-01T08:00:00Z", debit: 5000 }),
      makeEntry({ id: "e2", date: "2024-01-02", createdAt: "2024-01-02T09:00:00Z", credit: 150 }),
      makeEntry({ id: "e3", date: "2024-01-03", createdAt: "2024-01-03T10:00:00Z", debit: 800 }),
    ];

    const result = computeRunningBalances(entries);

    // Sorted chronologically and balanced
    expect(result[0].id).toBe("e1");
    expect(result[0].runningBalance).toBe(5000);  // 0 + 5000

    expect(result[1].id).toBe("e2");
    expect(result[1].runningBalance).toBe(4850);  // 5000 - 150

    expect(result[2].id).toBe("e3");
    expect(result[2].runningBalance).toBe(5650);  // 4850 + 800
  });

  // ── Test 3 ────────────────────────────────────────────────────────────────
  it("3. expense after income: balance is reduced correctly", () => {
    // Timeline: income +800 → expense -150
    const entries = [
      makeEntry({ id: "e2", date: "2024-01-02", createdAt: "2024-01-02T10:00:00Z", credit: 150 }),
      makeEntry({ id: "e1", date: "2024-01-01", createdAt: "2024-01-01T08:00:00Z", debit: 800 }),
    ];

    const result = computeRunningBalances(entries);

    // Despite being passed expense-first, must be sorted by date
    expect(result[0].id).toBe("e1");
    expect(result[0].runningBalance).toBe(800);   // 0 + 800

    expect(result[1].id).toBe("e2");
    expect(result[1].runningBalance).toBe(650);   // 800 - 150
  });

  // ── Test 4 ────────────────────────────────────────────────────────────────
  it("4. multiple incomes and expenses interleaved", () => {
    const entries = [
      makeEntry({ id: "e1", date: "2024-01-01", createdAt: "2024-01-01T00:00:00Z", debit: 1000 }),
      makeEntry({ id: "e2", date: "2024-01-02", createdAt: "2024-01-02T00:00:00Z", credit: 200 }),
      makeEntry({ id: "e3", date: "2024-01-03", createdAt: "2024-01-03T00:00:00Z", debit: 500 }),
      makeEntry({ id: "e4", date: "2024-01-04", createdAt: "2024-01-04T00:00:00Z", credit: 100 }),
      makeEntry({ id: "e5", date: "2024-01-05", createdAt: "2024-01-05T00:00:00Z", debit: 300 }),
    ];

    const result = computeRunningBalances(entries);

    expect(result[0].runningBalance).toBe(1000);  // +1000
    expect(result[1].runningBalance).toBe(800);   // -200
    expect(result[2].runningBalance).toBe(1300);  // +500
    expect(result[3].runningBalance).toBe(1200);  // -100
    expect(result[4].runningBalance).toBe(1500);  // +300
  });

  // ── Test 5 ────────────────────────────────────────────────────────────────
  it("5. descending display order – running balance values are unchanged", () => {
    const entries = [
      makeEntry({ id: "e1", date: "2024-01-01", createdAt: "2024-01-01T00:00:00Z", debit: 5000 }),
      makeEntry({ id: "e2", date: "2024-01-02", createdAt: "2024-01-02T00:00:00Z", credit: 150 }),
      makeEntry({ id: "e3", date: "2024-01-03", createdAt: "2024-01-03T00:00:00Z", debit: 800 }),
    ];

    // computeRunningBalances always returns chronological order
    const chronological = computeRunningBalances(entries);

    // Simulate "newest first" display sort
    const displayDesc = [...chronological].reverse();

    // Running balance values must NOT change when re-sorted for display
    expect(displayDesc[0].id).toBe("e3");
    expect(displayDesc[0].runningBalance).toBe(5650); // final cumulative

    expect(displayDesc[1].id).toBe("e2");
    expect(displayDesc[1].runningBalance).toBe(4850);

    expect(displayDesc[2].id).toBe("e1");
    expect(displayDesc[2].runningBalance).toBe(5000); // earliest
  });

  // ── Test 6 ────────────────────────────────────────────────────────────────
  it("6. ascending display order – running balance values are unchanged", () => {
    const entries = [
      // Pass in descending order intentionally
      makeEntry({ id: "e3", date: "2024-01-03", createdAt: "2024-01-03T00:00:00Z", debit: 800 }),
      makeEntry({ id: "e2", date: "2024-01-02", createdAt: "2024-01-02T00:00:00Z", credit: 150 }),
      makeEntry({ id: "e1", date: "2024-01-01", createdAt: "2024-01-01T00:00:00Z", debit: 5000 }),
    ];

    const result = computeRunningBalances(entries); // returns oldest first

    // Ascending display = same order as result
    expect(result[0].id).toBe("e1");
    expect(result[0].runningBalance).toBe(5000);

    expect(result[1].id).toBe("e2");
    expect(result[1].runningBalance).toBe(4850);

    expect(result[2].id).toBe("e3");
    expect(result[2].runningBalance).toBe(5650);
  });

  // ── Test 7 ────────────────────────────────────────────────────────────────
  it("7. same-date transactions use createdAt then id as tie-breaker", () => {
    const SAME_DATE = "2024-06-15";
    const entries = [
      // createdAt later, but same date
      makeEntry({
        id: "e3",
        date: SAME_DATE,
        createdAt: "2024-06-15T12:00:00Z",
        credit: 50,
      }),
      // createdAt earliest
      makeEntry({
        id: "e1",
        date: SAME_DATE,
        createdAt: "2024-06-15T08:00:00Z",
        debit: 1000,
      }),
      // createdAt middle
      makeEntry({
        id: "e2",
        date: SAME_DATE,
        createdAt: "2024-06-15T10:00:00Z",
        debit: 200,
      }),
    ];

    const result = computeRunningBalances(entries);

    // Must be ordered by createdAt: e1 → e2 → e3
    expect(result[0].id).toBe("e1");
    expect(result[0].runningBalance).toBe(1000);  // +1000

    expect(result[1].id).toBe("e2");
    expect(result[1].runningBalance).toBe(1200);  // +200

    expect(result[2].id).toBe("e3");
    expect(result[2].runningBalance).toBe(1150);  // -50
  });

  // ── Test 8 ────────────────────────────────────────────────────────────────
  it("8. OPENING entry created AFTER other same-day transactions still sorts first", () => {
    // Reproduces the real bug: bank account is created, then expenses/incomes
    // are logged, THEN the opening balance entry is retroactively inserted.
    // Despite having a later createdAt, reference=OPENING must sort first.
    const SAME_DATE = "2026-07-01";

    const entries = [
      // Expense logged first (createdAt: 09:00)
      makeEntry({
        id: "e2",
        date: SAME_DATE,
        createdAt: "2026-07-01T09:00:00Z",
        credit: 200,
        reference: "EXP-0001",
      }),
      // Income logged second (createdAt: 10:00)
      makeEntry({
        id: "e3",
        date: SAME_DATE,
        createdAt: "2026-07-01T10:00:00Z",
        debit: 800,
        reference: "INC-0001",
      }),
      // Opening balance created LAST by cleanup script (createdAt: 11:00)
      // but must still be sorted FIRST
      makeEntry({
        id: "e1",
        date: SAME_DATE,
        createdAt: "2026-07-01T11:00:00Z",
        debit: 5000,
        reference: "OPENING",
      }),
    ];

    const result = computeRunningBalances(entries);

    // Expected chronological order: OPENING → Expense → Income
    expect(result[0].id).toBe("e1");
    expect(result[0].runningBalance).toBe(5000);  // opening: +5000

    expect(result[1].id).toBe("e2");
    expect(result[1].runningBalance).toBe(4800);  // expense: -200

    expect(result[2].id).toBe("e3");
    expect(result[2].runningBalance).toBe(5600);  // income: +800

    // Verify display order (newest first) shows correct balances
    const displayDesc = [...result].reverse();
    expect(displayDesc[0].id).toBe("e3");
    expect(displayDesc[0].runningBalance).toBe(5600); // final balance at top
    expect(displayDesc[1].id).toBe("e2");
    expect(displayDesc[1].runningBalance).toBe(4800);
    expect(displayDesc[2].id).toBe("e1");
    expect(displayDesc[2].runningBalance).toBe(5000); // opening at bottom
  });
});

