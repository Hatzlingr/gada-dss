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
  onChange: (nextInput: GadaInput) => void;
}

function DataEditorPlaceholder({ input, onChange }: DataEditorPlaceholderProps) {
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
          Panel ini siap menerima komponen <code className="font-mono text-foreground">DataEditor</code> dengan kontrak{" "}
          <code className="font-mono text-foreground">input</code> dan{" "}
          <code className="font-mono text-foreground">onChange</code> ({typeof onChange === "function" ? "terhubung" : "menunggu"}).
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

interface PreferenceSimulatorPlaceholderProps {
  output: GadaOutput | null;
  overrideWeights: Record<string, number> | undefined;
  onOverrideChange: (nextOverrides: Record<string, number> | undefined) => void;
}

function PreferenceSimulatorPlaceholder({
  output,
  overrideWeights,
  onOverrideChange,
}: PreferenceSimulatorPlaceholderProps) {
  const hasOverrides = overrideWeights !== undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-primary" aria-hidden="true" />
          Simulator Bobot
        </CardTitle>
        <CardDescription>
          Modul Simulator Preferensi Personal — disiapkan untuk integrasi PreferenceSimulator
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>
          Panel ini siap menerima komponen <code className="font-mono text-foreground">PreferenceSimulator</code> dengan kontrak{" "}
          <code className="font-mono text-foreground">output</code>,{" "}
          <code className="font-mono text-foreground">overrideWeights</code>, dan{" "}
          <code className="font-mono text-foreground">onOverrideChange</code>.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {output ? `${output.activeCriteria.length} Kriteria Aktif` : "Menunggu data valid"}
          </Badge>
          <Badge variant={hasOverrides ? "default" : "secondary"}>
            {hasOverrides ? "Override Bobot Aktif" : "Menggunakan Konsensus Kelompok"}
          </Badge>
          {hasOverrides ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onOverrideChange(undefined)}
            >
              Kembalikan Bobot Konsensus
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

interface AuditTracePlaceholderProps {
  input: GadaInput;
  output: GadaOutput | null;
}

function AuditTracePlaceholder({ input, output }: AuditTracePlaceholderProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="size-4 text-primary" aria-hidden="true" />
          Audit &amp; Ekspor
        </CardTitle>
        <CardDescription>
          Modul Jejak Perhitungan &amp; Ekspor Laporan — disiapkan untuk integrasi AuditTraceView
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>
          Panel ini siap menerima komponen <code className="font-mono text-foreground">AuditTraceView</code> dengan kontrak{" "}
          <code className="font-mono text-foreground">input</code> dan{" "}
          <code className="font-mono text-foreground">output</code>.
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            Dataset: {input.datasetName ?? "Tanpa Judul"}
          </Badge>
          <Badge variant="outline">
            {output ? `${output.imputationLogs.length} Log Imputasi` : "Belum dihitung"}
          </Badge>
          <Badge variant="outline">
            {output ? `${output.excludedCriteria.length} Kriteria Dieliminasi` : "—"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const [gadaInput, setGadaInput] = useState<GadaInput>(laundrySeedInput);
  const [overrideWeights, setOverrideWeights] = useState<
    Record<string, number> | undefined
  >(undefined);

  const analysis = useMemo(() => {
    try {
      const output = runGadaAnalysis(gadaInput, overrideWeights);
      return { output, error: null as string | null };
    } catch (err) {
      return {
        output: null as GadaOutput | null,
        error:
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat menghitung analisis GADA.",
      };
    }
  }, [gadaInput, overrideWeights]);

  const isModified =
    gadaInput !== laundrySeedInput || overrideWeights !== undefined;

  const activeCriteriaCount = analysis.output
    ? analysis.output.activeCriteria.length
    : gadaInput.criteria.filter((criterion) => criterion.active).length;

  const handleResetDefault = () => {
    setGadaInput(laundrySeedInput);
    setOverrideWeights(undefined);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold tracking-wider text-primary uppercase">
                GADA DSS • Kelompok 6 UNSRI
              </span>
              {overrideWeights !== undefined ? (
                <Badge variant="secondary" className="text-xs">
                  Mode Simulasi Personal
                </Badge>
              ) : null}
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {gadaInput.datasetName ?? "Dataset Evaluasi GADA"}
            </h1>
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
          </div>

          {isModified ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetDefault}
                className="gap-1.5"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                Reset ke Dataset Default
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
              <span>Simulator Bobot</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5 px-3 py-1.5">
              <FileSpreadsheet className="size-4" aria-hidden="true" />
              <span>Audit &amp; Ekspor</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="results">
            {analysis.output ? (
              <ResultsView output={analysis.output} input={gadaInput} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Hasil Tidak Tersedia</CardTitle>
                  <CardDescription>
                    Perbaiki error validasi pada banner di atas atau klik Reset ke Dataset Default untuk menampilkan hasil peringkat GADA.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="data">
            <DataEditorPlaceholder
              input={gadaInput}
              onChange={setGadaInput}
            />
          </TabsContent>

          <TabsContent value="simulator">
            <PreferenceSimulatorPlaceholder
              output={analysis.output}
              overrideWeights={overrideWeights}
              onOverrideChange={setOverrideWeights}
            />
          </TabsContent>

          <TabsContent value="audit">
            <AuditTracePlaceholder
              input={gadaInput}
              output={analysis.output}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
