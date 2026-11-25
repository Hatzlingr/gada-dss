import type { GadaOptions, RecommendationTier } from "./types";

export const DEFAULT_BINARY_TRUE_VALUE = 5;
export const DEFAULT_BINARY_FALSE_VALUE = 1;
export const DEFAULT_AUTO_DROP_ZERO_VARIANCE = true;

export const DEFAULT_GADA_OPTIONS: GadaOptions = {
  binaryTrueValue: DEFAULT_BINARY_TRUE_VALUE,
  binaryFalseValue: DEFAULT_BINARY_FALSE_VALUE,
  autoDropZeroVariance: DEFAULT_AUTO_DROP_ZERO_VARIANCE,
};

export const BINARY_TRUE_WORDS: ReadonlySet<string> = new Set([
  "ya",
  "yes",
  "true",
]);

export const BINARY_FALSE_WORDS: ReadonlySet<string> = new Set([
  "tidak",
  "no",
  "false",
]);

export const MISSING_VALUE_MARKERS: ReadonlySet<string> = new Set([
  "",
  "-",
  "n/a",
  "null",
]);

export const CONSISTENCY_THRESHOLDS = {
  HIGH_MIN_ALPHA: 0.85,
  MODERATE_MIN_ALPHA: 0.65,
} as const;

export const RECOMMENDATION_TIER_CUTOFFS = {
  TOP_MAX_RANK: 3,
  RECOMMENDED_MAX_RANK: 10,
} as const;

export const RECOMMENDATION_TIER_LABELS: Readonly<{
  TOP: RecommendationTier;
  RECOMMENDED: RecommendationTier;
  LOW: RecommendationTier;
}> = {
  TOP: "Sangat Direkomendasikan",
  RECOMMENDED: "Direkomendasikan",
  LOW: "Kurang Direkomendasikan",
};

export const MIN_ACTIVE_CRITERIA = 2;
export const MIN_ALTERNATIVES = 1;
export const MIN_RESPONDENTS = 1;

export const NUMERIC_EPSILON = 1e-12;
export const HOURS_PER_DAY = 24;
export const MINUTES_PER_HOUR = 60;
export const METERS_PER_KILOMETER = 1000;
export const PERCENTAGE_SCALE = 100;
export const RADAR_MAX_SCALE = 100;

export const DEFAULT_SLIDER_SCORE = 3;
export const SLIDER_MIN_SCORE = 1;
export const SLIDER_MAX_SCORE = 5;
