"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  Award,
  BarChart3,
  CheckCircle2,
  Filter,
  Layers,
  Search,
  SlidersHorizontal,
  Trophy,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
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
import {
  CONSISTENCY_THRESHOLDS,
  PERCENTAGE_SCALE,
  RECOMMENDATION_TIER_CUTOFFS,
  RECOMMENDATION_TIER_LABELS,
} from "@/lib/gada/constants";
import type {
  AlternativeRankingResult,
  CriterionWeightResult,
  GadaInput,
  GadaOutput,
  RecommendationTier,
} from "@/lib/gada/types";

export interface ResultsViewProps {
  output: GadaOutput;
  input: GadaInput;
}

type TierFilterValue = "Semua" | RecommendationTier;

const TIER_FILTER_OPTIONS: readonly TierFilterValue[] = [
  "Semua",
  RECOMMENDATION_TIER_LABELS.TOP,
  RECOMMENDATION_TIER_LABELS.RECOMMENDED,
  RECOMMENDATION_TIER_LABELS.LOW,
];

const TOP_ALTERNATIVES_LIMIT = 10;
const SCORE_DECIMALS = 6;
const WEIGHT_DECIMALS = 4;
const WEIGHT_PCT_DECIMALS = 2;

const subscribeNoop = (): (() => void) => () => {};

function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
}

function getTierBadgeClass(tier: RecommendationTier): string {
  if (tier === RECOMMENDATION_TIER_LABELS.TOP) {
    return "border-emerald-200 bg-emerald-500/15 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300";
  }
  if (tier === RECOMMENDATION_TIER_LABELS.RECOMMENDED) {
    return "border-sky-200 bg-sky-500/15 text-sky-700 dark:border-sky-500/30 dark:text-sky-300";
  }
  return "border-amber-200 bg-amber-500/15 text-amber-700 dark:border-amber-500/30 dark:text-amber-300";
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

function formatWeight(value: number): string {
  return value.toFixed(WEIGHT_DECIMALS);
}

function formatPct(value: number): string {
  return `${value.toFixed(WEIGHT_PCT_DECIMALS)}%`;
}

function truncateLabel(label: string, maxLength = 22): string {
  if (label.length <= maxLength) {
    return label;
  }
  return `${label.slice(0, maxLength - 1)}…`;
}

interface TopAlternativeTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: AlternativeRankingResult }>;
}

function TopAlternativeTooltip({ active, payload }: TopAlternativeTooltipProps) {
  const item = payload?.[0]?.payload;
  if (!active || !item) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <div className="font-semibold">
        #{item.rank} — {item.name}
      </div>
      <div className="mt-1 space-y-0.5 text-muted-foreground">
        <div>
          Skor Akhir (<span className="font-mono">R̂ⱼ</span>):{" "}
          <span className="font-mono font-medium text-foreground tabular-nums">
            {formatScore(item.relativeScore)}
          </span>
        </div>
        <div>
          Indeks GADA (<span className="font-mono">r̂ⱼ</span>):{" "}
          <span className="font-mono font-medium text-foreground tabular-nums">
            {formatScore(item.gadaIndex)}
          </span>
        </div>
      </div>
    </div>
  );
}

interface CriterionWeightTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: CriterionWeightResult }>;
}

function CriterionWeightTooltip({ active, payload }: CriterionWeightTooltipProps) {
  const item = payload?.[0]?.payload;
  if (!active || !item) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <div className="font-semibold">
        [{item.code}] {item.name}
      </div>
      <div className="mt-1 space-y-0.5 text-muted-foreground">
        <div>
          Tipe:{" "}
          <span className="font-medium text-foreground">
            {item.type === "cost" ? "Cost (Lebih kecil lebih baik)" : "Benefit (Lebih besar lebih baik)"}
          </span>
        </div>
        <div>
          Persentase (<span className="font-mono">Wₖ%</span>):{" "}
          <span className="font-mono font-medium text-foreground tabular-nums">
            {formatPct(item.percentage)}
          </span>
        </div>
        <div>
          Bobot Ternormalisasi (<span className="font-mono">Wₖ</span>):{" "}
          <span className="font-mono font-medium text-foreground tabular-nums">
            {formatWeight(item.normalizedWeight)}
          </span>
        </div>
      </div>
    </div>
  );
}

const chartSkeleton = (
  <div className="h-[340px] w-full animate-pulse rounded-lg bg-muted/50" />
);

export function ResultsView({ output, input }: ResultsViewProps) {
  const isClient = useIsClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<TierFilterValue>("Semua");

  const topAlternative = output.rankings[0];

  const tierSummary = useMemo(() => {
    let topCount = 0;
    let recommendedCount = 0;
    let lowCount = 0;

    for (const row of output.rankings) {
      if (row.tier === RECOMMENDATION_TIER_LABELS.TOP) {
        topCount += 1;
      } else if (row.tier === RECOMMENDATION_TIER_LABELS.RECOMMENDED) {
        recommendedCount += 1;
      } else {
        lowCount += 1;
      }
    }

    return { topCount, recommendedCount, lowCount };
  }, [output.rankings]);

  const criteriaSummary = useMemo(() => {
    let costCount = 0;
    let benefitCount = 0;

    for (const criterion of output.activeCriteria) {
      if (criterion.type === "cost") {
        costCount += 1;
      } else {
        benefitCount += 1;
      }
    }

    const zeroVarianceDropped = output.excludedCriteria.filter(
      (item) => item.reason === "zero_variance"
    );

    return { costCount, benefitCount, zeroVarianceDropped };
  }, [output.activeCriteria, output.excludedCriteria]);

  const consistencySummary = useMemo(() => {
    const total = output.respondentConsistency.length;
    if (total === 0) {
      return null;
    }

    let highCount = 0;
    let moderateCount = 0;
    let lowCount = 0;
    let sqrtAlphaSum = 0;

    for (const item of output.respondentConsistency) {
      sqrtAlphaSum += item.sqrtAlpha;
      if (item.status === "high") {
        highCount += 1;
      } else if (item.status === "moderate") {
        moderateCount += 1;
      } else {
        lowCount += 1;
      }
    }

    return {
      total,
      highCount,
      highPct: (highCount / total) * PERCENTAGE_SCALE,
      moderateCount,
      moderatePct: (moderateCount / total) * PERCENTAGE_SCALE,
      lowCount,
      lowPct: (lowCount / total) * PERCENTAGE_SCALE,
      avgSqrtAlpha: sqrtAlphaSum / total,
    };
  }, [output.respondentConsistency]);

  const topTenChartData = useMemo(
    () => output.rankings.slice(0, TOP_ALTERNATIVES_LIMIT),
    [output.rankings]
  );

  const sortedWeightsChartData = useMemo(
    () =>
      [...output.criteriaWeights].sort(
        (a, b) => b.normalizedWeight - a.normalizedWeight || a.rank - b.rank
      ),
    [output.criteriaWeights]
  );

  const filteredRankings = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return output.rankings.filter((row) => {
      if (tierFilter !== "Semua" && row.tier !== tierFilter) {
        return false;
      }
      if (normalizedSearch.length === 0) {
        return true;
      }
      const matchesName = row.name.toLowerCase().includes(normalizedSearch);
      const matchesAddress = row.address
        ? row.address.toLowerCase().includes(normalizedSearch)
        : false;
      return matchesName || matchesAddress;
    });
  }, [output.rankings, searchQuery, tierFilter]);

  const handleTierFilterChange = (value: string | null) => {
    if (
      value === "Semua" ||
      value === RECOMMENDATION_TIER_LABELS.TOP ||
      value === RECOMMENDATION_TIER_LABELS.RECOMMENDED ||
      value === RECOMMENDATION_TIER_LABELS.LOW
    ) {
      setTierFilter(value);
    }
  };

  return (
    <div className="space-y-6">
      {/* 4 KPI Summary Cards */}
      <section
        aria-label="Ringkasan KPI Hasil GADA"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {/* KPI 1: Alternatif Terbaik (Rank #1) */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardDescription className="font-medium">
                Alternatif Terbaik (Rank #1)
              </CardDescription>
              <Trophy className="size-4 text-amber-500" aria-hidden="true" />
            </div>
            <CardTitle className="line-clamp-1 text-lg font-semibold">
              {topAlternative ? topAlternative.name : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-muted-foreground">Skor Akhir (R̂₁)</span>
              <span className="font-mono text-xl font-bold tracking-tight tabular-nums">
                {topAlternative ? formatScore(topAlternative.relativeScore) : "—"}
              </span>
            </div>
            {topAlternative ? (
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="truncate">
                  {topAlternative.address ?? input.datasetName ?? "Teratas"}
                </span>
                <Badge
                  variant="outline"
                  className={getTierBadgeClass(topAlternative.tier)}
                >
                  {topAlternative.tier}
                </Badge>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* KPI 2: Total Alternatif */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardDescription className="font-medium">
                Total Alternatif
              </CardDescription>
              <Award className="size-4 text-primary" aria-hidden="true" />
            </div>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {output.rankings.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Sangat Direkomendasikan</span>
              <span className="font-mono font-medium text-foreground tabular-nums">
                {tierSummary.topCount}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Direkomendasikan / Kurang</span>
              <span className="font-mono font-medium text-foreground tabular-nums">
                {tierSummary.recommendedCount} / {tierSummary.lowCount}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Kriteria Aktif */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardDescription className="font-medium">
                Kriteria Aktif
              </CardDescription>
              <Layers className="size-4 text-chart-1" aria-hidden="true" />
            </div>
            <CardTitle className="text-2xl font-bold tabular-nums">
              {output.activeCriteria.length}
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                dari {input.criteria.length} kriteria
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-rose-200 bg-rose-500/10 text-rose-700 dark:border-rose-500/30 dark:text-rose-300">
                {criteriaSummary.costCount} Cost
              </Badge>
              <Badge variant="outline" className="border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300">
                {criteriaSummary.benefitCount} Benefit
              </Badge>
            </div>
            {criteriaSummary.zeroVarianceDropped.length > 0 ? (
              <p className="leading-snug text-muted-foreground">
                <span className="font-medium text-foreground">
                  {criteriaSummary.zeroVarianceDropped.length} dieliminasi otomatis
                </span>{" "}
                (varians nol:{" "}
                {criteriaSummary.zeroVarianceDropped.map((c) => c.name).join(", ")})
              </p>
            ) : (
              <p className="leading-snug text-muted-foreground">
                Semua kriteria aktif memiliki varians valid.
              </p>
            )}
          </CardContent>
        </Card>

        {/* KPI 4: Konsistensi Kelompok */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardDescription className="font-medium">
                {consistencySummary
                  ? `Konsistensi Kelompok (${consistencySummary.total} Responden)`
                  : "Konsistensi Kelompok"}
              </CardDescription>
              <Users className="size-4 text-chart-2" aria-hidden="true" />
            </div>
            <CardTitle className="text-xl font-bold tabular-nums">
              {consistencySummary ? (
                <>
                  √ᾱ = {formatWeight(consistencySummary.avgSqrtAlpha)}
                </>
              ) : (
                "Mode Override Bobot"
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-muted-foreground">
            {consistencySummary ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    Konsisten (α ≥ {CONSISTENCY_THRESHOLDS.HIGH_MIN_ALPHA})
                  </span>
                  <span className="font-mono font-medium text-foreground tabular-nums">
                    {consistencySummary.highCount} ({consistencySummary.highPct.toFixed(0)}%)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-amber-500" />
                    Moderat ({CONSISTENCY_THRESHOLDS.MODERATE_MIN_ALPHA}–{CONSISTENCY_THRESHOLDS.HIGH_MIN_ALPHA})
                  </span>
                  <span className="font-mono font-medium text-foreground tabular-nums">
                    {consistencySummary.moderateCount} ({consistencySummary.moderatePct.toFixed(0)}%)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-rose-500" />
                    Tidak Konsisten (&lt; {CONSISTENCY_THRESHOLDS.MODERATE_MIN_ALPHA})
                  </span>
                  <span className="font-mono font-medium text-foreground tabular-nums">
                    {consistencySummary.lowCount} ({consistencySummary.lowPct.toFixed(0)}%)
                  </span>
                </div>
              </>
            ) : (
              <p className="leading-snug">
                Bobot kriteria menggunakan preferensi personal aktif sehingga evaluasi AGRPC responden dilewati.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Data Visualizations (Recharts) */}
      <section
        aria-label="Visualisasi Skor dan Bobot GADA"
        className="grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        {/* Top 10 Alternatives Horizontal Bar Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="size-4 text-primary" aria-hidden="true" />
                  Top {Math.min(TOP_ALTERNATIVES_LIMIT, output.rankings.length)} Alternatif Terbaik
                </CardTitle>
                <CardDescription>
                  Perbandingan Skor Relatif Akhir (R̂ⱼ) hasil agregasi geometrik GADA
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                Skor R̂ⱼ
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isClient ? (
              <div className="h-[340px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topTenChartData}
                    layout="vertical"
                    margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                    <XAxis
                      type="number"
                      tickFormatter={(val: number) => val.toFixed(3)}
                      tick={{ fontSize: 11 }}
                      className="fill-muted-foreground"
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={145}
                      tickFormatter={(val: string) => truncateLabel(val, 20)}
                      tick={{ fontSize: 11 }}
                      className="fill-foreground"
                    />
                    <Tooltip
                      cursor={{ fill: "var(--muted)", opacity: 0.45 }}
                      content={<TopAlternativeTooltip />}
                    />
                    <Bar dataKey="relativeScore" radius={[0, 6, 6, 0]} maxBarSize={24}>
                      {topTenChartData.map((entry) => (
                        <Cell
                          key={entry.alternativeId}
                          fill={
                            entry.rank <= RECOMMENDATION_TIER_CUTOFFS.TOP_MAX_RANK
                              ? "var(--chart-2)"
                              : "var(--chart-1)"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              chartSkeleton
            )}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-(--chart-2)" />
                Top 3 ({RECOMMENDATION_TIER_LABELS.TOP})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-(--chart-1)" />
                Peringkat 4–10
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Active Criterion Consensus Weights Horizontal Bar Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <SlidersHorizontal className="size-4 text-primary" aria-hidden="true" />
                  Bobot Konsensus Kriteria Aktif (Wₖ)
                </CardTitle>
                <CardDescription>
                  Prioritas kriteria terurut menurun dalam persentase (%) dan bobot ternormalisasi
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                Total 100.00%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isClient ? (
              <div className="h-[340px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sortedWeightsChartData}
                    layout="vertical"
                    margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                    <XAxis
                      type="number"
                      tickFormatter={(val: number) => `${val.toFixed(1)}%`}
                      tick={{ fontSize: 11 }}
                      className="fill-muted-foreground"
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={150}
                      tickFormatter={(val: string) => truncateLabel(val, 21)}
                      tick={{ fontSize: 11 }}
                      className="fill-foreground"
                    />
                    <Tooltip
                      cursor={{ fill: "var(--muted)", opacity: 0.45 }}
                      content={<CriterionWeightTooltip />}
                    />
                    <Bar dataKey="percentage" radius={[0, 6, 6, 0]} maxBarSize={24}>
                      {sortedWeightsChartData.map((entry) => (
                        <Cell
                          key={entry.criterionId}
                          fill={
                            entry.type === "cost" ? "var(--chart-4)" : "var(--chart-2)"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              chartSkeleton
            )}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-(--chart-2)" />
                Benefit (Lebih besar lebih baik)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-(--chart-4)" />
                Cost (Lebih kecil lebih baik)
              </span>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Main Ranking Table */}
      <Card>
        <CardHeader className="gap-4 border-b pb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
                Tabel Peringkat Alternatif GADA
              </CardTitle>
              <CardDescription>
                Menampilkan {filteredRankings.length} dari {output.rankings.length} alternatif terurut berdasarkan skor akhir R̂ⱼ
              </CardDescription>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
                  aria-label="Cari nama alternatif"
                  className="pl-8"
                />
              </div>

              <Select value={tierFilter} onValueChange={handleTierFilterChange}>
                <SelectTrigger className="w-full sm:w-56" aria-label="Filter tier rekomendasi">
                  <Filter className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  <SelectValue placeholder="Filter Tier" />
                </SelectTrigger>
                <SelectContent align="end">
                  {TIER_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Peringkat</TableHead>
                <TableHead>Nama Alternatif</TableHead>
                <TableHead className="text-right">Indeks GADA (r̂ⱼ)</TableHead>
                <TableHead className="text-right">Skor Akhir GADA (R̂ⱼ)</TableHead>
                <TableHead className="text-right">Tier Rekomendasi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRankings.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Tidak ada alternatif yang cocok dengan filter pencarian saat ini.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRankings.map((row) => {
                  const isTopThree = row.rank <= RECOMMENDATION_TIER_CUTOFFS.TOP_MAX_RANK;
                  return (
                    <TableRow
                      key={row.alternativeId}
                      className={isTopThree ? "bg-muted/30" : undefined}
                    >
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getRankBadgeClass(row.rank)}
                        >
                          #{row.rank}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <div className="font-medium text-foreground">
                          {row.name}
                        </div>
                        {row.address ? (
                          <div className="text-xs text-muted-foreground">
                            {row.address}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                        {formatScore(row.gadaIndex)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-foreground tabular-nums">
                        {formatScore(row.relativeScore)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={getTierBadgeClass(row.tier)}
                        >
                          {row.tier}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
