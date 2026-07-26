import { describe, expect, it } from "vitest";
import type { PdfTextItem } from "@/types/pdf";
import { createIncrementalAbsaParser } from "./absaParser";

function item(text: string, x: number, y: number, page = 1): PdfTextItem {
  return { text, x, y, page };
}

const header = [
  item("Txn Date", 75, 650),
  item("Description", 137, 650),
  item("User Narrative", 294, 650),
  item("Money Out", 401, 650),
  item("Money In", 457, 650),
  item("Balance", 513, 650),
];

describe("Absa statement parser", () => {
  it("maps debit, credit, description, reference, and balance columns", () => {
    const parser = createIncrementalAbsaParser();
    const result = parser.addPage([
      ...header,
      item("10/06/2026", 75, 630),
      item("Synthetic debit", 137, 630),
      item("REFERENCE123", 294, 630),
      item("1,250.00", 417, 630),
      item("0.00", 484, 630),
      item("8,750.00", 520, 630),
      item("11/06/2026", 75, 620),
      item("Synthetic credit", 137, 620),
      item("REFERENCE124", 294, 620),
      item("0.00", 432, 620),
      item("2,000.00", 469, 620),
      item("10,750.00", 520, 620),
    ]);

    expect(result.totalTransactions).toBe(2);
    expect(parser.finish()).toMatchObject([
      {
        receiptNo: "REFERENCE123",
        withdrawn: 1250,
        paidIn: null,
        balance: 8750,
      },
      {
        receiptNo: "REFERENCE124",
        withdrawn: null,
        paidIn: 2000,
        balance: 10750,
      },
    ]);
  });

  it("skips opening balance and reads declared debit/credit totals", () => {
    const parser = createIncrementalAbsaParser();
    parser.addPage([
      item("Total Debit Amount:", 75, 730),
      item("1,250.00", 340, 731),
      item("Total Credit Amount:", 75, 710),
      item("2,000.00", 340, 711),
      ...header,
      item("10/06/2026", 75, 630),
      item("OPENING BALANCE", 137, 630),
      item("0.00", 432, 630),
      item("0.00", 484, 630),
      item("10,000.00", 520, 630),
    ]);

    expect(parser.finish()).toEqual([]);
    expect(parser.getDeclaredTotals()).toEqual({
      totalPaidIn: 2000,
      totalWithdrawn: 1250,
    });
  });

  it("deduplicates an exact row repeated at a page boundary", () => {
    const parser = createIncrementalAbsaParser();
    const row = [
      ...header,
      item("10/06/2026", 75, 630),
      item("Synthetic debit", 137, 630),
      item("REFERENCE123", 294, 630),
      item("100.00", 425, 630),
      item("0.00", 484, 630),
      item("900.00", 528, 630),
    ];

    parser.addPage(row);
    parser.addPage(row.map((entry) => ({ ...entry, page: 2 })));
    expect(parser.finish()).toHaveLength(1);
  });
});
