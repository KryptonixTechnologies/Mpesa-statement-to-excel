import type { PdfTextItem } from "@/types/pdf";
import type { DeclaredStatementTotals, Transaction } from "@/types/transaction";
import type { ProviderParser } from "@/features/statements/providers/types";

const DATE_PATTERN = /^\d{2}\/\d{2}\/\d{4}$/;
const MONEY_PATTERN = /^-?[\d,]+\.\d{2}$/;
const ROW_TOLERANCE = 3;

type PositionedRow = { y: number; items: PdfTextItem[] };
type ColumnAnchors = {
  headerY: number;
  description: number;
  narrative: number;
  moneyOut: number;
  moneyIn: number;
  balance: number;
};

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function groupRows(items: PdfTextItem[]): PositionedRow[] {
  const rows: PositionedRow[] = [];
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);

  for (const item of sorted) {
    const row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= ROW_TOLERANCE);
    if (row) row.items.push(item);
    else rows.push({ y: item.y, items: [item] });
  }

  return rows
    .map((row) => ({ ...row, items: row.items.sort((a, b) => a.x - b.x) }))
    .sort((a, b) => b.y - a.y);
}

function parseMoney(value: string | undefined) {
  if (!value) return null;
  const compact = value.replace(/\s/g, "");
  if (!MONEY_PATTERN.test(compact)) return null;
  const number = Number(compact.replace(/,/g, ""));
  return Number.isFinite(number) ? number : null;
}

function parseDate(value: string) {
  const [day, month, year] = value.split("/").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function findAnchors(rows: PositionedRow[]): ColumnAnchors | null {
  for (const row of rows) {
    const find = (pattern: RegExp) =>
      row.items.find((item) => pattern.test(normalize(item.text)));
    const date = find(/^Txn Date$/i);
    const description = find(/^Description$/i);
    const narrative = find(/^User Narrative$/i);
    const moneyOut = find(/^Money Out$/i);
    const moneyIn = find(/^Money In$/i);
    const balance = find(/^Balance$/i);

    if (date && description && narrative && moneyOut && moneyIn && balance) {
      return {
        headerY: row.y,
        description: description.x,
        narrative: narrative.x,
        moneyOut: moneyOut.x,
        moneyIn: moneyIn.x,
        balance: balance.x,
      };
    }
  }
  return null;
}

function amountInRange(items: PdfTextItem[], left: number, right: number) {
  const value = items.find(
    (item) =>
      item.x >= left &&
      item.x < right &&
      MONEY_PATTERN.test(normalize(item.text).replace(/\s/g, "")),
  );
  return parseMoney(value?.text);
}

function rowReference(items: PdfTextItem[], fallback: string) {
  const narrative = normalize(items.map((item) => item.text).join(" "));
  const candidate = narrative.match(/\b(?=[A-Z0-9]*\d)[A-Z0-9]{8,}\b/i)?.[0];
  return candidate ?? fallback;
}

function parsePage(items: PdfTextItem[]): Transaction[] {
  const rows = groupRows(items);
  const anchors = findAnchors(rows);
  if (!anchors) return [];

  // Absa values are right-aligned within their cells. Their text X coordinate
  // moves left as the number grows, so boundaries need to sit after the
  // header midpoints rather than using the header starts directly.
  const debitCreditBoundary = (anchors.moneyOut + anchors.moneyIn) / 2 + 20;
  const creditBalanceBoundary = (anchors.moneyIn + anchors.balance) / 2 + 24;
  const transactions: Transaction[] = [];

  for (const row of rows) {
    if (row.y >= anchors.headerY - ROW_TOLERANCE) continue;
    const dateItem = row.items.find((item) => DATE_PATTERN.test(normalize(item.text)));
    if (!dateItem) continue;

    const descriptionItems = row.items.filter(
      (item) => item.x >= anchors.description - 8 && item.x < anchors.moneyOut,
    );
    const details = normalize(descriptionItems.map((item) => item.text).join(" "));
    if (!details || /^OPENING BALANCE$/i.test(details)) continue;

    const withdrawn =
      amountInRange(
        row.items,
        anchors.moneyOut,
        debitCreditBoundary,
      ) ?? null;
    const paidIn =
      amountInRange(
        row.items,
        debitCreditBoundary,
        creditBalanceBoundary,
      ) ?? null;
    const balance =
      amountInRange(row.items, creditBalanceBoundary, Infinity) ?? null;
    if (balance === null) continue;

    const parsedDate = parseDate(normalize(dateItem.text));
    transactions.push({
      receiptNo: rowReference(
        descriptionItems,
        `ABSA-${dateItem.page}-${Math.round(row.y * 10)}`,
      ),
      date: parsedDate,
      details,
      status: "",
      paidIn: paidIn && paidIn !== 0 ? Math.abs(paidIn) : null,
      withdrawn: withdrawn && withdrawn !== 0 ? Math.abs(withdrawn) : null,
      balance,
    });
  }

  return transactions;
}

function extractDeclaredTotals(items: PdfTextItem[]): DeclaredStatementTotals | null {
  const rows = groupRows(items);
  let totalDebit: number | null = null;
  let totalCredit: number | null = null;

  for (const row of rows) {
    const text = normalize(row.items.map((item) => item.text).join(" "));
    const amounts = row.items
      .map((item) => parseMoney(normalize(item.text)))
      .filter((value): value is number => value !== null);
    if (/Total Debit Amount/i.test(text)) totalDebit = amounts.at(-1) ?? null;
    if (/Total Credit Amount/i.test(text)) totalCredit = amounts.at(-1) ?? null;
  }

  if (totalDebit === null || totalCredit === null) return null;
  return {
    totalPaidIn: Math.abs(totalCredit),
    totalWithdrawn: Math.abs(totalDebit),
  };
}

function signature(transaction: Transaction) {
  return JSON.stringify([
    transaction.receiptNo,
    transaction.date,
    transaction.details,
    transaction.paidIn,
    transaction.withdrawn,
    transaction.balance,
  ]);
}

export function createIncrementalAbsaParser(): ProviderParser {
  const transactions: Transaction[] = [];
  let previousPageFinalSignature: string | null = null;
  let declaredTotals: DeclaredStatementTotals | null = null;

  return {
    addPage(items) {
      declaredTotals ??= extractDeclaredTotals(items);
      let addedTransactions = 0;
      const pageTransactions = parsePage(items);

      for (const [index, transaction] of pageTransactions.entries()) {
        const key = signature(transaction);
        // Some PDF generators repeat the final row at the top of the next
        // page. Remove only that boundary duplicate. Do not globally dedupe:
        // bank statements can contain legitimate identical transaction rows.
        if (index === 0 && key === previousPageFinalSignature) continue;
        transactions.push(transaction);
        addedTransactions += 1;
      }
      previousPageFinalSignature = pageTransactions.length
        ? signature(pageTransactions.at(-1)!)
        : previousPageFinalSignature;

      return { addedTransactions, totalTransactions: transactions.length };
    },
    getDeclaredTotals() {
      return declaredTotals;
    },
    finish() {
      return [...transactions].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
    },
  };
}
