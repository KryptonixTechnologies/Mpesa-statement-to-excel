import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";
import type { StatementSummary, Transaction } from "@/types/transaction";

function safeDate(date: string | null) {
  if (!date) return "unknown";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "unknown";
  return value.toISOString().slice(0, 10);
}

function createFilename(summary: StatementSummary) {
  return `MPESA_Statement_${safeDate(summary.startDate)}_to_${safeDate(summary.endDate)}.xlsx`;
}

export async function createExcelFile(
  transactions: Transaction[],
  summary: StatementSummary,
): Promise<string> {
  const rows = transactions.map((item) => ({
    "Receipt No": item.receiptNo,
    "Completion Time": new Date(item.date),
    Details: item.details,
    "Transaction Status": item.status,
    "Paid In": item.paidIn,
    Withdrawn: item.withdrawn,
    Balance: item.balance,
  }));

  const sheet = XLSX.utils.json_to_sheet(rows, {
    header: [
      "Receipt No",
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

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "M-PESA Transactions");
  workbook.Props = {
    Title: "M-PESA Statement",
    Subject: "Converted M-PESA transactions",
    Author: "M-PESA to Excel",
    CreatedDate: new Date(),
  };

  const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array", compression: true });
  const file = new File(Paths.cache, createFilename(summary));
  file.write(new Uint8Array(bytes));
  return file.uri;
}

export async function shareExcelFile(uri: string) {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error("Sharing is not available on this device.");
  }
  await Sharing.shareAsync(uri, {
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    dialogTitle: "Save or share your Excel statement",
    UTI: "org.openxmlformats.spreadsheetml.sheet",
  });
}
