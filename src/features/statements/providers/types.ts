import type { PdfTextItem } from "@/types/pdf";
import type { DeclaredStatementTotals, Transaction } from "@/types/transaction";

export type StatementProviderId =
  | "mpesa"
  | "kcb"
  | "cooperative"
  | "absa"
  | "ncba"
  | "equity";

export type StatementProvider = {
  id: StatementProviderId;
  displayName: string;
  shortName: string;
  supported: boolean;
  matches: (items: PdfTextItem[]) => boolean;
};

export type ProviderParser = {
  addPage: (items: PdfTextItem[]) => {
    addedTransactions: number;
    totalTransactions: number;
  };
  getDeclaredTotals: () => DeclaredStatementTotals | null;
  finish: () => Transaction[];
};

export type SupportedStatementProvider = StatementProvider & {
  supported: true;
  createParser: () => ProviderParser;
};

export type UpcomingStatementProvider = StatementProvider & {
  supported: false;
};

export type RegisteredStatementProvider =
  | SupportedStatementProvider
  | UpcomingStatementProvider;
