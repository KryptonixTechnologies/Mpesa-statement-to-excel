const WORKBOOK_PREFIX = "MPESA_Statement_";

export function isGeneratedWorkbookName(name: string) {
  return name.startsWith(WORKBOOK_PREFIX) && name.endsWith(".xlsx");
}
