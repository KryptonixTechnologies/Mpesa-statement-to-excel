import type { PdfTextItem } from "@/types/pdf";
import type {
  RegisteredStatementProvider,
  UpcomingStatementProvider,
} from "@/features/statements/providers/types";
import { mpesaProvider } from "@/features/statements/providers/mpesaProvider";
import { absaProvider } from "@/features/statements/providers/absa/absaProvider";
import { cooperativeProvider } from "@/features/statements/providers/cooperative/cooperativeProvider";

function pageText(items: PdfTextItem[]) {
  return items
    .slice(0, 300)
    .map((item) => item.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function upcomingProvider(
  id: UpcomingStatementProvider["id"],
  displayName: string,
  shortName: string,
  patterns: RegExp[],
): UpcomingStatementProvider {
  return {
    id,
    displayName,
    shortName,
    supported: false,
    matches(items) {
      const text = pageText(items);
      return patterns.some((pattern) => pattern.test(text));
    },
  };
}

export const statementProviders: readonly RegisteredStatementProvider[] = [
  mpesaProvider,
  absaProvider,
  cooperativeProvider,
  upcomingProvider("kcb", "KCB Bank", "KCB", [/\bKCB\b/, /KENYA COMMERCIAL BANK/]),
  upcomingProvider("ncba", "NCBA Bank", "NCBA", [/\bNCBA\b/]),
  upcomingProvider("equity", "Equity Bank", "EQUITY", [/\bEQUITY BANK\b/]),
];

export function detectStatementProvider(items: PdfTextItem[]) {
  return statementProviders.find((provider) => provider.matches(items)) ?? null;
}

export function supportedStatementProviders() {
  return statementProviders.filter((provider) => provider.supported);
}

export function upcomingStatementProviders() {
  return statementProviders.filter((provider) => !provider.supported);
}
