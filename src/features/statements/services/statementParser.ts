import type { PdfTextItem } from "@/types/pdf";
import type { Transaction } from "@/types/transaction";
import { detectStatementProvider } from "@/features/statements/providers/providerRegistry";
import type {
  ProviderParser,
  RegisteredStatementProvider,
  SupportedStatementProvider,
} from "@/features/statements/providers/types";

type PageResult = {
  provider: RegisteredStatementProvider | null;
  addedTransactions: number;
  totalTransactions: number;
};

export function createStatementParser() {
  let provider: RegisteredStatementProvider | null = null;
  let parser: ProviderParser | null = null;
  const pendingPages: PdfTextItem[][] = [];

  return {
    addPage(items: PdfTextItem[]): PageResult {
      if (!provider) {
        pendingPages.push(items);
        provider = detectStatementProvider(items);
        if (!provider) {
          return { provider: null, addedTransactions: 0, totalTransactions: 0 };
        }
        if (!provider.supported) {
          pendingPages.length = 0;
          return { provider, addedTransactions: 0, totalTransactions: 0 };
        }

        parser = (provider as SupportedStatementProvider).createParser();
        let addedTransactions = 0;
        let totalTransactions = 0;
        for (const page of pendingPages) {
          const result = parser.addPage(page);
          addedTransactions += result.addedTransactions;
          totalTransactions = result.totalTransactions;
        }
        pendingPages.length = 0;
        return { provider, addedTransactions, totalTransactions };
      }

      if (!provider.supported || !parser) {
        return { provider, addedTransactions: 0, totalTransactions: 0 };
      }
      const result = parser.addPage(items);
      return { provider, ...result };
    },
    getProvider() {
      return provider;
    },
    getDeclaredTotals() {
      return parser?.getDeclaredTotals() ?? null;
    },
    finish(): Transaction[] {
      return parser?.finish() ?? [];
    },
  };
}
