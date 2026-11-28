"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  Filter,
  Info,
  Search,
  Sigma,
  Users,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CONSISTENCY_THRESHOLDS } from "@/lib/gada/constants";
import {
  formatMatrixAsMarkdown,
  formatMatrixAsTSV,
  type MatrixCellValue,
} from "@/lib/gada/exporter";
import type {
  ConsistencyStatus,
  GadaAuditTrace,
  GadaInput,
  GadaOutput,
  RespondentConsistencyResult,
} from "@/lib/gada/types";

export interface AuditDiagnosticsViewProps {
  input: GadaInput;
  result: GadaOutput;
}

type AuditMatrixKey = keyof GadaAuditTrace;
type StatusFilterValue = "all" | ConsistencyStatus;
type CopyFormat = "markdown" | "tsv";

interface MatrixTabConfig {
  key: AuditMatrixKey;
  tabLabel: string;
  title: string;
  formulaDescription: string;
  rowHeader: string;
  rowKind: "alternatives" | "respondents";
  colKind: "criteria" | "respondents";
  decimals: "clean" | 6;
}

const SUMMARY_DECIMALS = 4;
const MATRIX_DECIMALS = 6;
const COPY_FEEDBACK_TIMEOUT_MS = 2000;

const STATUS_FILTER_OPTIONS: ReadonlyArray<{
  value: StatusFilterValue;
  label: string;
}> = [
  { value: "all", label: "Semua Status" },
  { value: "high", label: "Konsisten Tinggi" },
  { value: "moderate", label: "Moderat" },
  { value: "low_warning", label: "Peringatan Rendah" },
];

const DEFAULT_MATRIX_TAB: MatrixTabConfig = {
  key: "cleanedMatrix",
  tabLabel: "1. Cleaned (A)",
  title: "Matriks Keputusan Bersih (A = [aⱼₖ])",
  formulaDescription:
    "Data alternatif setelah normalisasi satuan/waktu/biner, imputasi nilai kosong, dan eliminasi kriteria varians nol (S × M).",
  rowHeader: "Alternatif",
  rowKind: "alternatives",
  colKind: "criteria",
  decimals: "clean",
};

const MATRIX_TABS: readonly MatrixTabConfig[] = [
  DEFAULT_MATRIX_TAB,
  {
    key: "betaMatrix",
    tabLabel: "2. Beta (βᵢ)",
    title: "Matriks Normalisasi Preferensi (βᵢ(k))",
    formulaDescription:
      "βᵢ(k) = Scoreᵢₖ / Σₘ Scoreᵢₘ — setiap baris responden ternormalisasi dengan jumlah tepat 1.000000 (N × M).",
    rowHeader: "Responden",
    rowKind: "respondents",
    colKind: "criteria",
    decimals: MATRIX_DECIMALS,
  },
  {
    key: "zeroPointMatrix",
    tabLabel: "3. Zero-Point (xᵢ⁰)",
    title: "Matriks Zero-Starting Point Image (xᵢ⁰(k))",
    formulaDescription:
      "xᵢ⁰(k) = βᵢ(k) − βᵢ(1) — pergeseran terhadap kriteria aktif pertama sebelum perhitungan luas bertanda sᵢ (N × M).",
    rowHeader: "Responden",
    rowKind: "respondents",
    colKind: "criteria",
    decimals: MATRIX_DECIMALS,
  },
  {
    key: "agrpcMatrix",
    tabLabel: "4. AGRPC (εᵢⱼ)",
    title: "Matriks Absolute Grey Relational Preference Coefficient (εᵢⱼ)",
    formulaDescription:
      "εᵢⱼ = (1 + |sᵢ| + |sⱼ|) / (1 + |sᵢ| + |sⱼ| + |sᵢ − sⱼ|) — matriks simetris dengan diagonal utama 1.000000 (N × N).",
    rowHeader: "Responden",
    rowKind: "respondents",
    colKind: "respondents",
    decimals: MATRIX_DECIMALS,
  },
  {
    key: "thetaMatrix",
    tabLabel: "5. Theta (θᵢₖ)",
    title: "Matriks Bobot Individu Terbobot (θᵢₖ)",
    formulaDescription:
      "θᵢₖ = βᵢ(k) × √αᵢ — preferensi ternormalisasi dikalikan konsistensi responden sebelum rata-rata geometrik δ(k) (N × M).",
    rowHeader: "Responden",
    rowKind: "respondents",
    colKind: "criteria",
    decimals: MATRIX_DECIMALS,
  },
  {
    key: "reciprocatedMatrix",
    tabLabel: "6. RO (rⱼₖ)",
    title: "Matriks Reciprocating Operator (R = [rⱼₖ])",
    formulaDescription:
      "rⱼₖ = 1/aⱼₖ untuk kriteria cost atau aⱼₖ untuk kriteria benefit — seluruh nilai diseragamkan menjadi lebih besar lebih baik (S × M).",
    rowHeader: "Alternatif",
    rowKind: "alternatives",
    colKind: "criteria",
    decimals: MATRIX_DECIMALS,
  },
];

function formatConsistencyMetric(value: number): string {
  return value.toFixed(SUMMARY_DECIMALS);
}

function formatMatrixNumber(
  value: number,
  decimals: MatrixTabConfig["decimals"]
): string {
  if (!Number.isFinite(value)) {
    return "—";
  }
  if (decimals === "clean") {
    return Number.isInteger(value)
      ? String(value)
      : Number(value.toFixed(MATRIX_DECIMALS)).toString();
  }
  return value.toFixed(decimals);
}

function getConsistencyBadgeMeta(status: ConsistencyStatus): {
  label: string;
  className: string;
} {
  if (status === "high") {
    return {
      label: "Konsisten Tinggi",
      className:
        "border-emerald-200 bg-emerald-500/15 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300",
    };
  }
  if (status === "moderate") {
    return {
      label: "Moderat",
      className:
        "border-sky-200 bg-sky-500/15 text-sky-700 dark:border-sky-500/30 dark:text-sky-300",
    };
  }
  return {
    label: "Peringatan Rendah",
    className:
      "border-rose-200 bg-rose-500/15 text-rose-700 dark:border-rose-500/30 dark:text-rose-300",
  };
}

interface ConsistencySummary {
  total: number;
  minItem: RespondentConsistencyResult;
  maxItem: RespondentConsistencyResult;
  avgSqrtAlpha: number;
  highCount: number;
  moderateCount: number;
  lowWarningCount: number;
}

function computeConsistencySummary(
  rows: readonly RespondentConsistencyResult[]
): ConsistencySummary | null {
  const first = rows[0];
  if (!first) {
    return null;
  }

  let minItem = first;
  let maxItem = first;
  let sqrtAlphaSum = 0;
  let highCount = 0;
  let moderateCount = 0;
  let lowWarningCount = 0;

  for (const item of rows) {
    if (item.sqrtAlpha < minItem.sqrtAlpha) {
      minItem = item;
    }
    if (item.sqrtAlpha > maxItem.sqrtAlpha) {
      maxItem = item;
    }
    sqrtAlphaSum += item.sqrtAlpha;

    if (item.status === "high") {
      highCount += 1;
    } else if (item.status === "moderate") {
      moderateCount += 1;
    } else {
      lowWarningCount += 1;
    }
  }

  return {
    total: rows.length,
    minItem,
    maxItem,
    avgSqrtAlpha: sqrtAlphaSum / rows.length,
    highCount,
    moderateCount,
    lowWarningCount,
  };
}

interface FormattedMatrixTableData {
  headers: string[];
  rows: MatrixCellValue[][];
  colCount: number;
  rowCount: number;
}

function buildMatrixTableData(
  config: MatrixTabConfig,
  input: GadaInput,
  result: GadaOutput
): FormattedMatrixTableData {
  const rawMatrix = result.auditTrace[config.key];

  const colHeaders =
    config.colKind === "criteria"
      ? result.activeCriteria.map(
          (criterion) => `${criterion.code} (${criterion.name})`
        )
      : input.respondents.map(
          (respondent, idx) => `R${idx + 1} ${respondent.name}`
        );

  const rowLabels =
    config.rowKind === "alternatives"
      ? input.alternatives.map((alternative) => alternative.name)
      : input.respondents.map(
          (respondent, idx) => `R${idx + 1} — ${respondent.name}`
        );

  const headers = [config.rowHeader, ...colHeaders];

  if (rawMatrix.length === 0) {
    return {
      headers,
      rows: [],
      colCount: colHeaders.length,
      rowCount: 0,
    };
  }

  const rows: MatrixCellValue[][] = rawMatrix.map((rowValues, rowIdx) => {
    const label = rowLabels[rowIdx] ?? `Baris ${rowIdx + 1}`;
    const formattedCells = colHeaders.map((_, colIdx) => {
      const value = rowValues[colIdx];
      return value === undefined
        ? "—"
        : formatMatrixNumber(value, config.decimals);
    });
    return [label, ...formattedCells];
  });

  return {
    headers,
    rows,
    colCount: colHeaders.length,
    rowCount: rows.length,
  };
}

function ConsistencyKpiStrip({
  summary,
}: {
  summary: ConsistencySummary | null;
}) {
  return (
    <section
      aria-label="Ringkasan Konsistensi Responden"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardDescription className="font-medium">
              Minimum √αᵢ
            </CardDescription>
            <ArrowDownRight
              className="size-4 text-amber-500"
              aria-hidden="true"
            />
          </div>
          <CardTitle className="font-mono text-2xl font-bold tabular-nums">
            {summary ? formatConsistencyMetric(summary.minItem.sqrtAlpha) : "—"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          {summary ? (
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium text-foreground">
                {summary.minItem.name}
              </span>
              <span className="font-mono tabular-nums">
                α = {formatConsistencyMetric(summary.minItem.alpha)}
              </span>
            </div>
          ) : (
            <span>Data responden tidak tersedia</span>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardDescription className="font-medium">
              Maksimum √αᵢ
            </CardDescription>
            <ArrowUpRight
              className="size-4 text-emerald-500"
              aria-hidden="true"
            />
          </div>
          <CardTitle className="font-mono text-2xl font-bold tabular-nums">
            {summary ? formatConsistencyMetric(summary.maxItem.sqrtAlpha) : "—"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          {summary ? (
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium text-foreground">
                {summary.maxItem.name}
              </span>
              <span className="font-mono tabular-nums">
                α = {formatConsistencyMetric(summary.maxItem.alpha)}
              </span>
            </div>
          ) : (
            <span>Data responden tidak tersedia</span>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardDescription className="font-medium">
              Rata-rata √αᵢ Kelompok
            </CardDescription>
            <Users className="size-4 text-primary" aria-hidden="true" />
          </div>
          <CardTitle className="font-mono text-2xl font-bold tabular-nums">
            {summary ? formatConsistencyMetric(summary.avgSqrtAlpha) : "—"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          {summary ? (
            <div className="flex items-center justify-between gap-2">
              <span>Total {summary.total} responden</span>
              <span className="font-mono tabular-nums">
                {summary.highCount} tinggi • {summary.moderateCount} moderat
              </span>
            </div>
          ) : (
            <span>Tidak ada evaluasi AGRPC</span>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardDescription className="font-medium">
              Peringatan Konsistensi Rendah
            </CardDescription>
            <AlertTriangle
              className={
                summary && summary.lowWarningCount > 0
                  ? "size-4 text-rose-500"
                  : "size-4 text-emerald-500"
              }
              aria-hidden="true"
            />
          </div>
          <CardTitle className="font-mono text-2xl font-bold tabular-nums">
            {summary ? summary.lowWarningCount : "—"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          <span>
            Ambang batas peringatan: αᵢ &lt;{" "}
            {CONSISTENCY_THRESHOLDS.MODERATE_MIN_ALPHA.toFixed(2)}
          </span>
        </CardContent>
      </Card>
    </section>
  );
}

export function AuditDiagnosticsView({
  input,
  result,
}: AuditDiagnosticsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [activeMatrixKey, setActiveMatrixKey] =
    useState<AuditMatrixKey>("cleanedMatrix");
  const [copiedState, setCopiedState] = useState<{
    key: AuditMatrixKey;
    format: CopyFormat;
  } | null>(null);
  const [clipboardError, setClipboardError] = useState<string | null>(null);

  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const consistencySummary = useMemo(
    () => computeConsistencySummary(result.respondentConsistency),
    [result.respondentConsistency]
  );

  const indexedConsistency = useMemo(
    () =>
      result.respondentConsistency.map((item, idx) => ({
        item,
        respondentNumber: idx + 1,
      })),
    [result.respondentConsistency]
  );

  const filteredConsistency = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return indexedConsistency.filter(({ item }) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      if (query.length === 0) {
        return true;
      }
      return (
        item.name.toLowerCase().includes(query) ||
        item.respondentId.toLowerCase().includes(query)
      );
    });
  }, [indexedConsistency, searchQuery, statusFilter]);

  const selectedStatusLabel =
    STATUS_FILTER_OPTIONS.find((option) => option.value === statusFilter)
      ?.label ?? "Semua Status";

  const activeMatrixConfig = useMemo(
    () =>
      MATRIX_TABS.find((tab) => tab.key === activeMatrixKey) ??
      DEFAULT_MATRIX_TAB,
    [activeMatrixKey]
  );

  const activeMatrixData = useMemo(
    () => buildMatrixTableData(activeMatrixConfig, input, result),
    [activeMatrixConfig, input, result]
  );

  const handleStatusFilterChange = (value: string | null) => {
    if (
      value === "all" ||
      value === "high" ||
      value === "moderate" ||
      value === "low_warning"
    ) {
      setStatusFilter(value);
    }
  };

  const handleMatrixTabChange = (value: string) => {
    const matched = MATRIX_TABS.find((tab) => tab.key === value);
    if (matched) {
      setActiveMatrixKey(matched.key);
    }
  };

  const handleCopyMatrix = async (format: CopyFormat) => {
    if (activeMatrixData.rows.length === 0) {
      return;
    }

    const formattedText =
      format === "markdown"
        ? formatMatrixAsMarkdown(activeMatrixData.headers, activeMatrixData.rows)
        : formatMatrixAsTSV(activeMatrixData.headers, activeMatrixData.rows);

    try {
      if (typeof navigator === "undefined" || !navigator.clipboard) {
        throw new Error("Clipboard API tidak tersedia pada browser ini.");
      }
      await navigator.clipboard.writeText(formattedText);
      setClipboardError(null);
      setCopiedState({ key: activeMatrixConfig.key, format });

      if (copyTimerRef.current !== null) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => {
        setCopiedState(null);
      }, COPY_FEEDBACK_TIMEOUT_MS);
    } catch (err) {
      setClipboardError(
        err instanceof Error
          ? err.message
          : "Gagal menyalin matriks ke clipboard."
      );
    }
  };

  const isMarkdownCopied =
    copiedState?.key === activeMatrixConfig.key &&
    copiedState.format === "markdown";
  const isTsvCopied =
    copiedState?.key === activeMatrixConfig.key && copiedState.format === "tsv";

  return (
    <div className="space-y-6">
      {result.excludedCriteria.length > 0 || result.imputationLogs.length > 0 ? (
        <section
          aria-label="Log Praproses Otomatis"
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
        >
          {result.excludedCriteria.length > 0 ? (
            <Alert>
              <Info className="size-4" aria-hidden="true" />
              <AlertTitle>
                Kriteria Dieliminasi Otomatis ({result.excludedCriteria.length})
              </AlertTitle>
              <AlertDescription>
                {result.excludedCriteria
                  .map((item) => `${item.code} (${item.name}: ${item.detail})`)
                  .join("; ")}
              </AlertDescription>
            </Alert>
          ) : null}

          {result.imputationLogs.length > 0 ? (
            <Alert>
              <CheckCircle2 className="size-4" aria-hidden="true" />
              <AlertTitle>
                Log Imputasi Nilai Kosong ({result.imputationLogs.length} sel)
              </AlertTitle>
              <AlertDescription>
                {result.imputationLogs
                  .map(
                    (log) =>
                      `${log.alternativeName} [${log.criterionCode}] → ${log.imputedValue} (${log.strategy})`
                  )
                  .join(" • ")}
              </AlertDescription>
            </Alert>
          ) : null}
        </section>
      ) : null}

      <ConsistencyKpiStrip summary={consistencySummary} />

      <Card>
        <CardHeader className="gap-4 border-b pb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4 text-primary" aria-hidden="true" />
                Tabel Konsistensi Responden (AGRPC)
              </CardTitle>
              <CardDescription>
                Menampilkan {filteredConsistency.length} dari{" "}
                {result.respondentConsistency.length} responden (α ≥{" "}
                {CONSISTENCY_THRESHOLDS.HIGH_MIN_ALPHA.toFixed(2)} tinggi,{" "}
                {CONSISTENCY_THRESHOLDS.MODERATE_MIN_ALPHA.toFixed(2)}–
                {CONSISTENCY_THRESHOLDS.HIGH_MIN_ALPHA.toFixed(2)} moderat, &lt;{" "}
                {CONSISTENCY_THRESHOLDS.MODERATE_MIN_ALPHA.toFixed(2)}{" "}
                peringatan).
              </CardDescription>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-56">
                <Search
                  className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Cari nama responden..."
                  aria-label="Cari nama responden"
                  className="pl-8"
                />
              </div>

              <Select
                value={statusFilter}
                onValueChange={handleStatusFilterChange}
              >
                <SelectTrigger
                  className="w-full sm:w-48"
                  aria-label="Filter status konsistensi"
                >
                  <Filter
                    className="size-3.5 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <SelectValue placeholder="Filter Status">
                    {selectedStatusLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="end">
                  {STATUS_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <div className="rounded-lg border border-border [&_[data-slot=table-container]]:max-h-[420px] [&_[data-slot=table-container]]:overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead className="w-16">No</TableHead>
                  <TableHead>Responden</TableHead>
                  <TableHead className="text-right">Signed Area (sᵢ)</TableHead>
                  <TableHead className="text-right">|sᵢ|</TableHead>
                  <TableHead className="text-right">αᵢ</TableHead>
                  <TableHead className="text-right">√αᵢ</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConsistency.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Tidak ada responden yang cocok dengan filter pencarian
                      saat ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredConsistency.map(({ item, respondentNumber }) => {
                    const badge = getConsistencyBadgeMeta(item.status);
                    return (
                      <TableRow key={item.respondentId}>
                        <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                          #{respondentNumber}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {item.name}
                        </TableCell>
                        <TableCell
                          className="text-right font-mono text-xs tabular-nums"
                          title={item.signedArea.toFixed(MATRIX_DECIMALS)}
                        >
                          {formatConsistencyMetric(item.signedArea)}
                        </TableCell>
                        <TableCell
                          className="text-right font-mono text-xs tabular-nums"
                          title={item.absSignedArea.toFixed(MATRIX_DECIMALS)}
                        >
                          {formatConsistencyMetric(item.absSignedArea)}
                        </TableCell>
                        <TableCell
                          className="text-right font-mono text-xs tabular-nums"
                          title={item.alpha.toFixed(MATRIX_DECIMALS)}
                        >
                          {formatConsistencyMetric(item.alpha)}
                        </TableCell>
                        <TableCell
                          className="text-right font-mono text-xs font-semibold tabular-nums"
                          title={item.sqrtAlpha.toFixed(MATRIX_DECIMALS)}
                        >
                          {formatConsistencyMetric(item.sqrtAlpha)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className={badge.className}>
                            {badge.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-4 border-b pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sigma className="size-4 text-primary" aria-hidden="true" />
                Inspektor Matriks Perhitungan GADA (6 Tahap)
              </CardTitle>
              <CardDescription>
                Telusuri seluruh matriks antara (presisi 6 desimal) dan salin
                langsung untuk kebutuhan laporan.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleCopyMatrix("markdown")}
                disabled={activeMatrixData.rows.length === 0}
                className="gap-1.5"
              >
                {isMarkdownCopied ? (
                  <Check
                    className="size-3.5 text-emerald-600"
                    aria-hidden="true"
                  />
                ) : (
                  <Copy className="size-3.5" aria-hidden="true" />
                )}
                {isMarkdownCopied ? "Tersalin (MD)" : "Salin Markdown"}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleCopyMatrix("tsv")}
                disabled={activeMatrixData.rows.length === 0}
                className="gap-1.5"
              >
                {isTsvCopied ? (
                  <Check
                    className="size-3.5 text-emerald-600"
                    aria-hidden="true"
                  />
                ) : (
                  <ClipboardList className="size-3.5" aria-hidden="true" />
                )}
                {isTsvCopied ? "Tersalin (TSV)" : "Salin TSV"}
              </Button>
            </div>
          </div>

          {clipboardError !== null ? (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" aria-hidden="true" />
              <AlertTitle>Gagal Menyalin Matriks</AlertTitle>
              <AlertDescription>{clipboardError}</AlertDescription>
            </Alert>
          ) : null}
        </CardHeader>

        <CardContent className="pt-4">
          <Tabs
            value={activeMatrixKey}
            onValueChange={handleMatrixTabChange}
            className="space-y-4"
          >
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 p-1">
              {MATRIX_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className="px-3 py-1.5 text-xs sm:text-sm"
                >
                  {tab.tabLabel}
                </TabsTrigger>
              ))}
            </TabsList>

            {MATRIX_TABS.map((tab) => {
              const isSelected = tab.key === activeMatrixKey;
              if (!isSelected) {
                return <TabsContent key={tab.key} value={tab.key} />;
              }

              return (
                <TabsContent
                  key={tab.key}
                  value={tab.key}
                  className="space-y-4"
                >
                  <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-0.5">
                      <div className="text-sm font-semibold text-foreground">
                        {tab.title}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {tab.formulaDescription}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="w-fit shrink-0 font-mono"
                    >
                      Dimensi: {activeMatrixData.rowCount} ×{" "}
                      {activeMatrixData.colCount}
                    </Badge>
                  </div>

                  <div className="rounded-lg border border-border [&_[data-slot=table-container]]:max-h-[480px] [&_[data-slot=table-container]]:overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 z-20 bg-background">
                        <TableRow>
                          {activeMatrixData.headers.map((header, colIdx) => (
                            <TableHead
                              key={`${tab.key}-head-${colIdx}`}
                              className={
                                colIdx === 0
                                  ? "sticky left-0 z-30 min-w-[180px] border-r border-border bg-background font-semibold"
                                  : "text-right font-mono text-xs"
                              }
                            >
                              {header}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeMatrixData.rows.map((rowCells, rowIdx) => (
                          <TableRow key={`${tab.key}-row-${rowIdx}`}>
                            {rowCells.map((cell, colIdx) => (
                              <TableCell
                                key={`${tab.key}-cell-${rowIdx}-${colIdx}`}
                                className={
                                  colIdx === 0
                                    ? "sticky left-0 z-10 border-r border-border bg-background font-medium text-foreground"
                                    : "text-right font-mono text-xs tabular-nums"
                                }
                              >
                                {cell}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
