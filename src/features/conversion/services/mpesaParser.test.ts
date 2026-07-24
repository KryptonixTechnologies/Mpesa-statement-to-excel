import { describe, expect, it } from "vitest";
import { parseMpesaStatement } from "./mpesaParser";
import type { PdfTextItem } from "@/types/pdf";

function item(text: string, x: number, y: number, page = 1): PdfTextItem {
  return { text, x, y, width: text.length * 5, page };
}

describe("parseMpesaStatement", () => {
  it("extracts transactions and ignores repeated headers", () => {
    const pages = [
      [
        item("Receipt No Completion Time Details Transaction Status Paid In Withdrawn Balance", 10, 800),
        item("QAA11BB22C", 10, 700),
        item("12/06/2025 08:31:15", 90, 700),
        item("Funds received from TEST USER", 220, 700),
        item("Completed", 420, 700),
        item("1,000.00", 500, 700),
        item("0.00", 560, 700),
        item("2,500.00", 620, 700),
        item("QAA11BB22D", 10, 680),
        item("13/06/2025 09:32:00", 90, 680),
        item("Customer Transfer to SHOP", 220, 680),
        item("Completed", 420, 680),
        item("0.00", 500, 680),
        item("350.00", 560, 680),
        item("2,150.00", 620, 680),
      ],
    ];

    const result = parseMpesaStatement(pages);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      receiptNo: "QAA11BB22C",
      paidIn: 1000,
      withdrawn: null,
      balance: 2500,
    });
    expect(result[1]).toMatchObject({
      receiptNo: "QAA11BB22D",
      paidIn: null,
      withdrawn: 350,
      balance: 2150,
    });
  });

  it("deduplicates receipts repeated across pages", () => {
    const row = [
      item("QAA11BB22C", 10, 700),
      item("12/06/2025 08:31:15", 90, 700),
      item("Funds received", 220, 700),
      item("Completed", 420, 700),
      item("100.00", 500, 700),
      item("0.00", 560, 700),
      item("200.00", 620, 700),
    ];

    expect(parseMpesaStatement([row, row])).toHaveLength(1);
  });

  it("keeps distinct paired rows that share one receipt number", () => {
    const result = parseMpesaStatement([
      [
        item("UGNNJ0HDMR", 10, 700),
        item("2026-07-23 06:38:12", 90, 700),
        item("Customer Send Money", 220, 700),
        item("Completed", 420, 700),
        item("-20.00", 560, 700),
        item("0.00", 620, 700),
        item("UGNNJ0HDMR", 10, 680),
        item("2026-07-23 06:38:12", 90, 680),
        item("Overdraft of Credit Party", 220, 680),
        item("Completed", 420, 680),
        item("20.00", 500, 680),
        item("0.00", 620, 680),
      ],
    ]);

    expect(result).toHaveLength(2);
    expect(result.map((row) => row.details)).toEqual([
      "Customer Send Money",
      "Overdraft of Credit Party",
    ]);
  });

  it("returns no rows for unrelated PDF content", () => {
    expect(parseMpesaStatement([[item("Ordinary PDF document", 10, 700)]])).toEqual([]);
  });

  it("parses ISO-style M-PESA dates without treating the year as the day", () => {
    const result = parseMpesaStatement([
      [
        item("QAA11BB22E", 10, 700),
        item("2026-07-01 05:45:00", 90, 700),
        item("Customer Send Money", 220, 700),
        item("Completed", 420, 700),
        item("50.00", 560, 700),
        item("1,950.00", 620, 700),
      ],
    ]);

    expect(result[0].date.startsWith("2026-07-01")).toBe(true);
  });
});
