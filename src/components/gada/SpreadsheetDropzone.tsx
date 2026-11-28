"use client";

import { useRef, useState } from "react";
import { AlertCircle, Upload } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { parseSpreadsheetToGadaInput } from "@/lib/gada/excel";
import type { GadaInput } from "@/lib/gada/types";

export interface SpreadsheetDropzoneProps {
  onImported: (input: GadaInput, fileName: string) => void;
  helperText: string;
  compact?: boolean;
}

export function SpreadsheetDropzone({
  onImported,
  helperText,
  compact = false,
}: SpreadsheetDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) {
      return;
    }

    setIsImporting(true);
    setImportError(null);
    try {
      const parsed = await parseSpreadsheetToGadaInput(file);
      onImported(parsed, file.name);
    } catch (err) {
      setImportError(
        err instanceof Error
          ? err.message
          : `Gagal membaca file "${file.name}".`
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = "";
        }}
      />

      <div
        role="button"
        tabIndex={0}
        aria-label="Unggah file spreadsheet Excel atau CSV"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          void handleFiles(event.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 text-center transition-colors ${
          compact ? "py-5" : "min-h-40 py-6"
        } ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/40"
        }`}
      >
        <Upload
          className={`${compact ? "size-5" : "size-6"} text-muted-foreground`}
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-foreground">
          {isImporting
            ? "Memproses file spreadsheet..."
            : "Seret & lepas file .xlsx, .xls, atau .csv ke sini, atau klik untuk memilih"}
        </p>
        <p className="text-xs text-muted-foreground">{helperText}</p>
      </div>

      {importError !== null ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" aria-hidden="true" />
          <AlertTitle>Impor Spreadsheet Gagal</AlertTitle>
          <AlertDescription>{importError}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
