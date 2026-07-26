const WORKBOOK_PREFIXES = ["MPESA_Statement_", "Statement_Excel_Kenya_"] as const;

export function isGeneratedWorkbookName(name: string) {
  return (
    WORKBOOK_PREFIXES.some((prefix) => name.startsWith(prefix)) &&
    name.endsWith(".xlsx")
  );
}
