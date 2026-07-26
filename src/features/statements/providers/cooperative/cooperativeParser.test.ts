import { describe, expect, it } from "vitest";
import type { PdfTextItem } from "@/types/pdf";
import { createIncrementalCooperativeParser } from "./cooperativeParser";

function item(text: string, x: number, y: number, page = 1): PdfTextItem {
  return { text, x, y, page };
}

const header = [
  item("Trans Date", 48, 940),
  item("Transaction Details", 119, 940),
  item("Reference No", 404, 940),
  item("Value Date", 544, 940),
  item("Debit", 682, 940),
  item("Credit", 786, 940),
  item("Book Balance", 892, 940),
];

describe("Co-operative Bank statement parser", () => {
  it("maps rows and retains wrapped transaction details", () => {
    const parser = createIncrementalCooperativeParser();
    parser.addPage([
      ...header,
      item("20/07/2026", 48, 900),
      item("Synthetic merchant", 119, 900),
      item("REF0000001", 406, 900),
      item("20/07/2026", 546, 900),
      item("250.00", 678, 900),
      item("0.00", 798, 900),
      item("750.00", 899, 900),
      item("continued detail", 119, 890),
      item("21/07/2026", 48, 870),
      item("Synthetic credit", 119, 870),
      item("REF0000002", 406, 870),
      item("21/07/2026", 546, 870),
      item("0.00", 690, 870),
      item("500.00", 790, 870),
      item("1,250.00", 890, 870),
      item("Total Value", 234, 840),
      item("250.00", 677, 840),
      item("500.00", 790, 840),
    ]);

    expect(parser.finish()).toMatchObject([
      {
        receiptNo: "REF0000001",
        details: "Synthetic merchant continued detail",
        withdrawn: 250,
        paidIn: null,
        balance: 750,
      },
      {
        receiptNo: "REF0000002",
        withdrawn: null,
        paidIn: 500,
        balance: 1250,
      },
    ]);
    expect(parser.getDeclaredTotals()).toEqual({
      totalPaidIn: 500,
      totalWithdrawn: 250,
    });
  });

  it("skips the brought-forward balance row", () => {
    const parser = createIncrementalCooperativeParser();
    parser.addPage([
      ...header,
      item("20/07/2026", 48, 900),
      item("Brought Forward Balance", 119, 900),
      item("0.00", 690, 900),
      item("0.00", 798, 900),
      item("1,000.00", 890, 900),
      item("Total Value", 234, 870),
      item("0.00", 690, 870),
      item("0.00", 798, 870),
    ]);
    expect(parser.finish()).toEqual([]);
  });
});
