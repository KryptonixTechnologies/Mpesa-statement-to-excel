import { describe, expect, it } from "vitest";
import { summarizeTransactions } from "./summary";

describe("summarizeTransactions", () => {
  it("calculates the period and totals", () => {
    const result = summarizeTransactions([
      {
        receiptNo: "ONE",
        date: "2025-06-13T08:00:00.000Z",
        details: "Outgoing",
        status: "Completed",
        paidIn: null,
        withdrawn: 250,
        balance: 750,
      },
      {
        receiptNo: "TWO",
        date: "2025-06-12T08:00:00.000Z",
        details: "Incoming",
        status: "Completed",
        paidIn: 1000,
        withdrawn: null,
        balance: 1000,
      },
    ]);

    expect(result.transactionCount).toBe(2);
    expect(result.totalPaidIn).toBe(1000);
    expect(result.totalWithdrawn).toBe(250);
    expect(result.startDate).toBe("2025-06-12T08:00:00.000Z");
    expect(result.endDate).toBe("2025-06-13T08:00:00.000Z");
  });
});
