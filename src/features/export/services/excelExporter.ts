import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { StatementSummary, Transaction } from "@/types/transaction";
import { PerformanceTrace } from "@/utils/performance";
import { isGeneratedWorkbookName } from "@/features/export/services/cachePolicy";
import type { RegisteredStatementProvider } from "@/features/statements/providers/types";

function safeDate(date: string | null) {
  if (!date) return "unknown";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "unknown";
  return value.toISOString().slice(0, 10);
}

function createFilename(
  summary: StatementSummary,
  provider: RegisteredStatementProvider,
) {
  return `Statement_Excel_Kenya_${provider.shortName}_${safeDate(summary.startDate)}_to_${safeDate(summary.endDate)}.xlsx`;
}

function removeStaleWorkbooks(keepFilename: string) {
  let removed = 0;
  try {
    for (const entry of Paths.cache.list()) {
      if (
        entry instanceof File &&
        entry.name !== keepFilename &&
        isGeneratedWorkbookName(entry.name)
      ) {
        entry.delete();
        removed += 1;
      }
    }
  } catch {
    // Cache cleanup must never prevent the user from exporting.
  }
  return removed;
}

export async function createExcelFile(
  transactions: Transaction[],
  summary: StatementSummary,
  provider: RegisteredStatementProvider,
): Promise<string> {
  const performance = new PerformanceTrace("export");
  performance.start("total");
  const filename = createFilename(summary, provider);
  performance.start("cache.cleanup");
  const removedWorkbooks = removeStaleWorkbooks(filename);
  performance.end("cache.cleanup", { removedWorkbooks });
  performance.start("engine.load");
  // SheetJS is one of the largest JavaScript modules in the app. Loading it
  // only after the user requests export keeps preview scrolling responsive and
  // lowers memory pressure during normal review.
  const XLSX = await import("xlsx");
  performance.end("engine.load");
  performance.start("rows.prepare");
  const rows = transactions.map((item) => ({
    Reference: item.receiptNo,
    "Completion Time": new Date(item.date),
    Details: item.details,
    "Transaction Status": item.status,
    "Paid In": item.paidIn,
    Withdrawn: item.withdrawn,
    Balance: item.balance,
  }));
  performance.end("rows.prepare", { transactions: transactions.length });

  performance.start("worksheet.create");
  const sheet = XLSX.utils.json_to_sheet(rows, {
    header: [
      "Reference",
      "Completion Time",
      "Details",
      "Transaction Status",
      "Paid In",
      "Withdrawn",
      "Balance",
    ],
    cellDates: true,
  });

  sheet["!cols"] = [
    { wch: 16 },
    { wch: 21 },
    { wch: 52 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
  ];
  sheet["!autofilter"] = { ref: `A1:G${rows.length + 1}` };

  for (const column of ["A", "B", "C", "D", "E", "F", "G"]) {
    if (sheet[`${column}1`]) {
      sheet[`${column}1`].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "087A3E" } },
      };
    }
  }

  for (let row = 2; row <= rows.length + 1; row += 1) {
    if (sheet[`B${row}`]) sheet[`B${row}`].z = "dd/mm/yyyy hh:mm";
    for (const column of ["E", "F", "G"]) {
      if (sheet[`${column}${row}`]) sheet[`${column}${row}`].z = '#,##0.00';
    }
  }
  performance.end("worksheet.create", { rows: rows.length });

  performance.start("workbook.serialize");
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, `${provider.shortName} Transactions`);
  workbook.Props = {
    Title: `${provider.displayName} Statement`,
    Subject: `Converted ${provider.displayName} transactions`,
    Author: "Statement to Excel Kenya",
    CreatedDate: new Date(),
  };

  const serialized = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
    compression: true,
  });
  const bytes =
    serialized instanceof Uint8Array ? serialized : new Uint8Array(serialized);
  performance.end("workbook.serialize", { bytes: bytes.byteLength });
  performance.start("file.write");
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.write(bytes);
  performance.end("file.write", { bytes: bytes.byteLength });
  performance.end("total", { transactions: transactions.length, bytes: bytes.byteLength });
  return file.uri;
}

export async function shareExcelFile(uri: string) {
  const performance = new PerformanceTrace("export");
  performance.start("share.sheet");
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error("Sharing is not available on this device.");
  }
  await Sharing.shareAsync(uri, {
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    dialogTitle: "Save or share your Excel statement",
    UTI: "org.openxmlformats.spreadsheetml.sheet",
  });
  performance.end("share.sheet");
}
