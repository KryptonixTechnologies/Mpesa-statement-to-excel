export type PdfTextItem = {
  text: string;
  x: number;
  y: number;
  page: number;
};

export type CompactPdfTextItem = [text: string, x: number, y: number];

export type PdfBridgeMessage =
  | { type: "READY" }
  | {
      type: "PERFORMANCE";
      stage: string;
      durationMs: number;
      details?: Record<string, string | number | boolean>;
    }
  | { type: "PASSWORD_REQUIRED" }
  | { type: "PASSWORD_INCORRECT"; message?: string }
  | { type: "PROGRESS"; current: number; total: number }
  | {
      type: "PAGE_EXTRACTED";
      page: number;
      pageCount: number;
      items: CompactPdfTextItem[];
    }
  | {
      type: "EXTRACTION_COMPLETE";
      pageCount: number;
      totalItems: number;
    }
  | { type: "EXTRACTED"; pages: PdfTextItem[][]; pageCount: number }
  | { type: "ERROR"; code: string; message: string };
