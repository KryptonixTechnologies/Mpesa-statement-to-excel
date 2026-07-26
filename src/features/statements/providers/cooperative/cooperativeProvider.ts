import type { SupportedStatementProvider } from "@/features/statements/providers/types";
import { createIncrementalCooperativeParser } from "./cooperativeParser";

export const cooperativeProvider: SupportedStatementProvider = {
  id: "cooperative",
  displayName: "Co-operative Bank",
  shortName: "COOP",
  supported: true,
  matches(items) {
    const text = items
      .slice(0, 350)
      .map((item) => item.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .toUpperCase();
    return (
      text.includes("CO-OPERATIVE BANK") ||
      (text.includes("TRANS DATE") &&
        text.includes("TRANSACTION DETAILS") &&
        text.includes("REFERENCE NO") &&
        text.includes("BOOK BALANCE"))
    );
  },
  createParser: createIncrementalCooperativeParser,
};
