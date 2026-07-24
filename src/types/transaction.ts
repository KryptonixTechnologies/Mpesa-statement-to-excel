export type Transaction = {
  receiptNo: string;
  date: string;
  details: string;
  status: string;
  paidIn: number | null;
  withdrawn: number | null;
  balance: number;
};

export type StatementSummary = {
  transactionCount: number;
  startDate: string | null;
  endDate: string | null;
  totalPaidIn: number;
  totalWithdrawn: number;
};
