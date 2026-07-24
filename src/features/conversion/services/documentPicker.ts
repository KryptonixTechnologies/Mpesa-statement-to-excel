import * as DocumentPicker from "expo-document-picker";

const MAX_FILE_BYTES = 20 * 1024 * 1024;

export type PickResult =
  | { status: "cancelled" }
  | { status: "selected"; file: DocumentPicker.DocumentPickerAsset }
  | { status: "invalid"; message: string };

export async function pickStatementPdf(): Promise<PickResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/pdf",
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled) return { status: "cancelled" };

  const file = result.assets[0];
  const hasPdfType =
    file.mimeType === "application/pdf" || file.name.toLocaleLowerCase().endsWith(".pdf");

  if (!hasPdfType) {
    return { status: "invalid", message: "Please choose a PDF document." };
  }

  if (file.size && file.size > MAX_FILE_BYTES) {
    return {
      status: "invalid",
      message: "This PDF is larger than 20 MB. Please choose a smaller statement.",
    };
  }

  return { status: "selected", file };
}
