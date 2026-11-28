"use client";

import { type ReactElement, useState, useSyncExternalStore } from "react";
import {
  BarChart3,
  CheckCircle2,
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
import { summarizeConsistency } from "@/components/gada/gada-ui";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PERCENTAGE_SCALE } from "@/lib/gada/constants";
import type {
  AlternativeRankingResult,
  CriterionWeightResult,
  GadaOutput,
} from "@/lib/gada/types";

export interface ResultsViewProps {
  result: GadaOutput;
}

const TOP_ALTERNATIVES_LIMIT = 10;
const TOP_HIGHLIGHT_COUNT = 3;
const SCORE_DECIMALS = 6;
const WEIGHT_DECIMALS = 4;
const WEIGHT_PCT_DECIMALS = 2;
const CHART_HEIGHT = 340;
const CHART_MARGIN = { top: 8, right: 24, left: 8, bottom: 8 };

const subscribeNoop = (): (() => void) => () => {};

function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
}

const chartSkeleton = (
  <div className="h-[340px] w-full animate-pulse rounded-lg bg-muted/50" />
);

export function ResultsView({ result }: ResultsViewProps) {
  const isClient = useIsClient();
  const sortedWeights = [...result.criteriaWeights].sort(
    (a, b) => b.normalizedWeight - a.normalizedWeight || a.rank - b.rank
  );
  const topTenRankings = result.rankings.slice(0, TOP_ALTERNATIVES_LIMIT);

  return (
    <div className="space-y-6">
      <SummaryStrip result={result} topCriterion={sortedWeights[0]} />

      <section
        aria-label="Visualisasi Skor dan Bobot GADA"
        className="grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <HorizontalBarChartCard
          title={`Top ${topTenRankings.length} Alternatif Terbaik`}
          description="Perbandingan Skor Relatif Akhir (R̂ⱼ) hasil agregasi geometrik GADA"
          badgeLabel="Skor R̂ⱼ"
          icon={<BarChart3 className="size-4 text-primary" aria-hidden="true" />}
          data={topTenRankings}
          getBarValue={(item) => item.relativeScore}
          getCategoryLabel={(item) => item.name}
          yAxisWidth={145}
          isClient={isClient}
          getItemKey={(item) => item.alternativeId}
          getBarFill={(item) =>
            item.rank <= TOP_HIGHLIGHT_COUNT ? "var(--chart-2)" : "var(--chart-1)"
          }
          xTickFormatter={(val) => val.toFixed(3)}
          yTickFormatter={(val) => truncateLabel(val, 20)}
          tooltipContent={<TopAlternativeTooltip />}
          legends={[
            { colorClass: "bg-(--chart-2)", label: "Top 3" },
            { colorClass: "bg-(--chart-1)", label: "Peringkat lainnya" },
          ]}
        />

        <HorizontalBarChartCard
          title="Bobot Konsensus Kriteria Aktif (Wₖ)"
          description="Prioritas kriteria terurut menurun dalam persentase (%) dan bobot ternormalisasi"
          badgeLabel="Total 100.00%"
          icon={
            <SlidersHorizontal
              className="size-4 text-primary"
              aria-hidden="true"
            />
          }
          data={sortedWeights}
          getBarValue={(item) => item.percentage}
          getCategoryLabel={(item) => item.name}
          yAxisWidth={150}
          isClient={isClient}
          getItemKey={(item) => item.criterionId}
          getBarFill={(item) =>
            item.type === "cost" ? "var(--chart-4)" : "var(--chart-2)"
          }
          xTickFormatter={(val) => `${val.toFixed(1)}%`}
          yTickFormatter={(val) => truncateLabel(val, 21)}
          tooltipContent={<CriterionWeightTooltip />}
          legends={[
            {
              colorClass: "bg-(--chart-2)",
              label: "Benefit (Lebih besar lebih baik)",
            },
            {
              colorClass: "bg-(--chart-4)",
              label: "Cost (Lebih kecil lebih baik)",
            },
          ]}
        />
      </section>

      <RankingTableSection rankings={result.rankings} />
    </div>
  );
}

function SummaryStrip({
  result,
  topCriterion,
}: {
  result: GadaOutput;
  topCriterion: CriterionWeightResult | undefined;
}) {
  const topAlternative = result.rankings[0];
  const consistency = summarizeConsistency(result.respondentConsistency);

  return (
    <section
      aria-label="Ringkasan Hasil Analisis GADA"
      className="grid grid-cols-1 gap-4 md:grid-cols-3"
    >
      <Card className="border-amber-300/70 bg-amber-500/[0.04] dark:border-amber-500/30">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardDescription className="font-medium">
              Peringkat #1 Terbaik
            </CardDescription>
            <Trophy className="size-4 text-amber-500" aria-hidden="true" />
          </div>
          <CardTitle className="line-clamp-1 text-xl font-bold">
            {topAlternative ? topAlternative.name : "—"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
          <span className="truncate">
            {topAlternative?.address ||
              `${result.rankings.length} alternatif dievaluasi`}
          </span>
          {topAlternative ? (
            <span className="font-mono text-sm font-semibold text-foreground tabular-nums">
              R̂₁ = {formatScore(topAlternative.relativeScore)}
            </span>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardDescription className="font-medium">
              Kriteria Prioritas Utama
            </CardDescription>
            <Layers className="size-4 text-chart-1" aria-hidden="true" />
          </div>
          <CardTitle className="line-clamp-1 text-xl font-bold">
            {topCriterion ? `[${topCriterion.code}] ${topCriterion.name}` : "—"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {result.activeCriteria.length} kriteria aktif
            {result.excludedCriteria.length > 0
              ? ` (${result.excludedCriteria.length} varians nol dieliminasi)`
              : ""}
          </span>
          {topCriterion ? (
            <span className="font-mono text-sm font-semibold text-foreground tabular-nums">
              {formatPct(topCriterion.percentage)}
            </span>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardDescription className="font-medium">
              Konsistensi Kelompok (AGRPC)
            </CardDescription>
            <Users className="size-4 text-chart-2" aria-hidden="true" />
          </div>
          <CardTitle className="font-mono text-xl font-bold tabular-nums">
            {consistency
              ? `√ᾱ = ${formatWeight(consistency.avgSqrtAlpha)}`
              : "—"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {consistency
              ? `${consistency.total} responden`
              : "Tidak ada data responden"}
          </span>
          {consistency ? (
            <span className="font-mono tabular-nums">
              {consistency.highCount} tinggi • {consistency.moderateCount}{" "}
              moderat
              {consistency.lowWarningCount > 0
                ? ` • ${consistency.lowWarningCount} rendah`
                : ""}
            </span>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

interface HorizontalBarChartCardProps<T extends object> {
  title: string;
  description: string;
  badgeLabel: string;
  icon: ReactElement;
  data: T[];
  getBarValue: (item: T) => number;
  getCategoryLabel: (item: T) => string;
  yAxisWidth: number;
  isClient: boolean;
  getItemKey: (item: T) => string;
  getBarFill: (item: T) => string;
  xTickFormatter: (value: number) => string;
  yTickFormatter: (value: string) => string;
  tooltipContent: ReactElement;
  legends: ReadonlyArray<{ colorClass: string; label: string }>;
}

function HorizontalBarChartCard<T extends object>({
  title,
  description,
  badgeLabel,
  icon,
  data,
  getBarValue,
  getCategoryLabel,
  yAxisWidth,
  isClient,
  getItemKey,
  getBarFill,
  xTickFormatter,
  yTickFormatter,
  tooltipContent,
  legends,
}: HorizontalBarChartCardProps<T>) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              {icon}
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {badgeLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isClient ? (
          <div className="h-[340px] w-full min-w-0">
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <BarChart data={data} layout="vertical" margin={CHART_MARGIN}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  className="stroke-border"
                />
                <XAxis
                  type="number"
                  tickFormatter={xTickFormatter}
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                />
                <YAxis
                  type="category"
                  dataKey={getCategoryLabel}
                  width={yAxisWidth}
                  tickFormatter={yTickFormatter}
                  tick={{ fontSize: 11 }}
                  className="fill-foreground"
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.45 }}
                  content={tooltipContent}
                />
                <Bar
                  dataKey={getBarValue}
                  radius={[0, 6, 6, 0]}
                  maxBarSize={24}
                  isAnimationActive={false}
                >
                  {data.map((entry) => (
                    <Cell key={getItemKey(entry)} fill={getBarFill(entry)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          chartSkeleton
        )}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {legends.map((item) => (
            <span key={item.label} className="flex items-center gap-1.5">
              <span className={`size-2.5 rounded-sm ${item.colorClass}`} />
              {item.label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RankingTableSection({
  rankings,
}: {
  rankings: readonly AlternativeRankingResult[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const filteredRankings = filterRankings(rankings, searchQuery);

  return (
    <Card>
      <CardHeader className="gap-4 border-b pb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2
                className="size-4 text-primary"
                aria-hidden="true"
              />
              Tabel Peringkat Alternatif GADA
            </CardTitle>
            <CardDescription>
              Menampilkan {filteredRankings.length} dari {rankings.length}{" "}
              alternatif terurut berdasarkan skor relatif R̂ⱼ
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
              aria-label="Cari nama alternatif"
              className="pl-8"
            />
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
              <TableHead className="text-right">Skor Relatif (R̂ⱼ)</TableHead>
              <TableHead className="text-right">Persentase</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRankings.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Tidak ada alternatif yang cocok dengan pencarian saat ini.
                </TableCell>
              </TableRow>
            ) : (
              filteredRankings.map((row) => (
                <TableRow
                  key={row.alternativeId}
                  className={
                    row.rank <= TOP_HIGHLIGHT_COUNT ? "bg-muted/30" : undefined
                  }
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
                    <div className="font-medium text-foreground">{row.name}</div>
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
                  <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                    {formatPct(row.relativeScore * PERCENTAGE_SCALE)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

interface TooltipProps<T> {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: T }>;
}

function TopAlternativeTooltip({
  active,
  payload,
}: TooltipProps<AlternativeRankingResult>) {
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
          Skor Relatif (<span className="font-mono">R̂ⱼ</span>):{" "}
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

function CriterionWeightTooltip({
  active,
  payload,
}: TooltipProps<CriterionWeightResult>) {
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
            {item.type === "cost"
              ? "Cost (Lebih kecil lebih baik)"
              : "Benefit (Lebih besar lebih baik)"}
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

function filterRankings(
  rankings: readonly AlternativeRankingResult[],
  searchQuery: string
): AlternativeRankingResult[] {
  const normalizedSearch = searchQuery.trim().toLowerCase();
  if (normalizedSearch.length === 0) {
    return [...rankings];
  }

  return rankings.filter((row) => {
    const matchesName = row.name.toLowerCase().includes(normalizedSearch);
    const matchesAddress = row.address
      ? row.address.toLowerCase().includes(normalizedSearch)
      : false;
    return matchesName || matchesAddress;
  });
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
