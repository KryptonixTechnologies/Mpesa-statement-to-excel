import type { PdfTextItem } from "@/types/pdf";
import type { DeclaredStatementTotals, Transaction } from "@/types/transaction";
import type { ProviderParser } from "@/features/statements/providers/types";

const DATE_PATTERN = /^\d{2}\/\d{2}\/\d{4}$/;
const MONEY_PATTERN = /^-?[\d,]+\.\d{2}$/;
const ROW_TOLERANCE = 3;

type PositionedRow = { y: number; items: PdfTextItem[] };
type ColumnAnchors = {
  headerY: number;
  details: number;
  reference: number;
  valueDate: number;
  debit: number;
  credit: number;
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
    const transDate = find(/^Trans Date$/i);
    const details = find(/^Transaction Details$/i);
    const reference = find(/^Reference No$/i);
    const valueDate = find(/^Value Date$/i);
    const debit = find(/^Debit$/i);
    const credit = find(/^Credit$/i);
    const balance = find(/^Book Balance$/i);

    if (transDate && details && reference && valueDate && debit && credit && balance) {
      return {
        headerY: row.y,
        details: details.x,
        reference: reference.x,
        valueDate: valueDate.x,
        debit: debit.x,
        credit: credit.x,
        balance: balance.x,
      };
    }
  }
  return null;
}

function amountInRange(items: PdfTextItem[], left: number, right: number) {
  const item = items.find(
    (candidate) =>
      candidate.x >= left &&
      candidate.x < right &&
      MONEY_PATTERN.test(normalize(candidate.text).replace(/\s/g, "")),
  );
  return parseMoney(item?.text);
}

function parseTransaction(
  items: PdfTextItem[],
  anchors: ColumnAnchors,
  fallbackRowY: number,
): Transaction | null {
  const dateItem = items.find(
    (item) => item.x < anchors.details && DATE_PATTERN.test(normalize(item.text)),
  );
  if (!dateItem) return null;

  const detailItems = items.filter(
    (item) => item.x >= anchors.details - 8 && item.x < anchors.reference,
  );
  const details = normalize(detailItems.map((item) => item.text).join(" "));
  if (!details || /Brought Forward Balance/i.test(details)) return null;

  const reference = normalize(
    items
      .filter((item) => item.x >= anchors.reference && item.x < anchors.valueDate)
      .map((item) => item.text)
      .join(" "),
  );
  const debitCreditBoundary = (anchors.debit + anchors.credit) / 2 + 20;
  const creditBalanceBoundary = (anchors.credit + anchors.balance) / 2 + 20;
  const withdrawn = amountInRange(
    items,
    anchors.debit - 20,
    debitCreditBoundary,
  );
  const paidIn = amountInRange(
    items,
    debitCreditBoundary,
    creditBalanceBoundary,
  );
  const balance = amountInRange(items, creditBalanceBoundary, Infinity);
  if (balance === null) return null;

  return {
    receiptNo:
      reference ||
      `COOP-${dateItem.page}-${Math.round(fallbackRowY * 10)}`,
    date: parseDate(normalize(dateItem.text)),
    details,
    status: "",
    paidIn: paidIn && paidIn !== 0 ? Math.abs(paidIn) : null,
    withdrawn: withdrawn && withdrawn !== 0 ? Math.abs(withdrawn) : null,
    balance,
  };
}

function parsePage(items: PdfTextItem[]) {
  const rows = groupRows(items);
  const anchors = findAnchors(rows);
  if (!anchors) return [];

  const transactions: Transaction[] = [];
  let pendingItems: PdfTextItem[] = [];
  let pendingY = 0;

  function flush() {
    if (!pendingItems.length) return;
    const transaction = parseTransaction(pendingItems, anchors!, pendingY);
    if (transaction) transactions.push(transaction);
    pendingItems = [];
  }

  for (const row of rows) {
    if (row.y >= anchors.headerY - ROW_TOLERANCE) continue;
    const rowText = normalize(row.items.map((item) => item.text).join(" "));
    if (/^Total Value\b/i.test(rowText)) {
      flush();
      break;
    }

    const startsTransaction = row.items.some(
      (item) => item.x < anchors.details && DATE_PATTERN.test(normalize(item.text)),
    );
    if (startsTransaction) {
      flush();
      pendingItems = [...row.items];
      pendingY = row.y;
    } else if (pendingItems.length) {
      pendingItems.push(...row.items);
    }
  }
  flush();
  return transactions;
}

function extractDeclaredTotals(items: PdfTextItem[]): DeclaredStatementTotals | null {
  for (const row of groupRows(items)) {
    const text = normalize(row.items.map((item) => item.text).join(" "));
    if (!/^Total Value\b/i.test(text)) continue;
    const amounts = row.items
      .map((item) => parseMoney(normalize(item.text)))
      .filter((value): value is number => value !== null);
    if (amounts.length < 2) return null;
    return {
      totalPaidIn: Math.abs(amounts.at(-1)!),
      totalWithdrawn: Math.abs(amounts.at(-2)!),
    };
  }
  return null;
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

export function createIncrementalCooperativeParser(): ProviderParser {
  const transactions: Transaction[] = [];
  let previousPageFinalSignature: string | null = null;
  let declaredTotals: DeclaredStatementTotals | null = null;

  return {
    addPage(items) {
      declaredTotals ??= extractDeclaredTotals(items);
      const pageTransactions = parsePage(items);
      let addedTransactions = 0;

      for (const [index, transaction] of pageTransactions.entries()) {
        const key = signature(transaction);
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
