export type CriterionType = "cost" | "benefit";

export type ImputationStrategy =
  | "penalty_max"
  | "min_value"
  | "mean"
  | "custom_penalty";

export type ConsistencyStatus = "high" | "moderate" | "low_warning";

export type RawCellValue = string | number | boolean | null | undefined;

export interface CriterionConfig {
  id: string;
  code: string;
  name: string;
  type: CriterionType;
  missingStrategy: ImputationStrategy;
  active: boolean;
  unit?: string;
  isBinary?: boolean;
  customPenalty?: number;
}

export interface AlternativeItem {
  id: string;
  name: string;
  address?: string;
}

export interface RespondentItem {
  id: string;
  name: string;
}

export interface GadaOptions {
  binaryTrueValue: number;
  binaryFalseValue: number;
  autoDropZeroVariance: boolean;
}

export interface GadaInput {
  datasetName?: string;
  criteria: CriterionConfig[];
  alternatives: AlternativeItem[];
  respondents: RespondentItem[];
  alternativeValues: Record<string, Record<string, RawCellValue>>;
  respondentScores: Record<string, Record<string, number>>;
  options: GadaOptions;
}

export interface ExcludedCriterion {
  criterionId: string;
  code: string;
  name: string;
  reason: "inactive" | "zero_variance";
  detail: string;
}

export interface ImputationLog {
  alternativeId: string;
  alternativeName: string;
  criterionId: string;
  criterionCode: string;
  criterionName: string;
  rawValue: RawCellValue;
  imputedValue: number;
  strategy: ImputationStrategy;
}

export interface CriterionWeightResult {
  criterionId: string;
  code: string;
  name: string;
  type: CriterionType;
  simulatedDelta: number;
  normalizedWeight: number;
  percentage: number;
  rank: number;
}

export interface RespondentConsistencyResult {
  respondentId: string;
  name: string;
  signedArea: number;
  absSignedArea: number;
  alpha: number;
  sqrtAlpha: number;
  status: ConsistencyStatus;
}

export interface AlternativeRankingResult {
  alternativeId: string;
  name: string;
  address?: string;
  gadaIndex: number;
  relativeScore: number;
  rank: number;
}

export interface GadaAuditTrace {
  cleanedMatrix: number[][];
  betaMatrix: number[][];
  zeroPointMatrix: number[][];
  agrpcMatrix: number[][];
  thetaMatrix: number[][];
  reciprocatedMatrix: number[][];
}

export interface GadaOutput {
  activeCriteria: CriterionConfig[];
  excludedCriteria: ExcludedCriterion[];
  imputationLogs: ImputationLog[];
  criteriaWeights: CriterionWeightResult[];
  respondentConsistency: RespondentConsistencyResult[];
  rankings: AlternativeRankingResult[];
  auditTrace: GadaAuditTrace;
}
