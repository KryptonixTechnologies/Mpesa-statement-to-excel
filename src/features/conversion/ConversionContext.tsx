import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { DocumentPickerAsset } from "expo-document-picker";
import type { StatementSummary, Transaction } from "@/types/transaction";
import { summarizeTransactions } from "@/features/preview/services/summary";

type ConversionState = {
  document: DocumentPickerAsset | null;
  transactions: Transaction[];
  summary: StatementSummary | null;
  exportedFileUri: string | null;
  error: string | null;
  setDocument: (document: DocumentPickerAsset) => void;
  setTransactions: (transactions: Transaction[]) => void;
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

  const setDocument = useCallback((file: DocumentPickerAsset) => {
    updateDocument(file);
    updateTransactions([]);
    updateExportedFileUri(null);
    updateError(null);
  }, []);

  const reset = useCallback(() => {
    updateDocument(null);
    updateTransactions([]);
    updateExportedFileUri(null);
    updateError(null);
  }, []);

  const value = useMemo(
    () => ({
      document,
      transactions,
      summary: transactions.length ? summarizeTransactions(transactions) : null,
      exportedFileUri,
      error,
      setDocument,
      setTransactions: updateTransactions,
      setExportedFileUri: updateExportedFileUri,
      setError: updateError,
      reset,
    }),
    [document, transactions, exportedFileUri, error, setDocument, reset],
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
