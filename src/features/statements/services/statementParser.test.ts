import { describe, expect, it } from "vitest";
import type { PdfTextItem } from "@/types/pdf";
import { detectStatementProvider } from "@/features/statements/providers/providerRegistry";
import { createStatementParser } from "./statementParser";

function item(text: string, x = 10, y = 700): PdfTextItem {
  return { text, x, y, page: 1 };
}

describe("statement providers", () => {
  it.each([
    ["KCB BANK KENYA LIMITED", "kcb"],
    ["CO-OPERATIVE BANK OF KENYA", "cooperative"],
    ["ABSA BANK KENYA PLC", "absa"],
    ["NCBA BANK KENYA PLC", "ncba"],
    ["EQUITY BANK KENYA", "equity"],
  ])("detects %s as %s", (text, expected) => {
    expect(detectStatementProvider([item(text)])?.id).toBe(expected);
  });

  it("adapts the existing M-PESA parser through the provider interface", () => {
    const session = createStatementParser();
    const result = session.addPage([
      item("M-PESA STATEMENT", 10, 820),
      item("Receipt No", 10, 800),
      item("Completion Time", 90, 800),
      item("Details", 220, 800),
      item("Transaction Status", 420, 800),
      item("Paid In", 500, 800),
      item("Withdrawn", 560, 800),
      item("Balance", 620, 800),
      item("QAA11BB22C", 10),
      item("2026-07-23 06:38:12", 90),
      item("Funds received", 220),
      item("Completed", 420),
      item("100.00", 500),
      item("200.00", 620),
    ]);

    expect(result.provider?.id).toBe("mpesa");
    expect(result.totalTransactions).toBe(1);
    expect(session.finish()[0]).toMatchObject({
      receiptNo: "QAA11BB22C",
      paidIn: 100,
      balance: 200,
    });
  });
});
