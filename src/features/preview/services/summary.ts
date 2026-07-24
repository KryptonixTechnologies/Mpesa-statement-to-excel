import type { StatementSummary, Transaction } from "@/types/transaction";

export function summarizeTransactions(transactions: Transaction[]): StatementSummary {
  const validDates = transactions
    .map((transaction) => new Date(transaction.date))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  return {
    transactionCount: transactions.length,
    startDate: validDates[0]?.toISOString() ?? null,
    endDate: validDates.at(-1)?.toISOString() ?? null,
    totalPaidIn: transactions.reduce((sum, item) => sum + (item.paidIn ?? 0), 0),
    totalWithdrawn: transactions.reduce(
      (sum, item) => sum + Math.abs(item.withdrawn ?? 0),
      0,
    ),
  };
}
