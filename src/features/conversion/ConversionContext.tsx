import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { DocumentPickerAsset } from "expo-document-picker";
import type {
  StatementReconciliation,
  StatementSummary,
  Transaction,
} from "@/types/transaction";
import { summarizeTransactions } from "@/features/preview/services/summary";

type ConversionState = {
  document: DocumentPickerAsset | null;
  transactions: Transaction[];
  summary: StatementSummary | null;
  reconciliation: StatementReconciliation | null;
  exportedFileUri: string | null;
  error: string | null;
  setDocument: (document: DocumentPickerAsset) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setReconciliation: (reconciliation: StatementReconciliation) => void;
  setExportedFileUri: (uri: string) => void;
  setError: (message: string) => void;
  reset: () => void;
};

const ConversionContext = createContext<ConversionState | null>(null);

export function ConversionProvider({ children }: PropsWithChildren) {
  const [document, updateDocument] = useState<DocumentPickerAsset | null>(null);
  const [transactions, updateTransactions] = useState<Transaction[]>([]);
  const [exportedFileUri, updateExportedFileUri] = useState<string | null>(null);
  const [error, updateError] = useState<string | null>(null);
  const [reconciliation, updateReconciliation] =
    useState<StatementReconciliation | null>(null);

  const setDocument = useCallback((file: DocumentPickerAsset) => {
    updateDocument(file);
    updateTransactions([]);
    updateExportedFileUri(null);
    updateError(null);
    updateReconciliation(null);
  }, []);

  const reset = useCallback(() => {
    updateDocument(null);
    updateTransactions([]);
    updateExportedFileUri(null);
    updateError(null);
    updateReconciliation(null);
  }, []);

  const summary = useMemo(
    () => (transactions.length ? summarizeTransactions(transactions) : null),
    [transactions],
  );

  const value = useMemo(
    () => ({
      document,
      transactions,
      summary,
      reconciliation,
      exportedFileUri,
      error,
      setDocument,
      setTransactions: updateTransactions,
      setReconciliation: updateReconciliation,
      setExportedFileUri: updateExportedFileUri,
      setError: updateError,
      reset,
    }),
    [
      document,
      transactions,
      summary,
      reconciliation,
      exportedFileUri,
      error,
      setDocument,
      reset,
    ],
  );

  return <ConversionContext.Provider value={value}>{children}</ConversionContext.Provider>;
}

export function useConversion() {
  const context = useContext(ConversionContext);
  if (!context) {
    throw new Error("useConversion must be used inside ConversionProvider");
  }
  return context;
}
