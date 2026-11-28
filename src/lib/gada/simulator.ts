import {
  DEFAULT_SLIDER_SCORE,
  PERCENTAGE_SCALE,
  RADAR_MAX_SCALE,
} from "./constants";
import { runGadaAnalysis } from "./engine";
import type {
  AlternativeRankingResult,
  CriterionConfig,
  CriterionType,
  CriterionWeightResult,
  GadaInput,
  GadaOutput,
  SimulationComparisonRow,
} from "./types";

export interface RadarChartDatum {
  criterionId: string;
  criterionCode: string;
  criterionName: string;
  criterionType: CriterionType;
  subject: string;
  [key: string]: string | number;
}

/**
 * Computes normalized personal criterion weights from 1–5 slider scores
 * without running the respondent AGRPC aggregation step.
 */
export function computeSimulatedWeights(
  activeCriteria: readonly CriterionConfig[],
  overrideWeights: Record<string, number>
): CriterionWeightResult[] {
  if (activeCriteria.length === 0) {
    return [];
  }

  const rawScores = activeCriteria.map((criterion) => {
    const provided = overrideWeights[criterion.id];
    const score = provided === undefined ? DEFAULT_SLIDER_SCORE : provided;
    if (!Number.isFinite(score) || score <= 0) {
      throw new Error(
        `Invalid override weight (${score}) for criterion "${criterion.name}" (${criterion.code}): must be strictly > 0.`
      );
    }
    return score;
  });

  const totalScore = rawScores.reduce((acc, value) => acc + value, 0);
  const normalizedWeights = rawScores.map((score) => score / totalScore);

  const indexed = normalizedWeights.map((weight, index) => ({ index, weight }));
  indexed.sort((a, b) => b.weight - a.weight || a.index - b.index);

  const rankByIndex = new Array<number>(activeCriteria.length).fill(0);
  indexed.forEach((entry, sortedPos) => {
    rankByIndex[entry.index] = sortedPos + 1;
  });

  return activeCriteria.map((criterion, index) => {
    const normalizedWeight = normalizedWeights[index] ?? 0;
    return {
      criterionId: criterion.id,
      code: criterion.code,
      name: criterion.name,
      type: criterion.type,
      simulatedDelta: normalizedWeight,
      normalizedWeight,
      percentage: normalizedWeight * PERCENTAGE_SCALE,
      rank: rankByIndex[index] ?? index + 1,
    };
  });
}

/**
 * Builds zero-delta comparison rows when the simulator is in Group Consensus mode.
 */
export function buildConsensusComparisonRows(
  baseResult: GadaOutput
): SimulationComparisonRow[] {
  return baseResult.rankings.map((entry) => ({
    alternativeId: entry.alternativeId,
    name: entry.name,
    groupRank: entry.rank,
    personalRank: entry.rank,
    rankDelta: 0,
    groupScore: entry.relativeScore,
    personalScore: entry.relativeScore,
  }));
}

/**
 * Runs a personal What-If GADA simulation with overrideWeights and compares
 * every alternative's personal ranking against the group consensus baseline.
 * rankDelta = groupRank - personalRank (positive means rank improved).
 */
export function compareSimulations(
  input: GadaInput,
  baseResult: GadaOutput,
  overrideWeights: Record<string, number>
): SimulationComparisonRow[] {
  const personalResult = runGadaAnalysis(input, overrideWeights);
  const baseById = new Map<string, AlternativeRankingResult>();

  for (const baseEntry of baseResult.rankings) {
    baseById.set(baseEntry.alternativeId, baseEntry);
  }

  return personalResult.rankings.map((personalEntry) => {
    const baseEntry = baseById.get(personalEntry.alternativeId);
    if (!baseEntry) {
      throw new Error(
        `Alternative "${personalEntry.name}" (${personalEntry.alternativeId}) was not found in baseline rankings.`
      );
    }

    return {
      alternativeId: personalEntry.alternativeId,
      name: personalEntry.name,
      groupRank: baseEntry.rank,
      personalRank: personalEntry.rank,
      rankDelta: baseEntry.rank - personalEntry.rank,
      groupScore: baseEntry.relativeScore,
      personalScore: personalEntry.relativeScore,
    };
  });
}

/**
 * Scales each active criterion column of reciprocatedMatrix to [0, 100]
 * relative to its column maximum across all S alternatives:
 * z_{jk} = (r_{jk} / max_p r_{pk}) * 100.
 */
export function buildRadarChartData(
  input: GadaInput,
  result: GadaOutput,
  selectedAlternativeIds: readonly string[]
): RadarChartDatum[] {
  const { activeCriteria, auditTrace } = result;
  const { reciprocatedMatrix } = auditTrace;

  if (activeCriteria.length === 0 || reciprocatedMatrix.length === 0) {
    return [];
  }

  const alternativeIndexById = new Map<string, number>();
  input.alternatives.forEach((alternative, index) => {
    alternativeIndexById.set(alternative.id, index);
  });

  const validSelectedIds: string[] = [];
  const seenIds = new Set<string>();
  for (const id of selectedAlternativeIds) {
    if (alternativeIndexById.has(id) && !seenIds.has(id)) {
      seenIds.add(id);
      validSelectedIds.push(id);
    }
  }

  return activeCriteria.map((criterion, critIdx) => {
    let columnMax = 0;
    for (let rowIdx = 0; rowIdx < reciprocatedMatrix.length; rowIdx++) {
      const cellValue = reciprocatedMatrix[rowIdx]?.[critIdx] ?? 0;
      if (cellValue > columnMax) {
        columnMax = cellValue;
      }
    }

    const datum: RadarChartDatum = {
      criterionId: criterion.id,
      criterionCode: criterion.code,
      criterionName: criterion.name,
      criterionType: criterion.type,
      subject: criterion.code || criterion.name,
    };

    for (const altId of validSelectedIds) {
      const altIndex = alternativeIndexById.get(altId);
      const rawReciprocal =
        altIndex !== undefined
          ? (reciprocatedMatrix[altIndex]?.[critIdx] ?? 0)
          : 0;
      const scaledValue =
        columnMax > 0 ? (rawReciprocal / columnMax) * RADAR_MAX_SCALE : 0;
      datum[altId] = scaledValue;
    }

    return datum;
  });
}
