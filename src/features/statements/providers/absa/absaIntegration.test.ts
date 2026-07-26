import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createStatementParser } from "@/features/statements/services/statementParser";
import { reconcileStatementTotals } from "@/features/preview/services/reconciliation";
import { summarizeTransactions } from "@/features/preview/services/summary";
import type { PdfTextItem } from "@/types/pdf";

const samplePath = process.env.ABSA_STATEMENT_FIXTURE;

describe.skipIf(!samplePath)("Absa local PDF integration", () => {
  it("detects, parses, and reconciles the authorized local sample", async () => {
    const loadingTask = getDocument({
      url: pathToFileURL(samplePath!).href,
    });
    const pdf = await loadingTask.promise;
    const parser = createStatementParser();

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const items = content.items
        .filter(
          (item): item is typeof item & { str: string; transform: number[] } =>
            "str" in item &&
            typeof item.str === "string" &&
            item.str.trim().length > 0 &&
            "transform" in item &&
            Array.isArray(item.transform),
        )
        .map<PdfTextItem>((item) => ({
          text: item.str.trim(),
          x: Math.round(item.transform[4] * 100) / 100,
          y: Math.round(item.transform[5] * 100) / 100,
          page: pageNumber,
        }));
      parser.addPage(items);
      page.cleanup();
    }

    const transactions = parser.finish();
    const reconciliation = reconcileStatementTotals(
      summarizeTransactions(transactions),
      parser.getDeclaredTotals(),
    );
    expect(parser.getProvider()?.id).toBe("absa");
    expect(transactions.length).toBeGreaterThan(0);
    expect(reconciliation.status).toBe("matched");
    await loadingTask.destroy();
  });
});
