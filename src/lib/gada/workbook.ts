import * as XLSX from "xlsx";

const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Serializes a SheetJS workbook and triggers a browser file download.
 */
export function downloadWorkbookFile(
  workbook: XLSX.WorkBook,
  filename: string
): void {
  const buffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  }) as ArrayBuffer;

  if (typeof document === "undefined") {
    return;
  }

  const blob = new Blob([buffer], { type: XLSX_MIME_TYPE });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
