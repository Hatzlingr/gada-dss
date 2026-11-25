"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Database,
  FileSpreadsheet,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { ResultsView } from "@/components/gada/ResultsView";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { laundrySeedInput } from "@/data/laundry-seed";
import { runGadaAnalysis } from "@/lib/gada/engine";
import type { GadaInput, GadaOutput } from "@/lib/gada/types";

interface DataEditorPlaceholderProps {
  input: GadaInput;
  result: GadaOutput | null;
  error: string | null;
  onChange: (nextInput: GadaInput) => void;
  onResetPreset: () => void;
}

function DataEditorPlaceholder({
  input,
  result,
  error,
  onChange,
  onResetPreset,
}: DataEditorPlaceholderProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="size-4 text-primary" aria-hidden="true" />
          Data &amp; Kriteria
        </CardTitle>
        <CardDescription>
          Modul Editor Data &amp; Upload Excel — disiapkan untuk integrasi DataEditor
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>
          Panel ini siap menerima komponen <code className="font-mono text-foreground">DataEditor</code> dengan 5 props:{" "}
          <code className="font-mono text-foreground">input</code>,{" "}
          <code className="font-mono text-foreground">result</code> ({result ? "tersedia" : "null"}),{" "}
          <code className="font-mono text-foreground">error</code> ({error ? "aktif" : "null"}),{" "}
          <code className="font-mono text-foreground">onChange</code> ({typeof onChange === "function" ? "terhubung" : "menunggu"}), dan{" "}
          <code className="font-mono text-foreground">onResetPreset</code> ({typeof onResetPreset === "function" ? "terhubung" : "menunggu"}).
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{input.alternatives.length} Alternatif</Badge>
          <Badge variant="outline">{input.criteria.length} Total Kriteria</Badge>
          <Badge variant="outline">{input.respondents.length} Responden</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

interface SimulatorViewPlaceholderProps {
  input: GadaInput;
  baseResult: GadaOutput;
}

function SimulatorViewPlaceholder({
  input,
  baseResult,
}: SimulatorViewPlaceholderProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-primary" aria-hidden="true" />
          Simulator &amp; Radar
        </CardTitle>
        <CardDescription>
          Modul What-If Simulator &amp; Perbandingan Radar — disiapkan untuk integrasi SimulatorView
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>
          Panel ini siap menerima komponen <code className="font-mono text-foreground">SimulatorView</code> dengan kontrak{" "}
          <code className="font-mono text-foreground">input</code> dan{" "}
          <code className="font-mono text-foreground">baseResult</code>.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {baseResult.activeCriteria.length} Kriteria Aktif
          </Badge>
          <Badge variant="outline">
            {input.alternatives.length} Alternatif Siap Simulasi
          </Badge>
          <Badge variant="secondary">Menggunakan Konsensus Kelompok</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

interface AuditDiagnosticsPlaceholderProps {
  input: GadaInput;
  result: GadaOutput;
}

function AuditDiagnosticsPlaceholder({
  input,
  result,
}: AuditDiagnosticsPlaceholderProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="size-4 text-primary" aria-hidden="true" />
          Audit &amp; Ekspor
        </CardTitle>
        <CardDescription>
          Modul Jejak Perhitungan &amp; Ekspor Laporan — disiapkan untuk integrasi AuditDiagnosticsView
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>
          Panel ini siap menerima komponen <code className="font-mono text-foreground">AuditDiagnosticsView</code> dengan kontrak{" "}
          <code className="font-mono text-foreground">input</code> dan{" "}
          <code className="font-mono text-foreground">result</code>.
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            Dataset: {input.datasetName ?? "Tanpa Judul"}
          </Badge>
          <Badge variant="outline">
            {result.imputationLogs.length} Log Imputasi
          </Badge>
          <Badge variant="outline">
            {result.excludedCriteria.length} Kriteria Dieliminasi
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

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

          {isModified ? (
            <div className="flex items-center gap-2">
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
            </div>
          ) : null}
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
              <ResultsView result={analysis.result} />
            ) : (
              <InvalidResultCard description="Perbaiki error validasi pada banner di atas atau klik Reset UNSRI Preset untuk menampilkan hasil peringkat GADA." />
            )}
          </TabsContent>

          <TabsContent value="data">
            <DataEditorPlaceholder
              input={gadaInput}
              result={analysis.result}
              error={analysis.error}
              onChange={setGadaInput}
              onResetPreset={handleResetPreset}
            />
          </TabsContent>

          <TabsContent value="simulator">
            {analysis.result ? (
              <SimulatorViewPlaceholder
                input={gadaInput}
                baseResult={analysis.result}
              />
            ) : (
              <InvalidResultCard description="Simulator membutuhkan hasil perhitungan GADA yang valid terlebih dahulu." />
            )}
          </TabsContent>

          <TabsContent value="audit">
            {analysis.result ? (
              <AuditDiagnosticsPlaceholder
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
