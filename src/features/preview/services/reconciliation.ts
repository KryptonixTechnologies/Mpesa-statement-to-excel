import type {
  DeclaredStatementTotals,
  StatementReconciliation,
  StatementSummary,
} from "@/types/transaction";

const CENT_TOLERANCE = 0.005;

function moneyDifference(actual: number, declared: number) {
  return Math.round((actual - declared) * 100) / 100;
}

export function reconcileStatementTotals(
  actual: StatementSummary,
  declared: DeclaredStatementTotals | null,
): StatementReconciliation {
  if (!declared) {
    return {
      status: "unavailable",
      declared: null,
      paidInDifference: null,
      withdrawnDifference: null,
    };
  }

  const paidInDifference = moneyDifference(actual.totalPaidIn, declared.totalPaidIn);
  const withdrawnDifference = moneyDifference(
    actual.totalWithdrawn,
    declared.totalWithdrawn,
  );
  const matched =
    Math.abs(paidInDifference) < CENT_TOLERANCE &&
    Math.abs(withdrawnDifference) < CENT_TOLERANCE;

  return {
    status: matched ? "matched" : "mismatch",
    declared,
    paidInDifference,
    withdrawnDifference,
  };
}
