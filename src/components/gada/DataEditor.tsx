"use client";

import { useId, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Download,
  FilePlus2,
  FileSpreadsheet,
  Plus,
  Trash2,
  Upload,
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_LIKERT_SCORE } from "@/lib/gada/constants";
import {
  createBlankGadaInput,
  downloadTemplateWorkbook,
  parseSpreadsheetToGadaInput,
} from "@/lib/gada/excel";
import type {
  AlternativeItem,
  CriterionConfig,
  CriterionType,
  ExcludedCriterion,
  GadaInput,
  GadaOutput,
  ImputationStrategy,
  RawCellValue,
  RespondentItem,
} from "@/lib/gada/types";

export interface DataEditorProps {
  input: GadaInput;
  result: GadaOutput | null;
  onChange: (next: GadaInput) => void;
}

const CRITERION_TYPE_LABELS: Record<CriterionType, string> = {
  cost: "Cost",
  benefit: "Benefit",
};

const IMPUTATION_STRATEGY_LABELS: Record<ImputationStrategy, string> = {
  penalty_max: "Penalti Maks (Max)",
  min_value: "Nilai Minimum (Min)",
  mean: "Rata-rata (Mean)",
  custom_penalty: "Penalti Kustom",
};

const CRITERION_TYPES: readonly CriterionType[] = ["cost", "benefit"];

const IMPUTATION_STRATEGIES: readonly ImputationStrategy[] = [
  "penalty_max",
  "min_value",
  "mean",
  "custom_penalty",
];

const DEFAULT_CUSTOM_PENALTY = 1000;

function generateUniqueId(
  prefix: string,
  existingIds: ReadonlySet<string>
): string {
  let index = existingIds.size + 1;
  while (existingIds.has(`${prefix}${index}`)) {
    index += 1;
  }
  return `${prefix}${index}`;
}

function generateUniqueCode(existingCodes: ReadonlySet<string>): string {
  let index = existingCodes.size + 1;
  while (existingCodes.has(`C${index}`)) {
    index += 1;
  }
  return `C${index}`;
}

function isCriterionType(value: string | null): value is CriterionType {
  return value === "cost" || value === "benefit";
}

function isImputationStrategy(
  value: string | null
): value is ImputationStrategy {
  return (
    value === "penalty_max" ||
    value === "min_value" ||
    value === "mean" ||
    value === "custom_penalty"
  );
}

function formatRawDisplay(value: RawCellValue): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

interface NumberDraftInputProps {
  value: number;
  onCommit: (nextValue: number) => void;
  ariaLabel: string;
  className?: string;
  min?: number;
}

function NumberDraftInput({
  value,
  onCommit,
  ariaLabel,
  className,
  min,
}: NumberDraftInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const displayValue = draft !== null ? draft : String(value);

  return (
    <Input
      type="number"
      min={min}
      step="any"
      value={displayValue}
      aria-label={ariaLabel}
      className={className}
      onFocus={() => setDraft(String(value))}
      onChange={(event) => {
        const raw = event.target.value;
        setDraft(raw);
        if (raw.trim() === "") {
          return;
        }
        const parsed = Number(raw);
        if (Number.isFinite(parsed)) {
          onCommit(parsed);
        }
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

export function DataEditor({ input, result, onChange }: DataEditorProps) {
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const excludedById = useMemo(() => {
    const map = new Map<string, ExcludedCriterion>();
    if (!result) {
      return map;
    }
    for (const item of result.excludedCriteria) {
      map.set(item.criterionId, item);
    }
    return map;
  }, [result]);

  const imputedCellKeys = useMemo(() => {
    const keys = new Set<string>();
    if (!result) {
      return keys;
    }
    for (const log of result.imputationLogs) {
      keys.add(`${log.alternativeId}:${log.criterionId}`);
    }
    return keys;
  }, [result]);

  const handleImportFile = async (file: File) => {
    setIsImporting(true);
    setImportError(null);
    setImportSuccess(null);

    try {
      const parsed = await parseSpreadsheetToGadaInput(file);
      onChange(parsed);
      setImportSuccess(
        `Berhasil mengimpor "${file.name}": ${parsed.alternatives.length} alternatif, ${parsed.criteria.length} kriteria, ${parsed.respondents.length} responden.`
      );
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

  const handleCreateBlankDataset = () => {
    setImportError(null);
    setImportSuccess(
      "Dataset starter baru (3 alternatif × 3 kriteria × 2 responden) telah dimuat."
    );
    onChange(createBlankGadaInput());
  };

  return (
    <div className="space-y-6">
      <SpreadsheetToolbarCard
        datasetName={input.datasetName ?? ""}
        isImporting={isImporting}
        importError={importError}
        importSuccess={importSuccess}
        onDatasetNameChange={(nextName) =>
          onChange({
            ...input,
            datasetName: nextName,
          })
        }
        onFileSelected={handleImportFile}
        onDownloadTemplate={downloadTemplateWorkbook}
        onNewBlankDataset={handleCreateBlankDataset}
      />

      <Card>
        <CardHeader className="border-b pb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="size-4 text-primary" aria-hidden="true" />
                Editor Matriks Keputusan Dinamis
              </CardTitle>
              <CardDescription>
                Kelola konfigurasi kriteria, matriks alternatif (S × M), dan
                skor kepentingan responden (N × M) secara langsung.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{input.criteria.length} Kriteria</Badge>
              <Badge variant="outline">
                {input.alternatives.length} Alternatif
              </Badge>
              <Badge variant="outline">
                {input.respondents.length} Responden
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <Tabs defaultValue="criteria" className="space-y-4">
            <TabsList className="grid h-auto w-full grid-cols-1 gap-1 p-1 sm:inline-flex sm:w-fit sm:grid-cols-none">
              <TabsTrigger value="criteria" className="px-3 py-1.5">
                Kriteria ({input.criteria.length})
              </TabsTrigger>
              <TabsTrigger value="alternatives" className="px-3 py-1.5">
                Alternatif ({input.alternatives.length} × {input.criteria.length})
              </TabsTrigger>
              <TabsTrigger value="respondents" className="px-3 py-1.5">
                Responden ({input.respondents.length} × {input.criteria.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="criteria">
              <CriteriaCrudTab
                input={input}
                excludedById={excludedById}
                onChange={onChange}
              />
            </TabsContent>

            <TabsContent value="alternatives">
              <AlternativesCrudTab
                input={input}
                excludedById={excludedById}
                imputedCellKeys={imputedCellKeys}
                onChange={onChange}
              />
            </TabsContent>

            <TabsContent value="respondents">
              <RespondentsCrudTab
                input={input}
                excludedById={excludedById}
                onChange={onChange}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function SpreadsheetToolbarCard({
  datasetName,
  isImporting,
  importError,
  importSuccess,
  onDatasetNameChange,
  onFileSelected,
  onDownloadTemplate,
  onNewBlankDataset,
}: {
  datasetName: string;
  isImporting: boolean;
  importError: string | null;
  importSuccess: string | null;
  onDatasetNameChange: (nextName: string) => void;
  onFileSelected: (file: File) => void;
  onDownloadTemplate: () => void;
  onNewBlankDataset: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const datasetInputId = useId();
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) {
      return;
    }
    onFileSelected(file);
  };

  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet
                className="size-4 text-primary"
                aria-hidden="true"
              />
              Impor Excel / CSV &amp; Pengaturan Dataset
            </CardTitle>
            <CardDescription>
              Unggah file .xlsx, .xls, atau .csv dari domain apa pun untuk
              memperbarui matriks keputusan.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDownloadTemplate}
              className="gap-1.5"
            >
              <Download className="size-3.5" aria-hidden="true" />
              Download Template
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onNewBlankDataset}
              className="gap-1.5"
            >
              <FilePlus2 className="size-3.5" aria-hidden="true" />
              Dataset Baru (3×3)
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor={datasetInputId}>Judul Dataset / Studi Kasus</Label>
            <Input
              id={datasetInputId}
              value={datasetName}
              onChange={(event) => onDatasetNameChange(event.target.value)}
              placeholder="Contoh: Pemilihan Laptop Terbaik"
            />
            <p className="text-xs text-muted-foreground">
              Ditampilkan pada header aplikasi dan nama file ekspor Excel.
            </p>
          </div>

          <div className="lg:col-span-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(event) => {
                handleFiles(event.target.files);
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
                handleFiles(event.dataTransfer.files);
              }}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/40"
              }`}
            >
              <Upload
                className="size-5 text-muted-foreground"
                aria-hidden="true"
              />
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">
                  {isImporting
                    ? "Memproses file spreadsheet..."
                    : "Seret & lepas file .xlsx, .xls, atau .csv ke sini, atau klik untuk memilih"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Sheet 1: Alternatif &amp; Kriteria. Sheet 2 opsional: Skor
                  Responden (1–5).
                </p>
              </div>
            </div>
          </div>
        </div>

        {importError !== null ? (
          <Alert variant="destructive">
            <AlertCircle className="size-4" aria-hidden="true" />
            <AlertTitle>Impor Spreadsheet Gagal</AlertTitle>
            <AlertDescription>{importError}</AlertDescription>
          </Alert>
        ) : null}

        {importSuccess !== null ? (
          <Alert>
            <CheckCircle2
              className="size-4 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
            <AlertTitle>Dataset Diperbarui</AlertTitle>
            <AlertDescription>{importSuccess}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CriteriaCrudTab({
  input,
  excludedById,
  onChange,
}: {
  input: GadaInput;
  excludedById: ReadonlyMap<string, ExcludedCriterion>;
  onChange: (next: GadaInput) => void;
}) {
  const handleAddCriterion = () => {
    const existingIds = new Set(input.criteria.map((c) => c.id));
    const existingCodes = new Set(
      input.criteria.map((c) => c.code.trim().toUpperCase())
    );
    const id = generateUniqueId("c", existingIds);
    const code = generateUniqueCode(existingCodes);

    const newCriterion: CriterionConfig = {
      id,
      code,
      name: `Kriteria ${code}`,
      type: "benefit",
      missingStrategy: "min_value",
      active: true,
    };

    const nextAltValues: Record<string, Record<string, RawCellValue>> = {};
    input.alternatives.forEach((alt, altIdx) => {
      nextAltValues[alt.id] = {
        ...input.alternativeValues[alt.id],
        [id]: altIdx + 1,
      };
    });

    const nextRespScores: Record<string, Record<string, number>> = {};
    for (const resp of input.respondents) {
      nextRespScores[resp.id] = {
        ...input.respondentScores[resp.id],
        [id]: DEFAULT_LIKERT_SCORE,
      };
    }

    onChange({
      ...input,
      criteria: [...input.criteria, newCriterion],
      alternativeValues: nextAltValues,
      respondentScores: nextRespScores,
    });
  };

  const handleUpdateCriterion = (
    criterionId: string,
    patch: Partial<CriterionConfig>
  ) => {
    onChange({
      ...input,
      criteria: input.criteria.map((criterion) =>
        criterion.id === criterionId ? { ...criterion, ...patch } : criterion
      ),
    });
  };

  const handleTypeChange = (
    criterion: CriterionConfig,
    nextType: string | null
  ) => {
    if (!isCriterionType(nextType)) {
      return;
    }
    const defaultStrategy: ImputationStrategy =
      nextType === "cost" ? "penalty_max" : "min_value";

    handleUpdateCriterion(criterion.id, {
      type: nextType,
      missingStrategy: defaultStrategy,
    });
  };

  const handleStrategyChange = (
    criterion: CriterionConfig,
    nextStrategy: string | null
  ) => {
    if (!isImputationStrategy(nextStrategy)) {
      return;
    }
    handleUpdateCriterion(criterion.id, {
      missingStrategy: nextStrategy,
      ...(nextStrategy === "custom_penalty" &&
      criterion.customPenalty === undefined
        ? { customPenalty: DEFAULT_CUSTOM_PENALTY }
        : {}),
    });
  };

  const handleDeleteCriterion = (criterionId: string) => {
    const nextAltValues: Record<string, Record<string, RawCellValue>> = {};
    for (const [altId, row] of Object.entries(input.alternativeValues)) {
      const rest = { ...row };
      delete rest[criterionId];
      nextAltValues[altId] = rest;
    }

    const nextRespScores: Record<string, Record<string, number>> = {};
    for (const [respId, row] of Object.entries(input.respondentScores)) {
      const rest = { ...row };
      delete rest[criterionId];
      nextRespScores[respId] = rest;
    }

    onChange({
      ...input,
      criteria: input.criteria.filter((c) => c.id !== criterionId),
      alternativeValues: nextAltValues,
      respondentScores: nextRespScores,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Kriteria bertipe <span className="font-medium text-foreground">Cost</span>{" "}
          (lebih kecil lebih baik) otomatis mengatur strategi nilai kosong ke{" "}
          <code className="font-mono">penalty_max</code>;{" "}
          <span className="font-medium text-foreground">Benefit</span> ke{" "}
          <code className="font-mono">min_value</code>.
        </p>
        <Button
          type="button"
          size="sm"
          onClick={handleAddCriterion}
          className="gap-1.5 self-start sm:self-auto"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Tambah Kriteria
        </Button>
      </div>

      <Separator />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Kode</TableHead>
            <TableHead className="min-w-44">Nama Kriteria</TableHead>
            <TableHead className="w-32">Tipe</TableHead>
            <TableHead className="w-28">Status</TableHead>
            <TableHead className="min-w-48">Strategi Missing</TableHead>
            <TableHead className="w-36">Penalti Kustom</TableHead>
            <TableHead className="w-14 text-right">Hapus</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {input.criteria.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="py-8 text-center text-sm text-muted-foreground"
              >
                Belum ada kriteria. Klik &ldquo;Tambah Kriteria&rdquo; untuk
                memulai.
              </TableCell>
            </TableRow>
          ) : (
            input.criteria.map((criterion) => {
              const excluded = excludedById.get(criterion.id);

              return (
                <TableRow
                  key={criterion.id}
                  className={!criterion.active ? "opacity-65" : undefined}
                >
                  <TableCell>
                    <Input
                      value={criterion.code}
                      onChange={(event) =>
                        handleUpdateCriterion(criterion.id, {
                          code: event.target.value,
                        })
                      }
                      aria-label={`Kode kriteria ${criterion.name}`}
                      className="w-20 font-mono text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Input
                        value={criterion.name}
                        onChange={(event) =>
                          handleUpdateCriterion(criterion.id, {
                            name: event.target.value,
                          })
                        }
                        aria-label={`Nama kriteria ${criterion.code}`}
                        className="min-w-40"
                      />
                      {excluded ? (
                        <Badge
                          variant="outline"
                          className="border-amber-300 bg-amber-500/10 text-[11px] text-amber-700 dark:border-amber-500/30 dark:text-amber-300"
                        >
                          {excluded.reason === "zero_variance"
                            ? "Tereliminasi: Varians Nol"
                            : "Nonaktif"}
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={criterion.type}
                      onValueChange={(val) => handleTypeChange(criterion, val)}
                    >
                      <SelectTrigger
                        size="sm"
                        className="w-28"
                        aria-label={`Tipe kriteria ${criterion.name}`}
                      >
                        <SelectValue>
                          <Badge
                            variant="outline"
                            className={
                              criterion.type === "cost"
                                ? "border-rose-200 bg-rose-500/10 text-rose-700 dark:border-rose-500/30 dark:text-rose-300"
                                : "border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300"
                            }
                          >
                            {CRITERION_TYPE_LABELS[criterion.type]}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {CRITERION_TYPES.map((typeOption) => (
                          <SelectItem key={typeOption} value={typeOption}>
                            {CRITERION_TYPE_LABELS[typeOption]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      size="sm"
                      variant={criterion.active ? "default" : "outline"}
                      aria-pressed={criterion.active}
                      onClick={() =>
                        handleUpdateCriterion(criterion.id, {
                          active: !criterion.active,
                        })
                      }
                    >
                      {criterion.active ? "Aktif" : "Nonaktif"}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={criterion.missingStrategy}
                      onValueChange={(val) =>
                        handleStrategyChange(criterion, val)
                      }
                    >
                      <SelectTrigger
                        size="sm"
                        className="w-44"
                        aria-label={`Strategi missing ${criterion.name}`}
                      >
                        <SelectValue>
                          {IMPUTATION_STRATEGY_LABELS[criterion.missingStrategy]}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {IMPUTATION_STRATEGIES.map((strategy) => (
                          <SelectItem key={strategy} value={strategy}>
                            {IMPUTATION_STRATEGY_LABELS[strategy]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {criterion.missingStrategy === "custom_penalty" ? (
                      <NumberDraftInput
                        value={criterion.customPenalty ?? DEFAULT_CUSTOM_PENALTY}
                        min={0.0001}
                        ariaLabel={`Penalti kustom untuk ${criterion.name}`}
                        className="w-32 font-mono text-xs"
                        onCommit={(nextVal) =>
                          handleUpdateCriterion(criterion.id, {
                            customPenalty: nextVal,
                          })
                        }
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Hapus kriteria ${criterion.name}`}
                      onClick={() => handleDeleteCriterion(criterion.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function AlternativesCrudTab({
  input,
  excludedById,
  imputedCellKeys,
  onChange,
}: {
  input: GadaInput;
  excludedById: ReadonlyMap<string, ExcludedCriterion>;
  imputedCellKeys: ReadonlySet<string>;
  onChange: (next: GadaInput) => void;
}) {
  const handleAddAlternative = () => {
    const existingIds = new Set(input.alternatives.map((a) => a.id));
    const id = generateUniqueId("alt-", existingIds);
    const nextNumber = input.alternatives.length + 1;

    const newAlt: AlternativeItem = {
      id,
      name: `Alternatif #${nextNumber}`,
      address: "",
    };

    const defaultRow: Record<string, RawCellValue> = {};
    for (const criterion of input.criteria) {
      defaultRow[criterion.id] = criterion.isBinary ? "Ya" : 1;
    }

    onChange({
      ...input,
      alternatives: [...input.alternatives, newAlt],
      alternativeValues: {
        ...input.alternativeValues,
        [id]: defaultRow,
      },
    });
  };

  const handleUpdateAlternativeMeta = (
    altId: string,
    patch: Partial<AlternativeItem>
  ) => {
    onChange({
      ...input,
      alternatives: input.alternatives.map((alt) =>
        alt.id === altId ? { ...alt, ...patch } : alt
      ),
    });
  };

  const handleUpdateCellValue = (
    altId: string,
    criterionId: string,
    rawValue: string
  ) => {
    onChange({
      ...input,
      alternativeValues: {
        ...input.alternativeValues,
        [altId]: {
          ...input.alternativeValues[altId],
          [criterionId]: rawValue,
        },
      },
    });
  };

  const handleDeleteAlternative = (altId: string) => {
    const nextAltValues = { ...input.alternativeValues };
    delete nextAltValues[altId];

    onChange({
      ...input,
      alternatives: input.alternatives.filter((alt) => alt.id !== altId),
      alternativeValues: nextAltValues,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Sel menerima angka positif, satuan (<code className="font-mono">800 m</code>,{" "}
          <code className="font-mono">4.5 km</code>,{" "}
          <code className="font-mono">3 hari</code>), rentang jam (
          <code className="font-mono">08.00 - 18.00</code>), biner (
          <code className="font-mono">Ya</code>/<code className="font-mono">Tidak</code>
          ), atau <code className="font-mono">-</code> untuk imputasi otomatis.
        </p>
        <Button
          type="button"
          size="sm"
          onClick={handleAddAlternative}
          className="gap-1.5 self-start sm:self-auto"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Tambah Alternatif
        </Button>
      </div>

      <Separator />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead className="min-w-44">Nama Alternatif</TableHead>
            <TableHead className="min-w-40">Keterangan / Alamat</TableHead>
            {input.criteria.map((criterion) => {
              const excluded = excludedById.get(criterion.id);
              return (
                <TableHead
                  key={criterion.id}
                  className={`min-w-32 ${excluded ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs">{criterion.code}</span>
                    <Badge
                      variant="outline"
                      className={
                        criterion.type === "cost"
                          ? "border-rose-200 bg-rose-500/10 text-[10px] text-rose-700 dark:border-rose-500/30 dark:text-rose-300"
                          : "border-emerald-200 bg-emerald-500/10 text-[10px] text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300"
                      }
                    >
                      {criterion.type}
                    </Badge>
                  </div>
                  <div className="truncate text-[11px] font-normal text-muted-foreground">
                    {criterion.name}
                  </div>
                </TableHead>
              );
            })}
            <TableHead className="w-14 text-right">Hapus</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {input.alternatives.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={input.criteria.length + 4}
                className="py-8 text-center text-sm text-muted-foreground"
              >
                Belum ada alternatif. Klik &ldquo;Tambah Alternatif&rdquo; untuk
                menambah baris.
              </TableCell>
            </TableRow>
          ) : (
            input.alternatives.map((alternative, rowIndex) => (
              <TableRow key={alternative.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {rowIndex + 1}
                </TableCell>
                <TableCell>
                  <Input
                    value={alternative.name}
                    onChange={(event) =>
                      handleUpdateAlternativeMeta(alternative.id, {
                        name: event.target.value,
                      })
                    }
                    aria-label={`Nama alternatif ${rowIndex + 1}`}
                    className="min-w-40"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={alternative.address ?? ""}
                    onChange={(event) =>
                      handleUpdateAlternativeMeta(alternative.id, {
                        address: event.target.value,
                      })
                    }
                    placeholder="Opsional..."
                    aria-label={`Keterangan ${alternative.name}`}
                    className="min-w-36"
                  />
                </TableCell>
                {input.criteria.map((criterion) => {
                  const rawCell =
                    input.alternativeValues[alternative.id]?.[criterion.id];
                  const isImputed = imputedCellKeys.has(
                    `${alternative.id}:${criterion.id}`
                  );
                  const isExcluded = excludedById.has(criterion.id);

                  return (
                    <TableCell
                      key={criterion.id}
                      className={isExcluded ? "opacity-60" : undefined}
                    >
                      <Input
                        value={formatRawDisplay(rawCell)}
                        onChange={(event) =>
                          handleUpdateCellValue(
                            alternative.id,
                            criterion.id,
                            event.target.value
                          )
                        }
                        aria-label={`Nilai ${alternative.name} untuk ${criterion.name}`}
                        className={`min-w-28 font-mono text-xs ${
                          isImputed
                            ? "border-sky-400/70 bg-sky-500/5"
                            : ""
                        }`}
                      />
                    </TableCell>
                  );
                })}
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Hapus alternatif ${alternative.name}`}
                    onClick={() => handleDeleteAlternative(alternative.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function RespondentsCrudTab({
  input,
  excludedById,
  onChange,
}: {
  input: GadaInput;
  excludedById: ReadonlyMap<string, ExcludedCriterion>;
  onChange: (next: GadaInput) => void;
}) {
  const handleAddRespondent = () => {
    const existingIds = new Set(input.respondents.map((r) => r.id));
    const id = generateUniqueId("resp-", existingIds);
    const nextNumber = input.respondents.length + 1;

    const newRespondent: RespondentItem = {
      id,
      name: `Responden #${nextNumber}`,
    };

    const defaultScores: Record<string, number> = {};
    for (const criterion of input.criteria) {
      defaultScores[criterion.id] = DEFAULT_LIKERT_SCORE;
    }

    onChange({
      ...input,
      respondents: [...input.respondents, newRespondent],
      respondentScores: {
        ...input.respondentScores,
        [id]: defaultScores,
      },
    });
  };

  const handleUpdateRespondentName = (respId: string, name: string) => {
    onChange({
      ...input,
      respondents: input.respondents.map((resp) =>
        resp.id === respId ? { ...resp, name } : resp
      ),
    });
  };

  const handleUpdateScore = (
    respId: string,
    criterionId: string,
    score: number
  ) => {
    onChange({
      ...input,
      respondentScores: {
        ...input.respondentScores,
        [respId]: {
          ...input.respondentScores[respId],
          [criterionId]: score,
        },
      },
    });
  };

  const handleDeleteRespondent = (respId: string) => {
    const nextScores = { ...input.respondentScores };
    delete nextScores[respId];

    onChange({
      ...input,
      respondents: input.respondents.filter((resp) => resp.id !== respId),
      respondentScores: nextScores,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Setiap skor kepentingan responden harus bernilai positif (&gt; 0),
          misalnya skala Likert 1–5.
        </p>
        <Button
          type="button"
          size="sm"
          onClick={handleAddRespondent}
          className="gap-1.5 self-start sm:self-auto"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Tambah Responden
        </Button>
      </div>

      <Separator />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead className="min-w-48">Nama Responden / Penilai</TableHead>
            {input.criteria.map((criterion) => {
              const excluded = excludedById.get(criterion.id);
              return (
                <TableHead
                  key={criterion.id}
                  className={`min-w-24 ${excluded ? "opacity-60" : ""}`}
                >
                  <div className="font-mono text-xs">{criterion.code}</div>
                  <div className="max-w-28 truncate text-[11px] font-normal text-muted-foreground">
                    {criterion.name}
                  </div>
                </TableHead>
              );
            })}
            <TableHead className="w-14 text-right">Hapus</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {input.respondents.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={input.criteria.length + 3}
                className="py-8 text-center text-sm text-muted-foreground"
              >
                Belum ada responden. Klik &ldquo;Tambah Responden&rdquo; untuk
                menambah penilai.
              </TableCell>
            </TableRow>
          ) : (
            input.respondents.map((respondent, rowIndex) => (
              <TableRow key={respondent.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {rowIndex + 1}
                </TableCell>
                <TableCell>
                  <Input
                    value={respondent.name}
                    onChange={(event) =>
                      handleUpdateRespondentName(
                        respondent.id,
                        event.target.value
                      )
                    }
                    aria-label={`Nama responden ${rowIndex + 1}`}
                    className="min-w-44"
                  />
                </TableCell>
                {input.criteria.map((criterion) => {
                  const score =
                    input.respondentScores[respondent.id]?.[criterion.id] ??
                    DEFAULT_LIKERT_SCORE;
                  const isExcluded = excludedById.has(criterion.id);

                  return (
                    <TableCell
                      key={criterion.id}
                      className={isExcluded ? "opacity-60" : undefined}
                    >
                      <NumberDraftInput
                        value={score}
                        min={0}
                        ariaLabel={`Skor ${respondent.name} untuk ${criterion.name}`}
                        className="w-20 font-mono text-xs"
                        onCommit={(nextScore) =>
                          handleUpdateScore(
                            respondent.id,
                            criterion.id,
                            nextScore
                          )
                        }
                      />
                    </TableCell>
                  );
                })}
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Hapus responden ${respondent.name}`}
                    onClick={() => handleDeleteRespondent(respondent.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
