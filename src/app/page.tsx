"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Database,
  Download,
  FileSpreadsheet,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { AuditDiagnosticsView } from "@/components/gada/AuditDiagnosticsView";
import { DataEditor } from "@/components/gada/DataEditor";
import { ResultsView } from "@/components/gada/ResultsView";
import { SimulatorView } from "@/components/gada/SimulatorView";
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
import { laundrySeedInput } from "@/data/laundry-seed";
import { runGadaAnalysis } from "@/lib/gada/engine";
import { exportGadaOutputToExcel } from "@/lib/gada/exporter";
import type { GadaInput, GadaOutput } from "@/lib/gada/types";

function InvalidResultCard({ description }: { description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hasil Tidak Tersedia</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export default function HomePage() {
  const [gadaInput, setGadaInput] = useState<GadaInput>(laundrySeedInput);

  const analysis = useMemo(() => {
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

  const isModified = gadaInput !== laundrySeedInput;

  const activeCriteriaCount = analysis.result
    ? analysis.result.activeCriteria.length
    : gadaInput.criteria.filter((criterion) => criterion.active).length;

  const handleResetPreset = () => {
    setGadaInput(laundrySeedInput);
  };

  const handleExportExcel = () => {
    if (!analysis.result) {
      return;
    }
    exportGadaOutputToExcel(gadaInput, analysis.result);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold tracking-wider text-primary uppercase">
              GADA DSS • Kelompok 6 UNSRI
            </span>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {gadaInput.datasetName ?? "Dataset Evaluasi GADA"}
            </h1>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <Badge variant="outline">
                {gadaInput.alternatives.length} Alternatif
              </Badge>
              <Badge variant="outline">{activeCriteriaCount} Kriteria Aktif</Badge>
              <Badge variant="outline">
                {gadaInput.respondents.length} Responden
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {analysis.result ? (
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
            {isModified ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetPreset}
                className="gap-1.5"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                Reset UNSRI Preset
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {analysis.error !== null ? (
          <Alert variant="destructive">
            <AlertCircle className="size-4" aria-hidden="true" />
            <AlertTitle>Validasi Data GADA Gagal</AlertTitle>
            <AlertDescription>{analysis.error}</AlertDescription>
          </Alert>
        ) : null}

        <Tabs defaultValue="results" className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:inline-flex sm:w-fit sm:grid-cols-none">
            <TabsTrigger value="results" className="gap-1.5 px-3 py-1.5">
              <BarChart3 className="size-4" aria-hidden="true" />
              <span>Hasil &amp; Peringkat</span>
            </TabsTrigger>
            <TabsTrigger value="data" className="gap-1.5 px-3 py-1.5">
              <Database className="size-4" aria-hidden="true" />
              <span>Data &amp; Kriteria</span>
            </TabsTrigger>
            <TabsTrigger value="simulator" className="gap-1.5 px-3 py-1.5">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              <span>Simulator &amp; Radar</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5 px-3 py-1.5">
              <FileSpreadsheet className="size-4" aria-hidden="true" />
              <span>Audit &amp; Ekspor</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="results">
            {analysis.result ? (
              <ResultsView
                result={analysis.result}
                onExportExcel={handleExportExcel}
              />
            ) : (
              <InvalidResultCard description="Perbaiki error validasi pada banner di atas atau klik Reset UNSRI Preset untuk menampilkan hasil peringkat GADA." />
            )}
          </TabsContent>

          <TabsContent value="data">
            <DataEditor
              input={gadaInput}
              result={analysis.result}
              error={analysis.error}
              onChange={setGadaInput}
              onResetPreset={handleResetPreset}
            />
          </TabsContent>

          <TabsContent value="simulator">
            {analysis.result ? (
              <SimulatorView
                input={gadaInput}
                baseResult={analysis.result}
              />
            ) : (
              <InvalidResultCard description="Simulator membutuhkan hasil perhitungan GADA yang valid terlebih dahulu." />
            )}
          </TabsContent>

          <TabsContent value="audit">
            {analysis.result ? (
              <AuditDiagnosticsView
                input={gadaInput}
                result={analysis.result}
              />
            ) : (
              <InvalidResultCard description="Audit perhitungan membutuhkan data GADA yang valid terlebih dahulu." />
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
