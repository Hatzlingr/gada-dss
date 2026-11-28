"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Minus,
  Radar as RadarIcon,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
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
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DEFAULT_SLIDER_SCORE,
  RADAR_MAX_SCALE,
  RECOMMENDATION_TIER_CUTOFFS,
  SLIDER_MAX_SCORE,
  SLIDER_MIN_SCORE,
} from "@/lib/gada/constants";
import {
  buildConsensusComparisonRows,
  buildRadarChartData,
  compareSimulations,
  computeSimulatedWeights,
  type RadarChartDatum,
} from "@/lib/gada/simulator";
import type {
  CriterionConfig,
  CriterionWeightResult,
  GadaInput,
  GadaOutput,
  SimulationComparisonRow,
} from "@/lib/gada/types";

export interface SimulatorViewProps {
  input: GadaInput;
  baseResult: GadaOutput;
}

const SCORE_DECIMALS = 6;
const WEIGHT_PCT_DECIMALS = 2;
const RADAR_SCORE_DECIMALS = 1;
const MIN_RADAR_SELECTION = 2;
const MAX_RADAR_SELECTION = 4;
const DEFAULT_TOP_RADAR_COUNT = 3;
const RADAR_CHART_HEIGHT = 360;

const RADAR_SERIES_STYLES = [
  {
    stroke: "var(--chart-1)",
    fill: "var(--chart-1)",
    dotClass: "bg-(--chart-1)",
    pillClass:
      "border-blue-300 bg-blue-500/10 text-blue-800 dark:border-blue-500/40 dark:text-blue-200",
  },
  {
    stroke: "var(--chart-2)",
    fill: "var(--chart-2)",
    dotClass: "bg-(--chart-2)",
    pillClass:
      "border-emerald-300 bg-emerald-500/10 text-emerald-800 dark:border-emerald-500/40 dark:text-emerald-200",
  },
  {
    stroke: "var(--chart-3)",
    fill: "var(--chart-3)",
    dotClass: "bg-(--chart-3)",
    pillClass:
      "border-amber-300 bg-amber-500/10 text-amber-800 dark:border-amber-500/40 dark:text-amber-200",
  },
  {
    stroke: "var(--chart-4)",
    fill: "var(--chart-4)",
    dotClass: "bg-(--chart-4)",
    pillClass:
      "border-rose-300 bg-rose-500/10 text-rose-800 dark:border-rose-500/40 dark:text-rose-200",
  },
] as const;

const SLIDER_SCALE_LABELS: Record<number, string> = {
  1: "Sangat Rendah",
  2: "Rendah",
  3: "Sedang",
  4: "Tinggi",
  5: "Sangat Penting",
};

const subscribeNoop = (): (() => void) => () => {};

function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
}

const radarChartSkeleton = (
  <div className="h-[360px] w-full animate-pulse rounded-lg bg-muted/50" />
);

interface OverrideState {
  signature: string;
  weights: Record<string, number>;
}

interface RadarSelectionState {
  signature: string;
  ids: string[];
}

export function SimulatorView({ input, baseResult }: SimulatorViewProps) {
  const isClient = useIsClient();

  const criteriaSignature = useMemo(
    () => baseResult.activeCriteria.map((criterion) => criterion.id).join("|"),
    [baseResult.activeCriteria]
  );

  const alternativesSignature = useMemo(
    () => baseResult.rankings.map((row) => row.alternativeId).join("|"),
    [baseResult.rankings]
  );

  const [overrideState, setOverrideState] = useState<OverrideState | null>(null);
  const [radarSelectionState, setRadarSelectionState] =
    useState<RadarSelectionState | null>(null);

  const activeOverrideWeights =
    overrideState !== null && overrideState.signature === criteriaSignature
      ? overrideState.weights
      : null;

  const isSimulating = activeOverrideWeights !== null;

  const sliderValues = useMemo(() => {
    const map: Record<string, number> = {};
    for (const criterion of baseResult.activeCriteria) {
      map[criterion.id] =
        activeOverrideWeights?.[criterion.id] ?? DEFAULT_SLIDER_SCORE;
    }
    return map;
  }, [baseResult.activeCriteria, activeOverrideWeights]);

  const displayedWeights = useMemo(() => {
    if (activeOverrideWeights === null) {
      return baseResult.criteriaWeights;
    }
    return computeSimulatedWeights(
      baseResult.activeCriteria,
      activeOverrideWeights
    );
  }, [baseResult.activeCriteria, baseResult.criteriaWeights, activeOverrideWeights]);

  const groupWeightById = useMemo(() => {
    const map = new Map<string, CriterionWeightResult>();
    for (const weight of baseResult.criteriaWeights) {
      map.set(weight.criterionId, weight);
    }
    return map;
  }, [baseResult.criteriaWeights]);

  const comparisonRows = useMemo(() => {
    if (activeOverrideWeights === null) {
      return buildConsensusComparisonRows(baseResult);
    }
    return compareSimulations(input, baseResult, activeOverrideWeights);
  }, [input, baseResult, activeOverrideWeights]);

  const defaultSelectedIds = useMemo(
    () =>
      baseResult.rankings
        .slice(0, Math.min(DEFAULT_TOP_RADAR_COUNT, baseResult.rankings.length))
        .map((row) => row.alternativeId),
    [baseResult.rankings]
  );

  const selectedAlternativeIds = useMemo(() => {
    if (
      radarSelectionState === null ||
      radarSelectionState.signature !== alternativesSignature
    ) {
      return defaultSelectedIds;
    }

    const validIds = new Set(
      baseResult.rankings.map((row) => row.alternativeId)
    );
    const filtered = radarSelectionState.ids.filter((id) => validIds.has(id));
    return filtered.length > 0 ? filtered : defaultSelectedIds;
  }, [
    radarSelectionState,
    alternativesSignature,
    baseResult.rankings,
    defaultSelectedIds,
  ]);

  const radarData = useMemo(
    () => buildRadarChartData(input, baseResult, selectedAlternativeIds),
    [input, baseResult, selectedAlternativeIds]
  );

  const addressByAltId = useMemo(() => {
    const map = new Map<string, string>();
    for (const alt of input.alternatives) {
      if (alt.address) {
        map.set(alt.id, alt.address);
      }
    }
    return map;
  }, [input.alternatives]);

  const handleSliderChange = (criterionId: string, nextScore: number) => {
    const clampedScore = Math.min(
      SLIDER_MAX_SCORE,
      Math.max(SLIDER_MIN_SCORE, Math.round(nextScore))
    );

    setOverrideState((prev) => {
      const baseWeights: Record<string, number> = {};
      for (const criterion of baseResult.activeCriteria) {
        baseWeights[criterion.id] =
          prev !== null && prev.signature === criteriaSignature
            ? (prev.weights[criterion.id] ?? DEFAULT_SLIDER_SCORE)
            : DEFAULT_SLIDER_SCORE;
      }
      baseWeights[criterionId] = clampedScore;
      return {
        signature: criteriaSignature,
        weights: baseWeights,
      };
    });
  };

  const handleResetToConsensus = () => {
    setOverrideState(null);
  };

  const minSelectable = Math.min(
    MIN_RADAR_SELECTION,
    baseResult.rankings.length
  );

  const handleToggleRadarAlternative = (alternativeId: string) => {
    const isCurrentlySelected = selectedAlternativeIds.includes(alternativeId);

    if (isCurrentlySelected) {
      if (selectedAlternativeIds.length <= minSelectable) {
        return;
      }
      setRadarSelectionState({
        signature: alternativesSignature,
        ids: selectedAlternativeIds.filter((id) => id !== alternativeId),
      });
      return;
    }

    if (selectedAlternativeIds.length >= MAX_RADAR_SELECTION) {
      return;
    }

    setRadarSelectionState({
      signature: alternativesSignature,
      ids: [...selectedAlternativeIds, alternativeId],
    });
  };

  const handleResetRadarSelection = () => {
    setRadarSelectionState(null);
  };

  return (
    <div className="space-y-6">
      <SimulationSummaryStrip
        comparisonRows={comparisonRows}
        isSimulating={isSimulating}
        selectedCount={selectedAlternativeIds.length}
      />

      <section
        aria-label="Panel Simulasi Bobot dan Grafik Radar"
        className="grid grid-cols-1 gap-6 lg:grid-cols-12"
      >
        <div className="lg:col-span-5">
          <WeightSlidersCard
            activeCriteria={baseResult.activeCriteria}
            sliderValues={sliderValues}
            displayedWeights={displayedWeights}
            groupWeightById={groupWeightById}
            isSimulating={isSimulating}
            onSliderChange={handleSliderChange}
            onReset={handleResetToConsensus}
          />
        </div>

        <div className="lg:col-span-7">
          <RadarComparisonCard
            baseResult={baseResult}
            selectedAlternativeIds={selectedAlternativeIds}
            minSelectable={minSelectable}
            radarData={radarData}
            isClient={isClient}
            isDefaultSelection={
              radarSelectionState === null ||
              radarSelectionState.signature !== alternativesSignature
            }
            onToggleAlternative={handleToggleRadarAlternative}
            onResetSelection={handleResetRadarSelection}
          />
        </div>
      </section>

      <SimulationComparisonTableCard
        rows={comparisonRows}
        addressByAltId={addressByAltId}
        isSimulating={isSimulating}
      />
    </div>
  );
}

function SimulationSummaryStrip({
  comparisonRows,
  isSimulating,
  selectedCount,
}: {
  comparisonRows: readonly SimulationComparisonRow[];
  isSimulating: boolean;
  selectedCount: number;
}) {
  let improvedCount = 0;
  let droppedCount = 0;
  let unchangedCount = 0;

  for (const row of comparisonRows) {
    if (row.rankDelta > 0) {
      improvedCount += 1;
    } else if (row.rankDelta < 0) {
      droppedCount += 1;
    } else {
      unchangedCount += 1;
    }
  }

  const personalTop = comparisonRows[0];
  const groupTop = comparisonRows.find((row) => row.groupRank === 1);

  return (
    <section
      aria-label="Ringkasan Simulasi What-If"
      className="grid grid-cols-1 gap-4 md:grid-cols-3"
    >
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardDescription className="font-medium">
              Mode Bobot Aktif
            </CardDescription>
            <SlidersHorizontal
              className="size-4 text-primary"
              aria-hidden="true"
            />
          </div>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            {isSimulating ? "Simulasi Pribadi" : "Konsensus Kelompok"}
            <Badge variant={isSimulating ? "default" : "secondary"}>
              {isSimulating ? "Override Aktif" : "ΔRank = 0"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          {isSimulating
            ? "Peringkat dihitung ulang menggunakan bobot slider preferensi pribadi (1–5)."
            : "Menggunakan bobot konsensus responden asli. Geser slider mana saja untuk simulasi."}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardDescription className="font-medium">
              Peringkat #1 Simulasi
            </CardDescription>
            <Sparkles className="size-4 text-amber-500" aria-hidden="true" />
          </div>
          <CardTitle className="line-clamp-1 text-lg font-semibold">
            {personalTop ? personalTop.name : "-"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Grup #1:{" "}
            <span className="font-medium text-foreground">
              {groupTop ? groupTop.name : "-"}
            </span>
          </span>
          {personalTop ? (
            <span className="font-mono font-medium text-foreground tabular-nums">
              {formatScore(personalTop.personalScore)}
            </span>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardDescription className="font-medium">
              Pergeseran Peringkat (ΔRank)
            </CardDescription>
            <TrendingUp className="size-4 text-chart-2" aria-hidden="true" />
          </div>
          <CardTitle className="text-lg font-semibold tabular-nums">
            {improvedCount} Naik • {droppedCount} Turun
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>Tetap: {unchangedCount} alternatif</span>
          <Badge variant="outline">
            Radar: {selectedCount} dipilih
          </Badge>
        </CardContent>
      </Card>
    </section>
  );
}

function WeightSlidersCard({
  activeCriteria,
  sliderValues,
  displayedWeights,
  groupWeightById,
  isSimulating,
  onSliderChange,
  onReset,
}: {
  activeCriteria: readonly CriterionConfig[];
  sliderValues: Record<string, number>;
  displayedWeights: readonly CriterionWeightResult[];
  groupWeightById: ReadonlyMap<string, CriterionWeightResult>;
  isSimulating: boolean;
  onSliderChange: (criterionId: string, nextScore: number) => void;
  onReset: () => void;
}) {
  const simulatedWeightById = useMemo(() => {
    const map = new Map<string, CriterionWeightResult>();
    for (const item of displayedWeights) {
      map.set(item.criterionId, item);
    }
    return map;
  }, [displayedWeights]);

  return (
    <Card className="h-full">
      <CardHeader className="gap-3 border-b pb-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <SlidersHorizontal
                className="size-4 text-primary"
                aria-hidden="true"
              />
              What-If Simulator Bobot (1–5)
            </CardTitle>
            <CardDescription>
              Atur tingkat kepentingan tiap kriteria aktif untuk melihat bobot
              simulasi (<span className="font-mono">Wₖˢⁱᵐ%</span>) secara
              langsung.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReset}
            disabled={!isSimulating}
            className="gap-1.5"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Reset to Group Consensus
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {activeCriteria.map((criterion) => {
          const sliderValue = sliderValues[criterion.id] ?? DEFAULT_SLIDER_SCORE;
          const activeWeight = simulatedWeightById.get(criterion.id);
          const groupWeight = groupWeightById.get(criterion.id);
          const livePct = activeWeight?.percentage ?? 0;
          const groupPct = groupWeight?.percentage ?? 0;

          return (
            <div
              key={criterion.id}
              className="space-y-2 rounded-lg border border-border bg-muted/20 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="font-mono text-[11px]">
                      {criterion.code}
                    </Badge>
                    <span className="truncate text-sm font-medium text-foreground">
                      {criterion.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge
                      variant="outline"
                      className={
                        criterion.type === "cost"
                          ? "border-rose-200 bg-rose-500/10 text-rose-700 dark:border-rose-500/30 dark:text-rose-300"
                          : "border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300"
                      }
                    >
                      {criterion.type === "cost" ? "Cost" : "Benefit"}
                    </Badge>
                    <span className="text-muted-foreground">
                      {isSimulating
                        ? `Skala ${sliderValue}/5 (${SLIDER_SCALE_LABELS[sliderValue] ?? ""})`
                        : "Menggunakan bobot konsensus"}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="font-mono text-sm font-semibold text-foreground tabular-nums">
                    {formatPct(livePct)}
                  </div>
                  {isSimulating ? (
                    <div className="font-mono text-[11px] text-muted-foreground tabular-nums">
                      Grup: {formatPct(groupPct)}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <span className="w-3 text-center font-mono text-xs text-muted-foreground">
                  {SLIDER_MIN_SCORE}
                </span>
                <Slider
                  min={SLIDER_MIN_SCORE}
                  max={SLIDER_MAX_SCORE}
                  step={1}
                  value={[sliderValue]}
                  aria-label={`Bobot prioritas ${criterion.code} ${criterion.name}`}
                  onValueChange={(nextValue) => {
                    const scalar = Array.isArray(nextValue)
                      ? nextValue[0]
                      : nextValue;
                    if (typeof scalar === "number") {
                      onSliderChange(criterion.id, scalar);
                    }
                  }}
                />
                <span className="w-3 text-center font-mono text-xs text-muted-foreground">
                  {SLIDER_MAX_SCORE}
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function RadarComparisonCard({
  baseResult,
  selectedAlternativeIds,
  minSelectable,
  radarData,
  isClient,
  isDefaultSelection,
  onToggleAlternative,
  onResetSelection,
}: {
  baseResult: GadaOutput;
  selectedAlternativeIds: readonly string[];
  minSelectable: number;
  radarData: readonly RadarChartDatum[];
  isClient: boolean;
  isDefaultSelection: boolean;
  onToggleAlternative: (alternativeId: string) => void;
  onResetSelection: () => void;
}) {
  const selectedRankings = useMemo(() => {
    const byId = new Map(
      baseResult.rankings.map((row) => [row.alternativeId, row])
    );
    return selectedAlternativeIds
      .map((id, idx) => {
        const row = byId.get(id);
        const style = RADAR_SERIES_STYLES[idx % RADAR_SERIES_STYLES.length];
        if (!row || !style) {
          return null;
        }
        return {
          row,
          style,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [baseResult.rankings, selectedAlternativeIds]);

  return (
    <Card className="h-full">
      <CardHeader className="gap-3 border-b pb-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <RadarIcon className="size-4 text-primary" aria-hidden="true" />
              Perbandingan Profil Radar (Skala 0–{RADAR_MAX_SCALE})
            </CardTitle>
            <CardDescription>
              Pilih {minSelectable}–{MAX_RADAR_SELECTION} alternatif untuk
              membandingkan profil performa ternormalisasi di seluruh kriteria
              aktif.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {selectedAlternativeIds.length}/{MAX_RADAR_SELECTION} dipilih
            </Badge>
            {!isDefaultSelection ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onResetSelection}
              >
                Top 3 Default
              </Button>
            ) : null}
          </div>
        </div>

        <div
          aria-label="Pilih alternatif untuk grafik radar"
          className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto pt-1 pr-1"
        >
          {baseResult.rankings.map((row) => {
            const selectedIdx = selectedAlternativeIds.indexOf(
              row.alternativeId
            );
            const isSelected = selectedIdx !== -1;
            const style = isSelected
              ? RADAR_SERIES_STYLES[selectedIdx % RADAR_SERIES_STYLES.length]
              : undefined;
            const disableButton = isSelected
              ? selectedAlternativeIds.length <= minSelectable
              : selectedAlternativeIds.length >= MAX_RADAR_SELECTION;

            return (
              <Button
                key={row.alternativeId}
                type="button"
                variant={isSelected ? "outline" : "ghost"}
                size="xs"
                disabled={disableButton}
                aria-pressed={isSelected}
                onClick={() => onToggleAlternative(row.alternativeId)}
                className={
                  isSelected && style
                    ? `gap-1.5 border ${style.pillClass}`
                    : "gap-1.5 border border-border/70 text-muted-foreground"
                }
              >
                {isSelected && style ? (
                  <span className={`size-2 rounded-full ${style.dotClass}`} />
                ) : null}
                <span className="font-mono text-[11px]">#{row.rank}</span>
                <span className="max-w-32 truncate">{row.name}</span>
                {isSelected ? (
                  <Check className="size-3" aria-hidden="true" />
                ) : null}
              </Button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {isClient ? (
          <div className="h-[360px] w-full min-w-0">
            <ResponsiveContainer width="100%" height={RADAR_CHART_HEIGHT}>
              <RadarChart
                data={[...radarData]}
                cx="50%"
                cy="50%"
                outerRadius="74%"
              >
                <PolarGrid className="stroke-border" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fontSize: 11 }}
                  className="fill-foreground"
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, RADAR_MAX_SCALE]}
                  tickCount={6}
                  tick={{ fontSize: 10 }}
                  className="fill-muted-foreground"
                />
                <Tooltip content={<RadarCriterionTooltip />} />
                {selectedRankings.map(({ row, style }) => (
                  <Radar
                    key={row.alternativeId}
                    name={`#${row.rank} ${row.name}`}
                    dataKey={row.alternativeId}
                    stroke={style.stroke}
                    fill={style.fill}
                    fillOpacity={0.18}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          radarChartSkeleton
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs">
          {selectedRankings.map(({ row, style }) => (
            <span
              key={row.alternativeId}
              className="flex items-center gap-1.5 text-foreground"
            >
              <span className={`size-2.5 rounded-sm ${style.dotClass}`} />
              <span className="font-medium">
                #{row.rank} {row.name}
              </span>
            </span>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <p className="mb-2 text-xs font-medium text-foreground">
            Keterangan Sumbu Kriteria (Skor 100 = Performa Terbaik per Kriteria)
          </p>
          <div className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
            {baseResult.activeCriteria.map((criterion) => (
              <div key={criterion.id} className="flex items-center gap-1.5">
                <span className="font-mono font-semibold text-foreground">
                  {criterion.code}
                </span>
                <span className="truncate">{criterion.name}</span>
                <span className="text-[11px] uppercase opacity-75">
                  ({criterion.type})
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface RadarTooltipPayloadItem {
  name?: string;
  value?: number;
  color?: string;
  payload?: RadarChartDatum;
}

function RadarCriterionTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<RadarTooltipPayloadItem>;
}) {
  const datum = payload?.[0]?.payload;
  if (!active || !datum || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <div className="font-semibold">
        [{datum.criterionCode}] {datum.criterionName}
      </div>
      <div className="mb-1.5 text-[11px] text-muted-foreground">
        Tipe:{" "}
        {datum.criterionType === "cost"
          ? "Cost (Semakin murah semakin tinggi skor)"
          : "Benefit (Semakin besar semakin tinggi skor)"}
      </div>
      <div className="space-y-1">
        {payload.map((entry, idx) => (
          <div
            key={`${entry.name ?? "series"}-${idx}`}
            className="flex items-center justify-between gap-4"
          >
            <span className="flex items-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: entry.color ?? "var(--primary)" }}
              />
              <span>{entry.name}</span>
            </span>
            <span className="font-mono font-semibold tabular-nums">
              {typeof entry.value === "number"
                ? entry.value.toFixed(RADAR_SCORE_DECIMALS)
                : "0.0"}{" "}
              / {RADAR_MAX_SCALE}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimulationComparisonTableCard({
  rows,
  addressByAltId,
  isSimulating,
}: {
  rows: readonly SimulationComparisonRow[];
  addressByAltId: ReadonlyMap<string, string>;
  isSimulating: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRows = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (normalized === "") {
      return rows;
    }
    return rows.filter((row) => {
      const address = addressByAltId.get(row.alternativeId) ?? "";
      return (
        row.name.toLowerCase().includes(normalized) ||
        address.toLowerCase().includes(normalized)
      );
    });
  }, [rows, addressByAltId, searchQuery]);

  return (
    <Card>
      <CardHeader className="gap-4 border-b pb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-primary" aria-hidden="true" />
              Perbandingan Peringkat: Konsensus Grup vs. Simulasi Personal
            </CardTitle>
            <CardDescription>
              {isSimulating
                ? `Menampilkan ${filteredRows.length} dari ${rows.length} alternatif terurut berdasarkan Peringkat Personal.`
                : `Mode Konsensus Kelompok aktif — seluruh ΔRank bernilai 0 hingga slider diubah.`}
            </CardDescription>
          </div>

          <div className="relative w-full sm:w-64">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari nama alternatif..."
              aria-label="Cari nama alternatif pada tabel simulasi"
              className="pl-8"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Rank Personal</TableHead>
              <TableHead className="w-24">Rank Grup</TableHead>
              <TableHead className="w-28 text-center">ΔRank</TableHead>
              <TableHead>Nama Alternatif</TableHead>
              <TableHead className="text-right">Skor Grup (R̂ⱼ)</TableHead>
              <TableHead className="text-right">Skor Personal (R̂ⱼ)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Tidak ada alternatif yang cocok dengan pencarian saat ini.
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((row) => {
                const address = addressByAltId.get(row.alternativeId);
                return (
                  <TableRow
                    key={row.alternativeId}
                    className={
                      row.personalRank <= RECOMMENDATION_TIER_CUTOFFS.TOP_MAX_RANK
                        ? "bg-muted/30"
                        : undefined
                    }
                  >
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getRankBadgeClass(row.personalRank)}
                      >
                        #{row.personalRank}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        #{row.groupRank}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <RankDeltaBadge rankDelta={row.rankDelta} />
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <div className="font-medium text-foreground">
                        {row.name}
                      </div>
                      {address ? (
                        <div className="text-xs text-muted-foreground">
                          {address}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                      {formatScore(row.groupScore)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-foreground tabular-nums">
                      {formatScore(row.personalScore)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function RankDeltaBadge({ rankDelta }: { rankDelta: number }) {
  if (rankDelta > 0) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-emerald-200 bg-emerald-500/15 font-mono text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300"
      >
        <ArrowUp className="size-3" aria-hidden="true" />+{rankDelta}
      </Badge>
    );
  }

  if (rankDelta < 0) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-rose-200 bg-rose-500/15 font-mono text-rose-700 dark:border-rose-500/30 dark:text-rose-300"
      >
        <ArrowDown className="size-3" aria-hidden="true" />
        {rankDelta}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="gap-1 border-border bg-muted/50 font-mono text-muted-foreground"
    >
      <Minus className="size-3" aria-hidden="true" />0
    </Badge>
  );
}

function getRankBadgeClass(rank: number): string {
  if (rank === 1) {
    return "border-amber-300 bg-amber-500/20 text-amber-800 dark:border-amber-500/40 dark:text-amber-200 font-semibold";
  }
  if (rank === 2) {
    return "border-slate-300 bg-slate-500/15 text-slate-700 dark:border-slate-500/40 dark:text-slate-200 font-semibold";
  }
  if (rank === 3) {
    return "border-orange-300 bg-orange-500/15 text-orange-800 dark:border-orange-500/40 dark:text-orange-200 font-semibold";
  }
  return "border-border bg-muted/60 text-muted-foreground font-medium";
}

function formatScore(value: number): string {
  return value.toFixed(SCORE_DECIMALS);
}

function formatPct(value: number): string {
  return `${value.toFixed(WEIGHT_PCT_DECIMALS)}%`;
}
