"use client";

import { useId, useMemo, useState } from "react";
import {
  CheckCircle2,
  Database,
  FileSpreadsheet,
  Plus,
  Trash2,
} from "lucide-react";
import { getCriterionTypeBadgeClass } from "@/components/gada/gada-ui";
import { SpreadsheetDropzone } from "@/components/gada/SpreadsheetDropzone";
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

function generateUniqueKey(
  prefix: string,
  existing: ReadonlySet<string>
): string {
  let index = existing.size + 1;
  while (existing.has(`${prefix}${index}`)) {
    index += 1;
  }
  return `${prefix}${index}`;
}

function isCriterionType(value: string | null): value is CriterionType {
  return value === "cost" || value === "benefit";
}

function isImputationStrategy(
  value: string | null
): value is ImputationStrategy {
  return IMPUTATION_STRATEGIES.some((strategy) => strategy === value);
}

function formatRawDisplay(value: RawCellValue): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function omitRecordKey<T>(
  records: Record<string, Record<string, T>>,
  keyToOmit: string
): Record<string, Record<string, T>> {
  const next: Record<string, Record<string, T>> = {};
  for (const [rowId, row] of Object.entries(records)) {
    const rest = { ...row };
    delete rest[keyToOmit];
    next[rowId] = rest;
  }
  return next;
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
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const datasetInputId = useId();

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet
              className="size-4 text-primary"
              aria-hidden="true"
            />
            Judul &amp; Ganti File Dataset
          </CardTitle>
          <CardDescription>
            Ubah judul dataset atau unggah file .xlsx, .xls, maupun .csv baru
            untuk mengganti matriks aktif.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor={datasetInputId}>Judul Dataset</Label>
              <Input
                id={datasetInputId}
                value={input.datasetName ?? ""}
                onChange={(event) =>
                  onChange({ ...input, datasetName: event.target.value })
                }
                placeholder="Contoh: Pemilihan Laptop Terbaik"
              />
              <p className="text-xs text-muted-foreground">
                Ditampilkan pada header aplikasi dan nama file ekspor Excel.
              </p>
            </div>

            <div className="lg:col-span-2">
              <SpreadsheetDropzone
                compact
                helperText="Sheet 1: Alternatif & Kriteria. Sheet 2 opsional: Skor Responden (1–5)."
                onImported={(parsed, fileName) => {
                  onChange(parsed);
                  setImportSuccess(
                    `Berhasil mengimpor "${fileName}": ${parsed.alternatives.length} alternatif, ${parsed.criteria.length} kriteria, ${parsed.respondents.length} responden.`
                  );
                }}
              />
            </div>
          </div>

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
    const id = generateUniqueKey("c", existingIds);
    const code = generateUniqueKey("C", existingCodes);

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

  const handleDeleteCriterion = (criterionId: string) => {
    onChange({
      ...input,
      criteria: input.criteria.filter((c) => c.id !== criterionId),
      alternativeValues: omitRecordKey(input.alternativeValues, criterionId),
      respondentScores: omitRecordKey(input.respondentScores, criterionId),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Kriteria bertipe{" "}
          <span className="font-medium text-foreground">Cost</span> (lebih kecil
          lebih baik) otomatis mengatur strategi nilai kosong ke{" "}
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
                      onValueChange={(val) => {
                        if (!isCriterionType(val)) {
                          return;
                        }
                        handleUpdateCriterion(criterion.id, {
                          type: val,
                          missingStrategy:
                            val === "cost" ? "penalty_max" : "min_value",
                        });
                      }}
                    >
                      <SelectTrigger
                        size="sm"
                        className="w-28"
                        aria-label={`Tipe kriteria ${criterion.name}`}
                      >
                        <SelectValue>
                          <Badge
                            variant="outline"
                            className={getCriterionTypeBadgeClass(
                              criterion.type
                            )}
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
                      onValueChange={(val) => {
                        if (!isImputationStrategy(val)) {
                          return;
                        }
                        handleUpdateCriterion(criterion.id, {
                          missingStrategy: val,
                          ...(val === "custom_penalty" &&
                          criterion.customPenalty === undefined
                            ? { customPenalty: DEFAULT_CUSTOM_PENALTY }
                            : {}),
                        });
                      }}
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
    const id = generateUniqueKey("alt-", existingIds);
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
          Sel menerima angka positif, satuan (
          <code className="font-mono">800 m</code>,{" "}
          <code className="font-mono">4.5 km</code>,{" "}
          <code className="font-mono">3 hari</code>), rentang jam (
          <code className="font-mono">08.00 - 18.00</code>), biner (
          <code className="font-mono">Ya</code>/
          <code className="font-mono">Tidak</code>), atau{" "}
          <code className="font-mono">-</code> untuk imputasi otomatis.
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
                      className={`text-[10px] ${getCriterionTypeBadgeClass(criterion.type)}`}
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
                          isImputed ? "border-sky-400/70 bg-sky-500/5" : ""
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
    const id = generateUniqueKey("resp-", existingIds);
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
