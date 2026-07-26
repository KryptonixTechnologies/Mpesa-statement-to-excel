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

export type DeclaredStatementTotals = {
  totalPaidIn: number;
  totalWithdrawn: number;
};

export type StatementReconciliation =
  | {
      status: "matched";
      declared: DeclaredStatementTotals;
      paidInDifference: number;
      withdrawnDifference: number;
    }
  | {
      status: "mismatch";
      declared: DeclaredStatementTotals;
      paidInDifference: number;
      withdrawnDifference: number;
    }
  | {
      status: "unavailable";
      declared: null;
      paidInDifference: null;
      withdrawnDifference: null;
    };
