import { describe, expect, it } from "vitest";
import { reconcileStatementTotals } from "./reconciliation";
import type { StatementSummary } from "@/types/transaction";

const actual: StatementSummary = {
  transactionCount: 547,
  startDate: "2026-06-23T00:00:00.000Z",
  endDate: "2026-07-23T00:00:00.000Z",
  totalPaidIn: 98646.53,
  totalWithdrawn: 98646.53,
};

describe("reconcileStatementTotals", () => {
  it("matches totals to the cent", () => {
    expect(
      reconcileStatementTotals(actual, {
        totalPaidIn: 98646.53,
        totalWithdrawn: 98646.53,
      }).status,
    ).toBe("matched");
  });

  it("reports exact differences and blocks mismatches", () => {
    expect(
      reconcileStatementTotals(actual, {
        totalPaidIn: 98600,
        totalWithdrawn: 98000,
      }),
    ).toMatchObject({
      status: "mismatch",
      paidInDifference: 46.53,
      withdrawnDifference: 646.53,
    });
  });

  it("reports unavailable when the PDF has no detectable totals", () => {
    expect(reconcileStatementTotals(actual, null).status).toBe("unavailable");
  });
});
