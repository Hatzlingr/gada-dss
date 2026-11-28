import type {
  CriterionType,
  RespondentConsistencyResult,
} from "@/lib/gada/types";

export interface ConsistencySummary {
  total: number;
  minItem: RespondentConsistencyResult;
  maxItem: RespondentConsistencyResult;
  avgSqrtAlpha: number;
  highCount: number;
  moderateCount: number;
  lowWarningCount: number;
}

export function summarizeConsistency(
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

export function getCriterionTypeBadgeClass(type: CriterionType): string {
  return type === "cost"
    ? "border-rose-200 bg-rose-500/10 text-rose-700 dark:border-rose-500/30 dark:text-rose-300"
    : "border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300";
}
