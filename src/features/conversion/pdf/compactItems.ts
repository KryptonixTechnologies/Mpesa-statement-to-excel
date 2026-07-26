import type { CompactPdfTextItem, PdfTextItem } from "@/types/pdf";

export function expandCompactPdfItems(
  items: CompactPdfTextItem[],
  page: number,
): PdfTextItem[] {
  return items.map(([text, x, y]) => ({ text, x, y, page }));
}
