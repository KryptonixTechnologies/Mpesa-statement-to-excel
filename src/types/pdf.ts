export type PdfTextItem = {
  text: string;
  x: number;
  y: number;
  width: number;
  page: number;
};

export type PdfBridgeMessage =
  | { type: "READY" }
  | { type: "PASSWORD_REQUIRED" }
  | { type: "PASSWORD_INCORRECT"; message?: string }
  | { type: "PROGRESS"; current: number; total: number }
  | { type: "EXTRACTED"; pages: PdfTextItem[][]; pageCount: number }
  | { type: "ERROR"; code: string; message: string };
