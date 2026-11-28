import type { GadaOptions } from "./types";

export const DEFAULT_GADA_OPTIONS: GadaOptions = {
  binaryTrueValue: 5,
  binaryFalseValue: 1,
  autoDropZeroVariance: true,
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

export const MIN_ACTIVE_CRITERIA = 2;
export const MIN_ALTERNATIVES = 1;
export const MIN_RESPONDENTS = 1;

export const NUMERIC_EPSILON = 1e-12;
export const HOURS_PER_DAY = 24;
export const MINUTES_PER_HOUR = 60;
export const METERS_PER_KILOMETER = 1000;
export const PERCENTAGE_SCALE = 100;

export const DEFAULT_LIKERT_SCORE = 3;
