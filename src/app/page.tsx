"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Database,
  Download,
  FileSpreadsheet,
  FolderSync,
} from "lucide-react";
import { AuditDiagnosticsView } from "@/components/gada/AuditDiagnosticsView";
import { DataEditor } from "@/components/gada/DataEditor";
import { ResultsView } from "@/components/gada/ResultsView";
import { WelcomeScreen } from "@/components/gada/WelcomeScreen";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { runGadaAnalysis } from "@/lib/gada/engine";
import { createBlankGadaInput } from "@/lib/gada/excel";
import { exportGadaOutputToExcel } from "@/lib/gada/exporter";
import type { GadaInput, GadaOutput } from "@/lib/gada/types";

type WorkspaceTab = "data" | "results" | "audit";

function InvalidResultCard({ description }: { description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hasil Perhitungan Belum Tersedia</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export default function HomePage() {
  const [gadaInput, setGadaInput] = useState<GadaInput | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("results");

  const analysis = useMemo(() => {
    if (gadaInput === null) {
      return null;
    }

    try {
      const result = runGadaAnalysis(gadaInput);
      return { result, error: null as string | null };
    } catch (err) {
      return {
        result: null as GadaOutput | null,
        error:
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat menghitung analisis GADA.",
      };
    }
  }, [gadaInput]);

  const handleDatasetReady = (
    nextInput: GadaInput,
    initialTab: "data" | "results"
  ) => {
    setGadaInput(nextInput);
    setActiveTab(initialTab);
  };

  const handleStartBlank = () => {
    handleDatasetReady(createBlankGadaInput(), "data");
  };

  const handleResetToWelcome = () => {
    setGadaInput(null);
  };

  const handleExportExcel = () => {
    if (!gadaInput || !analysis?.result) {
      return;
    }
    exportGadaOutputToExcel(gadaInput, analysis.result);
  };

  const handleTabChange = (value: string) => {
    if (value === "data" || value === "results" || value === "audit") {
      setActiveTab(value);
    }
  };

  const activeCriteriaCount = gadaInput
    ? (analysis?.result?.activeCriteria.length ??
      gadaInput.criteria.filter((criterion) => criterion.active).length)
    : 0;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold tracking-wider text-primary uppercase">
              GADA DSS • Sistem Pendukung Keputusan Multi-Kriteria
            </span>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {gadaInput !== null
                ? (gadaInput.datasetName?.trim() || "Dataset Evaluasi GADA")
                : "Implementasi Metode Grey Absolute Decision Analysis"}
            </h1>
            {gadaInput !== null ? (
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <Badge variant="outline">
                  {gadaInput.alternatives.length} Alternatif
                </Badge>
                <Badge variant="outline">
                  {activeCriteriaCount} Kriteria Aktif
                </Badge>
                <Badge variant="outline">
                  {gadaInput.respondents.length} Responden
                </Badge>
              </div>
            ) : null}
          </div>

          {gadaInput !== null ? (
            <div className="flex flex-wrap items-center gap-2">
              {analysis?.result ? (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleExportExcel}
                  className="gap-1.5"
                >
                  <Download className="size-3.5" aria-hidden="true" />
                  Export Excel
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetToWelcome}
                className="gap-1.5"
              >
                <FolderSync className="size-3.5" aria-hidden="true" />
                Ganti Dataset
              </Button>
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {gadaInput === null ? (
          <WelcomeScreen
            onDatasetReady={handleDatasetReady}
            onStartBlank={handleStartBlank}
          />
        ) : (
          <>
            {analysis?.error !== null && analysis?.error !== undefined ? (
              <Alert variant="destructive">
                <AlertCircle className="size-4" aria-hidden="true" />
                <AlertTitle>Validasi Data GADA Gagal</AlertTitle>
                <AlertDescription>{analysis.error}</AlertDescription>
              </Alert>
            ) : null}

            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="space-y-6"
            >
              <TabsList className="grid h-auto w-full grid-cols-1 gap-1 p-1 sm:inline-flex sm:w-fit sm:grid-cols-none">
                <TabsTrigger value="data" className="gap-1.5 px-3 py-1.5">
                  <Database className="size-4" aria-hidden="true" />
                  <span>Data &amp; Kriteria</span>
                </TabsTrigger>
                <TabsTrigger value="results" className="gap-1.5 px-3 py-1.5">
                  <BarChart3 className="size-4" aria-hidden="true" />
                  <span>Hasil &amp; Peringkat</span>
                </TabsTrigger>
                <TabsTrigger value="audit" className="gap-1.5 px-3 py-1.5">
                  <FileSpreadsheet className="size-4" aria-hidden="true" />
                  <span>Audit Perhitungan</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="data">
                <DataEditor
                  input={gadaInput}
                  result={analysis?.result ?? null}
                  onChange={setGadaInput}
                />
              </TabsContent>

              <TabsContent value="results">
                {analysis?.result ? (
                  <ResultsView result={analysis.result} />
                ) : (
                  <InvalidResultCard description="Perbaiki data pada tab Data & Kriteria terlebih dahulu untuk menampilkan hasil peringkat GADA." />
                )}
              </TabsContent>

              <TabsContent value="audit">
                {analysis?.result ? (
                  <AuditDiagnosticsView
                    input={gadaInput}
                    result={analysis.result}
                  />
                ) : (
                  <InvalidResultCard description="Audit perhitungan membutuhkan data GADA yang valid terlebih dahulu." />
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}
