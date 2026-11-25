import {
  BINARY_FALSE_WORDS,
  BINARY_TRUE_WORDS,
  CONSISTENCY_THRESHOLDS,
  DEFAULT_GADA_OPTIONS,
  DEFAULT_SLIDER_SCORE,
  HOURS_PER_DAY,
  METERS_PER_KILOMETER,
  MIN_ACTIVE_CRITERIA,
  MIN_ALTERNATIVES,
  MIN_RESPONDENTS,
  MINUTES_PER_HOUR,
  MISSING_VALUE_MARKERS,
  NUMERIC_EPSILON,
  PERCENTAGE_SCALE,
  RECOMMENDATION_TIER_CUTOFFS,
  RECOMMENDATION_TIER_LABELS,
} from "./constants";
import type {
  AlternativeItem,
  AlternativeRankingResult,
  ConsistencyStatus,
  CriterionConfig,
  CriterionWeightResult,
  ExcludedCriterion,
  GadaInput,
  GadaOptions,
  GadaOutput,
  ImputationLog,
  ImputationStrategy,
  RawCellValue,
  RecommendationTier,
  RespondentConsistencyResult,
  RespondentItem,
} from "./types";

const TIME_RANGE_REGEX = /^(\d{1,2})[.:](\d{2})\s*[-–—]\s*(\d{1,2})[.:](\d{2})$/;
const DISTANCE_UNIT_REGEX = /^([+-]?\d+(?:[.,]\d+)?)\s*(km|m)$/i;
const CURRENCY_PREFIX_REGEX = /^(?:rp|idr|\$)\s*/i;
const NUMBER_WITH_UNIT_REGEX = /^([+-]?[\d.,]+)(?:\s+[a-zA-Z/%]+(?:\s+[a-zA-Z/%]+)*)?$/;
const ID_THOUSAND_DOTS_REGEX = /^[+-]?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/;
const US_THOUSAND_COMMAS_REGEX = /^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/;
const SINGLE_COMMA_DECIMAL_REGEX = /^[+-]?\d+,\d+$/;

function parseTimeRangeDuration(text: string): number | null {
  const match = TIME_RANGE_REGEX.exec(text);
  if (!match) {
    return null;
  }

  const startHour = Number(match[1]);
  const startMin = Number(match[2]);
  const endHour = Number(match[3]);
  const endMin = Number(match[4]);

  const invalidTime =
    startHour > HOURS_PER_DAY ||
    endHour > HOURS_PER_DAY ||
    startMin >= MINUTES_PER_HOUR ||
    endMin >= MINUTES_PER_HOUR;

  if (invalidTime) {
    throw new Error(`Invalid time range format: "${text}"`);
  }

  const startTotalHours = startHour + startMin / MINUTES_PER_HOUR;
  const endTotalHours = endHour + endMin / MINUTES_PER_HOUR;
  const rawDuration = endTotalHours - startTotalHours;

  return rawDuration <= 0 ? rawDuration + HOURS_PER_DAY : rawDuration;
}

function parseDistanceWithUnit(text: string): number | null {
  const match = DISTANCE_UNIT_REGEX.exec(text);
  if (!match || match[1] === undefined || match[2] === undefined) {
    return null;
  }

  const numericValue = Number(match[1].replace(",", "."));
  if (!Number.isFinite(numericValue)) {
    throw new Error(`Invalid distance numeric value: "${text}"`);
  }

  const unit = match[2].toLowerCase();
  return unit === "km" ? numericValue * METERS_PER_KILOMETER : numericValue;
}

function normalizeNumericToken(token: string): number {
  if (ID_THOUSAND_DOTS_REGEX.test(token)) {
    return Number(token.replaceAll(".", "").replace(",", "."));
  }
  if (US_THOUSAND_COMMAS_REGEX.test(token)) {
    return Number(token.replaceAll(",", ""));
  }
  if (SINGLE_COMMA_DECIMAL_REGEX.test(token)) {
    return Number(token.replace(",", "."));
  }
  return Number(token);
}

function parseCurrencyOrUnitNumber(text: string): number {
  const withoutCurrency = text.replace(CURRENCY_PREFIX_REGEX, "").trim();
  const match = NUMBER_WITH_UNIT_REGEX.exec(withoutCurrency);

  if (!match || match[1] === undefined) {
    throw new Error(`Unparseable cell value: "${text}"`);
  }

  const parsed = normalizeNumericToken(match[1]);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Unparseable numeric cell value: "${text}"`);
  }
  return parsed;
}

/**
 * Layer A universal cell parser: normalizes missing markers, booleans,
 * HH.MM-HH.MM time ranges, m/km distances, and currency/unit strings.
 */
export function parseRawCell(
  rawValue: RawCellValue,
  options: GadaOptions = DEFAULT_GADA_OPTIONS
): number | null {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  if (typeof rawValue === "boolean") {
    return rawValue ? options.binaryTrueValue : options.binaryFalseValue;
  }

  if (typeof rawValue === "number") {
    if (!Number.isFinite(rawValue)) {
      throw new Error(`Non-finite numeric cell value encountered: ${String(rawValue)}`);
    }
    return rawValue;
  }

  const trimmed = rawValue.trim();
  const normalized = trimmed.toLowerCase();

  if (MISSING_VALUE_MARKERS.has(normalized)) {
    return null;
  }
  if (BINARY_TRUE_WORDS.has(normalized)) {
    return options.binaryTrueValue;
  }
  if (BINARY_FALSE_WORDS.has(normalized)) {
    return options.binaryFalseValue;
  }

  const timeDuration = parseTimeRangeDuration(trimmed);
  if (timeDuration !== null) {
    return timeDuration;
  }

  const distanceMeters = parseDistanceWithUnit(trimmed);
  if (distanceMeters !== null) {
    return distanceMeters;
  }

  return parseCurrencyOrUnitNumber(trimmed);
}

function resolveImputedValue(
  criterion: CriterionConfig,
  validValues: number[]
): number {
  const strategy: ImputationStrategy = criterion.missingStrategy;

  if (strategy === "custom_penalty") {
    const penalty = criterion.customPenalty;
    if (penalty === undefined || !Number.isFinite(penalty) || penalty <= 0) {
      throw new Error(
        `Criterion "${criterion.name}" (${criterion.code}) uses "custom_penalty" imputation but has an invalid customPenalty value.`
      );
    }
    return penalty;
  }

  if (validValues.length === 0) {
    throw new Error(
      `Criterion "${criterion.name}" (${criterion.code}) has no valid non-missing values to compute "${strategy}" imputation.`
    );
  }

  if (strategy === "penalty_max") {
    return Math.max(...validValues);
  }
  if (strategy === "min_value") {
    return Math.min(...validValues);
  }

  const total = validValues.reduce((acc, value) => acc + value, 0);
  return total / validValues.length;
}

function assertStrictlyPositiveCell(
  value: number,
  alternativeName: string,
  criterion: CriterionConfig
): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(
      `Invalid value (${value}) for alternative "${alternativeName}" on criterion "${criterion.name}" (${criterion.code}): all active values must be strictly > 0.`
    );
  }
}

function isZeroVarianceColumn(values: number[]): boolean {
  if (values.length <= 1) {
    return false;
  }
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  return maxVal - minVal <= NUMERIC_EPSILON;
}

interface PreprocessedAlternatives {
  activeCriteria: CriterionConfig[];
  excludedCriteria: ExcludedCriterion[];
  imputationLogs: ImputationLog[];
  cleanedMatrix: number[][];
}

function preprocessAlternatives(
  criteria: CriterionConfig[],
  alternatives: AlternativeItem[],
  alternativeValues: Record<string, Record<string, RawCellValue>>,
  options: GadaOptions
): PreprocessedAlternatives {
  const excludedCriteria: ExcludedCriterion[] = [];
  const candidateCriteria: CriterionConfig[] = [];

  for (const criterion of criteria) {
    if (!criterion.active) {
      excludedCriteria.push({
        criterionId: criterion.id,
        code: criterion.code,
        name: criterion.name,
        reason: "inactive",
        detail: "Criterion marked inactive in configuration.",
      });
    } else {
      candidateCriteria.push(criterion);
    }
  }

  if (candidateCriteria.length < MIN_ACTIVE_CRITERIA) {
    throw new Error(
      `At least ${MIN_ACTIVE_CRITERIA} active criteria are required, found ${candidateCriteria.length}.`
    );
  }

  const imputationLogs: ImputationLog[] = [];
  const columnsByCriterion: number[][] = [];
  const activeCriteria: CriterionConfig[] = [];

  for (const criterion of candidateCriteria) {
    const parsedColumn: Array<{ raw: RawCellValue; value: number | null }> = [];
    const validValues: number[] = [];

    for (const alternative of alternatives) {
      const raw = alternativeValues[alternative.id]?.[criterion.id];
      let parsed: number | null;
      try {
        parsed = parseRawCell(raw, options);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(
          `Failed to parse value for alternative "${alternative.name}" on criterion "${criterion.name}" (${criterion.code}): ${message}`
        );
      }

      if (parsed !== null) {
        assertStrictlyPositiveCell(parsed, alternative.name, criterion);
        validValues.push(parsed);
      }
      parsedColumn.push({ raw, value: parsed });
    }

    const hasMissing = parsedColumn.some((entry) => entry.value === null);
    const imputedFillValue = hasMissing
      ? resolveImputedValue(criterion, validValues)
      : 0;

    const cleanedColumn: number[] = [];
    for (let rowIdx = 0; rowIdx < alternatives.length; rowIdx++) {
      const alternative = alternatives[rowIdx];
      const cell = parsedColumn[rowIdx];
      if (!alternative || !cell) {
        continue;
      }

      if (cell.value === null) {
        assertStrictlyPositiveCell(imputedFillValue, alternative.name, criterion);
        cleanedColumn.push(imputedFillValue);
        imputationLogs.push({
          alternativeId: alternative.id,
          alternativeName: alternative.name,
          criterionId: criterion.id,
          criterionCode: criterion.code,
          criterionName: criterion.name,
          rawValue: cell.raw,
          imputedValue: imputedFillValue,
          strategy: criterion.missingStrategy,
        });
      } else {
        cleanedColumn.push(cell.value);
      }
    }

    if (options.autoDropZeroVariance && isZeroVarianceColumn(cleanedColumn)) {
      const constantVal = cleanedColumn[0] ?? 0;
      excludedCriteria.push({
        criterionId: criterion.id,
        code: criterion.code,
        name: criterion.name,
        reason: "zero_variance",
        detail: `All ${alternatives.length} alternatives share identical value (${constantVal}).`,
      });
      continue;
    }

    activeCriteria.push(criterion);
    columnsByCriterion.push(cleanedColumn);
  }

  if (activeCriteria.length < MIN_ACTIVE_CRITERIA) {
    throw new Error(
      `At least ${MIN_ACTIVE_CRITERIA} active criteria with non-zero variance are required, found ${activeCriteria.length}.`
    );
  }

  const cleanedMatrix: number[][] = alternatives.map((_, altIndex) =>
    columnsByCriterion.map((column) => column[altIndex] ?? 0)
  );

  return {
    activeCriteria,
    excludedCriteria,
    imputationLogs,
    cleanedMatrix,
  };
}

function classifyConsistencyStatus(alpha: number): ConsistencyStatus {
  if (alpha >= CONSISTENCY_THRESHOLDS.HIGH_MIN_ALPHA) {
    return "high";
  }
  if (alpha >= CONSISTENCY_THRESHOLDS.MODERATE_MIN_ALPHA) {
    return "moderate";
  }
  return "low_warning";
}

function assignCriterionWeightRanks(
  criteria: CriterionConfig[],
  simulatedDeltas: number[],
  normalizedWeights: number[]
): CriterionWeightResult[] {
  const indexed = normalizedWeights.map((weight, index) => ({ index, weight }));
  indexed.sort((a, b) => b.weight - a.weight || a.index - b.index);

  const rankByIndex = new Array<number>(criteria.length).fill(0);
  indexed.forEach((entry, sortedPos) => {
    rankByIndex[entry.index] = sortedPos + 1;
  });

  return criteria.map((criterion, index) => {
    const normalizedWeight = normalizedWeights[index] ?? 0;
    return {
      criterionId: criterion.id,
      code: criterion.code,
      name: criterion.name,
      type: criterion.type,
      simulatedDelta: simulatedDeltas[index] ?? 0,
      normalizedWeight,
      percentage: normalizedWeight * PERCENTAGE_SCALE,
      rank: rankByIndex[index] ?? index + 1,
    };
  });
}

function computeOverrideWeights(
  activeCriteria: CriterionConfig[],
  overrideWeights: Record<string, number>
): CriterionWeightResult[] {
  const rawWeights = activeCriteria.map((criterion) => {
    const provided = overrideWeights[criterion.id];
    const score = provided === undefined ? DEFAULT_SLIDER_SCORE : provided;
    if (!Number.isFinite(score) || score <= 0) {
      throw new Error(
        `Invalid override weight (${score}) for criterion "${criterion.name}" (${criterion.code}): must be strictly > 0.`
      );
    }
    return score;
  });

  const totalWeight = rawWeights.reduce((acc, w) => acc + w, 0);
  const normalizedWeights = rawWeights.map((w) => w / totalWeight);

  return assignCriterionWeightRanks(
    activeCriteria,
    normalizedWeights,
    normalizedWeights
  );
}

interface GroupWeightComputation {
  criteriaWeights: CriterionWeightResult[];
  respondentConsistency: RespondentConsistencyResult[];
  betaMatrix: number[][];
  zeroPointMatrix: number[][];
  agrpcMatrix: number[][];
  thetaMatrix: number[][];
}

function computeBetaMatrix(
  respondents: RespondentItem[],
  activeCriteria: CriterionConfig[],
  respondentScores: Record<string, Record<string, number>>
): number[][] {
  return respondents.map((respondent) => {
    const scores = activeCriteria.map((criterion) => {
      const score = respondentScores[respondent.id]?.[criterion.id];
      if (score === undefined || !Number.isFinite(score) || score <= 0) {
        throw new Error(
          `Invalid score (${String(score)}) for respondent "${respondent.name}" on criterion "${criterion.name}" (${criterion.code}): all respondent scores must be strictly > 0.`
        );
      }
      return score;
    });

    const rowSum = scores.reduce((acc, s) => acc + s, 0);
    return scores.map((s) => s / rowSum);
  });
}

function computeZeroPointAndSignedAreas(betaMatrix: number[][]): {
  zeroPointMatrix: number[][];
  signedAreas: number[];
} {
  const zeroPointMatrix: number[][] = [];
  const signedAreas: number[] = [];

  for (const betaRow of betaMatrix) {
    const baseline = betaRow[0] ?? 0;
    const xZeroRow = betaRow.map((betaVal) => betaVal - baseline);
    zeroPointMatrix.push(xZeroRow);

    const lastIdx = xZeroRow.length - 1;
    let middleSum = 0;
    for (let k = 1; k < lastIdx; k++) {
      middleSum += xZeroRow[k] ?? 0;
    }
    const endpointTerm = 0.5 * (xZeroRow[lastIdx] ?? 0);
    signedAreas.push(middleSum + endpointTerm);
  }

  return { zeroPointMatrix, signedAreas };
}

function computeAgrpcMatrix(signedAreas: number[]): number[][] {
  const n = signedAreas.length;
  const matrix: number[][] = Array.from({ length: n }, () =>
    new Array<number>(n).fill(0)
  );

  for (let i = 0; i < n; i++) {
    const sI = signedAreas[i] ?? 0;
    const absSi = Math.abs(sI);
    for (let j = i; j < n; j++) {
      const sJ = signedAreas[j] ?? 0;
      const absSj = Math.abs(sJ);
      const numerator = 1 + absSi + absSj;
      const denominator = numerator + Math.abs(sI - sJ);
      const epsilon = numerator / denominator;

      const rowI = matrix[i];
      const rowJ = matrix[j];
      if (rowI && rowJ) {
        rowI[j] = epsilon;
        rowJ[i] = epsilon;
      }
    }
  }

  return matrix;
}

function computeGroupCriterionWeights(
  respondents: RespondentItem[],
  activeCriteria: CriterionConfig[],
  respondentScores: Record<string, Record<string, number>>
): GroupWeightComputation {
  if (respondents.length < MIN_RESPONDENTS) {
    throw new Error(
      `At least ${MIN_RESPONDENTS} respondent is required when overrideWeights is not provided.`
    );
  }

  const betaMatrix = computeBetaMatrix(
    respondents,
    activeCriteria,
    respondentScores
  );
  const { zeroPointMatrix, signedAreas } =
    computeZeroPointAndSignedAreas(betaMatrix);
  const agrpcMatrix = computeAgrpcMatrix(signedAreas);

  const respondentCount = respondents.length;
  const respondentConsistency: RespondentConsistencyResult[] = respondents.map(
    (respondent, idx) => {
      const row = agrpcMatrix[idx] ?? [];
      const alpha =
        row.reduce((acc, value) => acc + value, 0) / respondentCount;
      const sqrtAlpha = Math.sqrt(alpha);
      const signedArea = signedAreas[idx] ?? 0;

      return {
        respondentId: respondent.id,
        name: respondent.name,
        signedArea,
        absSignedArea: Math.abs(signedArea),
        alpha,
        sqrtAlpha,
        status: classifyConsistencyStatus(alpha),
      };
    }
  );

  const thetaMatrix: number[][] = betaMatrix.map((betaRow, respIdx) => {
    const sqrtAlpha = respondentConsistency[respIdx]?.sqrtAlpha ?? 0;
    return betaRow.map((betaVal) => betaVal * sqrtAlpha);
  });

  // Log-space geometric mean prevents floating-point underflow across large N
  const simulatedDeltas: number[] = activeCriteria.map((_, critIdx) => {
    let logSum = 0;
    for (let respIdx = 0; respIdx < respondentCount; respIdx++) {
      const theta = thetaMatrix[respIdx]?.[critIdx] ?? 0;
      logSum += Math.log(theta);
    }
    return Math.exp(logSum / respondentCount);
  });

  const deltaSum = simulatedDeltas.reduce((acc, d) => acc + d, 0);
  const normalizedWeights = simulatedDeltas.map((d) => d / deltaSum);
  const criteriaWeights = assignCriterionWeightRanks(
    activeCriteria,
    simulatedDeltas,
    normalizedWeights
  );

  return {
    criteriaWeights,
    respondentConsistency,
    betaMatrix,
    zeroPointMatrix,
    agrpcMatrix,
    thetaMatrix,
  };
}

function computeReciprocatedMatrix(
  cleanedMatrix: number[][],
  activeCriteria: CriterionConfig[]
): number[][] {
  return cleanedMatrix.map((row) =>
    row.map((value, critIdx) => {
      const criterion = activeCriteria[critIdx];
      return criterion?.type === "cost" ? 1 / value : value;
    })
  );
}

function classifyRecommendationTier(rank: number): RecommendationTier {
  if (rank <= RECOMMENDATION_TIER_CUTOFFS.TOP_MAX_RANK) {
    return RECOMMENDATION_TIER_LABELS.TOP;
  }
  if (rank <= RECOMMENDATION_TIER_CUTOFFS.RECOMMENDED_MAX_RANK) {
    return RECOMMENDATION_TIER_LABELS.RECOMMENDED;
  }
  return RECOMMENDATION_TIER_LABELS.LOW;
}

function computeAlternativeRankings(
  alternatives: AlternativeItem[],
  reciprocatedMatrix: number[][],
  weights: CriterionWeightResult[]
): AlternativeRankingResult[] {
  const gadaIndexes = reciprocatedMatrix.map((row) => {
    let weightedLogSum = 0;
    for (let critIdx = 0; critIdx < weights.length; critIdx++) {
      const w = weights[critIdx]?.normalizedWeight ?? 0;
      const r = row[critIdx] ?? 0;
      weightedLogSum += w * Math.log(r);
    }
    return Math.exp(weightedLogSum);
  });

  const indexSum = gadaIndexes.reduce((acc, val) => acc + val, 0);

  const scored = alternatives.map((alternative, idx) => {
    const gadaIndex = gadaIndexes[idx] ?? 0;
    return {
      alternative,
      originalIndex: idx,
      gadaIndex,
      relativeScore: gadaIndex / indexSum,
    };
  });

  scored.sort(
    (a, b) =>
      b.relativeScore - a.relativeScore || a.originalIndex - b.originalIndex
  );

  return scored.map((entry, sortedIndex) => {
    const rank = sortedIndex + 1;
    return {
      alternativeId: entry.alternative.id,
      name: entry.alternative.name,
      ...(entry.alternative.address !== undefined
        ? { address: entry.alternative.address }
        : {}),
      gadaIndex: entry.gadaIndex,
      relativeScore: entry.relativeScore,
      rank,
      tier: classifyRecommendationTier(rank),
    };
  });
}

/**
 * Executes the complete adapted Grey Absolute Decision Analysis (GADA) pipeline
 * on any domain dataset, optionally overriding group weights with personal scores.
 */
export function runGadaAnalysis(
  input: GadaInput,
  overrideWeights?: Record<string, number>
): GadaOutput {
  if (input.alternatives.length < MIN_ALTERNATIVES) {
    throw new Error(
      `At least ${MIN_ALTERNATIVES} alternative is required, found ${input.alternatives.length}.`
    );
  }

  const preprocessed = preprocessAlternatives(
    input.criteria,
    input.alternatives,
    input.alternativeValues,
    input.options
  );

  const groupWeights: GroupWeightComputation =
    overrideWeights !== undefined
      ? {
          criteriaWeights: computeOverrideWeights(
            preprocessed.activeCriteria,
            overrideWeights
          ),
          respondentConsistency: [],
          betaMatrix: [],
          zeroPointMatrix: [],
          agrpcMatrix: [],
          thetaMatrix: [],
        }
      : computeGroupCriterionWeights(
          input.respondents,
          preprocessed.activeCriteria,
          input.respondentScores
        );

  const reciprocatedMatrix = computeReciprocatedMatrix(
    preprocessed.cleanedMatrix,
    preprocessed.activeCriteria
  );

  const rankings = computeAlternativeRankings(
    input.alternatives,
    reciprocatedMatrix,
    groupWeights.criteriaWeights
  );

  return {
    activeCriteria: preprocessed.activeCriteria,
    excludedCriteria: preprocessed.excludedCriteria,
    imputationLogs: preprocessed.imputationLogs,
    criteriaWeights: groupWeights.criteriaWeights,
    respondentConsistency: groupWeights.respondentConsistency,
    rankings,
    auditTrace: {
      cleanedMatrix: preprocessed.cleanedMatrix,
      betaMatrix: groupWeights.betaMatrix,
      zeroPointMatrix: groupWeights.zeroPointMatrix,
      agrpcMatrix: groupWeights.agrpcMatrix,
      thetaMatrix: groupWeights.thetaMatrix,
      reciprocatedMatrix,
    },
  };
}
