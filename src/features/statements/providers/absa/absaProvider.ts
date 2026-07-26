import type { SupportedStatementProvider } from "@/features/statements/providers/types";
import { createIncrementalAbsaParser } from "./absaParser";

export const absaProvider: SupportedStatementProvider = {
  id: "absa",
  displayName: "Absa Bank Kenya",
  shortName: "ABSA",
  supported: true,
  matches(items) {
    const text = items
      .slice(0, 300)
      .map((item) => item.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .toUpperCase();
    return (
      text.includes("ABSA BANK KENYA") ||
      (text.includes("TXN DATE") &&
        text.includes("USER NARRATIVE") &&
        text.includes("MONEY OUT") &&
        text.includes("MONEY IN"))
    );
  },
  createParser: createIncrementalAbsaParser,
};
