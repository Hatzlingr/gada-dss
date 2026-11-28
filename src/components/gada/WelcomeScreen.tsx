"use client";

import { Download, FilePlus2, FileSpreadsheet } from "lucide-react";
import { SpreadsheetDropzone } from "@/components/gada/SpreadsheetDropzone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { downloadTemplateWorkbook } from "@/lib/gada/excel";
import type { GadaInput } from "@/lib/gada/types";

export interface WelcomeScreenProps {
  onDatasetReady: (input: GadaInput, initialTab: "data" | "results") => void;
  onStartBlank: () => void;
}

const INPUT_GUIDE_STEPS = [
  {
    step: "1",
    title: "Sheet 1 — Alternatif & Kriteria",
    detail:
      "Kolom pertama berisi nama alternatif, kolom opsional kedua untuk keterangan, dan kolom berikutnya berisi nilai tiap kriteria (bisa diberi akhiran (Cost) atau (Benefit)).",
  },
  {
    step: "2",
    title: "Sheet 2 — Skor Responden (Opsional)",
    detail:
      "Berisi tingkat kepentingan kriteria tiap penilai (> 0, mis. skala Likert 1–5). Jika hanya 1 sheet/CSV, sistem memberi bobot awal merata.",
  },
  {
    step: "3",
    title: "Hitung & Audit Otomatis",
    detail:
      "Sistem menghitung bobot konsensus AGRPC (αᵢ, √αᵢ), transformasi RO, indeks GADA (r̂ⱼ), peringkat akhir (R̂ⱼ), dan ekspor Excel 4-sheet.",
  },
] as const;

export function WelcomeScreen({
  onDatasetReady,
  onStartBlank,
}: WelcomeScreenProps) {
  return (
    <div className="mx-auto max-w-5xl space-y-6 py-4">
      <div className="space-y-2 text-center">
        <Badge variant="outline" className="font-mono text-xs">
          Grey Absolute Decision Analysis (GADA)
        </Badge>
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Mulai Evaluasi Keputusan Multi-Kriteria
        </h2>
        <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
          Unggah file Excel/CSV sesuai format template untuk dataset apa saja,
          atau buat matriks keputusan baru secara manual untuk langsung dihitung
          dan diaudit dengan metode GADA.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="flex flex-col md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSpreadsheet
                  className="size-4 text-primary"
                  aria-hidden="true"
                />
                Unggah Dataset (.xlsx, .xls, .csv)
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadTemplateWorkbook}
                className="gap-1.5"
              >
                <Download className="size-3.5" aria-hidden="true" />
                Download Template
              </Button>
            </div>
            <CardDescription>
              Gunakan file spreadsheet dari domain mana pun (1 sheet CSV/Excel
              atau 2 sheet Alternatif &amp; Responden).
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1">
            <SpreadsheetDropzone
              helperText="Setelah file dibaca, hasil perhitungan dan peringkat langsung ditampilkan."
              onImported={(parsed) => onDatasetReady(parsed, "results")}
            />
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FilePlus2 className="size-4 text-primary" aria-hidden="true" />
              Input Data Baru
            </CardTitle>
            <CardDescription>
              Mulai dari matriks starter 3×3 untuk diisi dan diubah langsung di
              editor tabel tanpa perlu menyiapkan file Excel terlebih dahulu.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
              Anda dapat menambah/menghapus kriteria, alternatif, dan responden
              secara bebas dengan pembaruan hasil real-time.
            </div>
            <Button
              type="button"
              variant="default"
              className="w-full gap-1.5"
              onClick={onStartBlank}
            >
              <FilePlus2 className="size-4" aria-hidden="true" />
              Buat Dataset Manual
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Panduan Singkat Format Dataset Universal
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {INPUT_GUIDE_STEPS.map((item) => (
            <div
              key={item.step}
              className="space-y-1 rounded-lg border border-border bg-muted/20 p-3"
            >
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {item.step}
                </Badge>
                <span className="text-xs font-semibold text-foreground">
                  {item.title}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {item.detail}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
