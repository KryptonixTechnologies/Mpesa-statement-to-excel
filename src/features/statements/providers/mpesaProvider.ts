import { createIncrementalMpesaParser } from "@/features/conversion/services/mpesaParser";
import type { SupportedStatementProvider } from "@/features/statements/providers/types";

export const mpesaProvider: SupportedStatementProvider = {
  id: "mpesa",
  displayName: "M-PESA",
  shortName: "MPESA",
  supported: true,
  matches(items) {
    const text = items
      .slice(0, 250)
      .map((item) => item.text)
      .join(" ")
      .toUpperCase();
    return (
      text.includes("M-PESA STATEMENT") ||
      (text.includes("RECEIPT NO") &&
        text.includes("COMPLETION TIME") &&
        text.includes("PAID IN") &&
        text.includes("WITHDRAWN"))
    );
  },
  createParser: createIncrementalMpesaParser,
};
