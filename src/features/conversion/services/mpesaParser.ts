import type { PdfTextItem } from "@/types/pdf";
import type { DeclaredStatementTotals, Transaction } from "@/types/transaction";

const RECEIPT_PATTERN = /^[A-Z0-9]{10,12}$/i;
const DATE_PATTERN =
  /((?:\d{4}[\/-]\d{1,2}[\/-]\d{1,2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)/i;
const MONEY_PATTERN = /^-?[\d,]+\.\d{2}$/;
const HEADER_WORDS = [
  "receipt no",
  "completion time",
  "details",
  "transaction status",
  "paid in",
  "withdrawn",
  "balance",
];

type PositionedRow = { y: number; items: PdfTextItem[] };
type ColumnAnchors = {
  paidIn: number;
  withdrawn: number;
  balance: number;
};

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isHeader(text: string) {
  const normalized = text.toLowerCase();
  return HEADER_WORDS.filter((word) => normalized.includes(word)).length >= 2;
}

function groupRows(items: PdfTextItem[]): PositionedRow[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: PositionedRow[] = [];
  const tolerance = 3;

  for (const item of sorted) {
    const row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= tolerance);
    if (row) {
      row.items.push(item);
    } else {
      rows.push({ y: item.y, items: [item] });
    }
  }

  return rows
    .map((row) => ({ ...row, items: row.items.sort((a, b) => a.x - b.x) }))
    .sort((a, b) => b.y - a.y);
}

function parseMoney(value: string | undefined): number | null {
  if (!value || !MONEY_PATTERN.test(value.replace(/\s/g, ""))) return null;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(value: string): string {
  const match = value.match(DATE_PATTERN)?.[1];
  if (!match) return value;

  const normalized = match.replace(/-/g, "/");
  const [datePart, ...timeParts] = normalized.split(/\s+/);
  const dateNumbers = datePart.split("/").map(Number);
  const yearFirst = dateNumbers[0] > 999;
  const day = yearFirst ? dateNumbers[2] : dateNumbers[0];
  const month = dateNumbers[1];
  const rawYear = yearFirst ? dateNumbers[0] : dateNumbers[2];
  const year = rawYear < 100 ? 2000 + rawYear : rawYear;
  const timeText = timeParts.join(" ");
  const timeMatch = timeText.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!timeMatch) return value;

  let hour = Number(timeMatch[1]);
  const marker = timeMatch[4]?.toUpperCase();
  if (marker === "PM" && hour < 12) hour += 12;
  if (marker === "AM" && hour === 12) hour = 0;

  const result = new Date(
    year,
    month - 1,
    day,
    hour,
    Number(timeMatch[2]),
    Number(timeMatch[3] ?? 0),
  );
  return Number.isNaN(result.getTime()) ? value : result.toISOString();
}

function detectColumnAnchors(pages: PdfTextItem[][]): ColumnAnchors | null {
  for (const page of pages) {
    for (const row of groupRows(page)) {
      const rowText = normalize(row.items.map((item) => item.text).join(" ")).toLowerCase();
      if (!rowText.includes("withdrawn") || !rowText.includes("balance")) continue;

      const paidInItem = row.items.find((item) => /paid\s*in/i.test(normalize(item.text)));
      const withdrawnItem = row.items.find((item) => /withdrawn/i.test(normalize(item.text)));
      const balanceItem = row.items.find((item) => /balance/i.test(normalize(item.text)));

      if (
        paidInItem &&
        withdrawnItem &&
        balanceItem &&
        paidInItem.x < withdrawnItem.x &&
        withdrawnItem.x < balanceItem.x
      ) {
        return {
          paidIn: paidInItem.x,
          withdrawn: withdrawnItem.x,
          balance: balanceItem.x,
        };
      }

      // Some generators split "Paid In" into separate text fragments. In an
      // M-PESA header the final three columns are always Paid In, Withdrawn,
      // and Balance, so their ordered positions remain a reliable fallback.
      const rightSideItems = row.items.filter((item) =>
        /paid|in|withdrawn|balance/i.test(normalize(item.text)),
      );
      const uniquePositions = [...new Set(rightSideItems.map((item) => item.x))].sort(
        (a, b) => a - b,
      );
      if (uniquePositions.length >= 3) {
        return {
          paidIn: uniquePositions.at(-3)!,
          withdrawn: uniquePositions.at(-2)!,
          balance: uniquePositions.at(-1)!,
        };
      }
    }
  }
  return null;
}

function amountForColumn(
  items: PdfTextItem[],
  target: number,
  leftBoundary: number,
  rightBoundary: number,
) {
  const candidates = items.filter(
    (item) =>
      item.x >= leftBoundary &&
      item.x < rightBoundary &&
      MONEY_PATTERN.test(normalize(item.text).replace(/\s/g, "")),
  );
  if (!candidates.length) return null;
  const closest = candidates.sort((a, b) => Math.abs(a.x - target) - Math.abs(b.x - target))[0];
  return parseMoney(normalize(closest.text));
}

function parseRow(items: PdfTextItem[], anchors: ColumnAnchors | null): Transaction | null {
  const values = items.map((item) => normalize(item.text)).filter(Boolean);
  const joined = normalize(values.join(" "));
  if (!joined || isHeader(joined)) return null;

  const receiptIndex = values.findIndex((value) => RECEIPT_PATTERN.test(value));
  if (receiptIndex < 0) return null;

  const receiptNo = values[receiptIndex];
  const afterReceipt = values.slice(receiptIndex + 1);
  const dateMatch = joined.match(DATE_PATTERN);
  if (!dateMatch) return null;

  const numericValues = afterReceipt
    .filter((value) => MONEY_PATTERN.test(value.replace(/\s/g, "")))
    .map((value) => parseMoney(value))
    .filter((value): value is number => value !== null);

  if (!numericValues.length) return null;

  const amountValues = numericValues.slice(0, -1);
  const statusIndex = afterReceipt.findIndex((value) =>
    /^(completed|complete|successful|failed|reversed)$/i.test(value),
  );
  const status = statusIndex >= 0 ? afterReceipt[statusIndex] : "";

  const descriptionParts = afterReceipt.filter(
    (value) =>
      !DATE_PATTERN.test(value) &&
      !MONEY_PATTERN.test(value.replace(/\s/g, "")) &&
      value !== status,
  );

  let paidIn: number | null;
  let withdrawn: number | null;
  let balance: number;

  if (anchors) {
    const paidWithdrawnBoundary = (anchors.paidIn + anchors.withdrawn) / 2;
    const withdrawnBalanceBoundary = (anchors.withdrawn + anchors.balance) / 2;
    paidIn = amountForColumn(items, anchors.paidIn, -Infinity, paidWithdrawnBoundary);
    withdrawn = amountForColumn(
      items,
      anchors.withdrawn,
      paidWithdrawnBoundary,
      withdrawnBalanceBoundary,
    );
    balance =
      amountForColumn(items, anchors.balance, withdrawnBalanceBoundary, Infinity) ??
      numericValues.at(-1) ??
      0;
  } else {
    balance = numericValues.at(-1) ?? 0;
    paidIn = amountValues.length >= 2 ? amountValues[0] || null : null;
    withdrawn =
      amountValues.length >= 2 ? amountValues[1] || null : (amountValues[0] ?? null);
  }

  return {
    receiptNo,
    date: parseDate(dateMatch[1]),
    details: normalize(descriptionParts.join(" ")),
    status,
    paidIn,
    withdrawn,
    balance,
  };
}

export function parseMpesaStatement(pages: PdfTextItem[][]): Transaction[] {
  const transactions: Transaction[] = [];
  const seenRows = new Set<string>();
  const anchors = detectColumnAnchors(pages);

  function addIfUnique(transaction: Transaction | null) {
    if (!transaction) return;
    // A receipt can legitimately have multiple rows (for example a payment and
    // its paired "Overdraft of Credit Party" row). Only remove exact repeated
    // rows, which can occur at a page boundary.
    const signature = JSON.stringify([
      transaction.receiptNo,
      transaction.date,
      transaction.details,
      transaction.status,
      transaction.paidIn,
      transaction.withdrawn,
      transaction.balance,
    ]);
    if (seenRows.has(signature)) return;
    seenRows.add(signature);
    transactions.push(transaction);
  }

  for (const page of pages) {
    const rows = groupRows(page);
    let pending: PdfTextItem[] = [];

    for (const row of rows) {
      const startsTransaction = row.items.some((item) => RECEIPT_PATTERN.test(normalize(item.text)));
      if (startsTransaction) {
        if (pending.length) {
          addIfUnique(parseRow(pending, anchors));
        }
        pending = [...row.items];
      } else if (pending.length && !isHeader(row.items.map((item) => item.text).join(" "))) {
        pending.push(...row.items);
      }
    }

    if (pending.length) {
      addIfUnique(parseRow(pending, anchors));
    }
  }

  return transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function transactionSignature(transaction: Transaction) {
  return JSON.stringify([
    transaction.receiptNo,
    transaction.date,
    transaction.details,
    transaction.status,
    transaction.paidIn,
    transaction.withdrawn,
    transaction.balance,
  ]);
}

export function extractDeclaredStatementTotals(
  items: PdfTextItem[],
): DeclaredStatementTotals | null {
  for (const row of groupRows(items)) {
    const values = row.items.map((item) => normalize(item.text)).filter(Boolean);
    const firstValue = values[0]?.replace(/\s+/g, " ");
    if (!/^total\s*:?$/i.test(firstValue ?? "")) continue;

    const amounts = values
      .map(parseMoney)
      .filter((value): value is number => value !== null);
    if (amounts.length < 2) continue;

    return {
      totalPaidIn: Math.abs(amounts.at(-2)!),
      totalWithdrawn: Math.abs(amounts.at(-1)!),
    };
  }
  return null;
}

export type IncrementalParser = {
  addPage: (items: PdfTextItem[]) => {
    addedTransactions: number;
    totalTransactions: number;
  };
  getDeclaredTotals: () => DeclaredStatementTotals | null;
  finish: () => Transaction[];
};

/**
 * Parses and discards one PDF page at a time. Only normalized transactions and
 * compact signatures are retained between pages.
 */
export function createIncrementalMpesaParser(): IncrementalParser {
  const transactions: Transaction[] = [];
  const seenRows = new Set<string>();
  let declaredTotals: DeclaredStatementTotals | null = null;

  return {
    addPage(items) {
      declaredTotals ??= extractDeclaredStatementTotals(items);
      const pageTransactions = parseMpesaStatement([items]);
      let addedTransactions = 0;

      for (const transaction of pageTransactions) {
        const signature = transactionSignature(transaction);
        if (seenRows.has(signature)) continue;
        seenRows.add(signature);
        transactions.push(transaction);
        addedTransactions += 1;
      }

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
