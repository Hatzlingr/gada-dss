import * as XLSX from "xlsx";
import {
  BINARY_FALSE_WORDS,
  BINARY_TRUE_WORDS,
  DEFAULT_GADA_OPTIONS,
  DEFAULT_SLIDER_SCORE,
  MISSING_VALUE_MARKERS,
} from "./constants";
import type {
  AlternativeItem,
  CriterionConfig,
  GadaInput,
  RawCellValue,
  RespondentItem,
} from "./types";

const GROUP6_DATA_SHEET = "data laundry";
const GROUP6_WEIGHTS_SHEET = "bobot kriteria";
const GROUP6_DATASET_NAME = "UNSRI Student Laundry Evaluation (Group 6)";
const TEMPLATE_FILE_NAME = "GADA_DSS_Template.xlsx";
const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const ADDRESS_HEADER_ALIASES: ReadonlySet<string> = new Set([
  "alamat",
  "address",
  "deskripsi",
  "description",
  "catatan",
]);

const RESPONDENT_SHEET_ALIASES: ReadonlySet<string> = new Set([
  "respondents",
  "responden",
  "bobot",
  "bobot kriteria",
  "weights",
]);

interface Group6CriterionPreset {
  id: string;
  code: string;
  name: string;
  type: CriterionConfig["type"];
  missingStrategy: CriterionConfig["missingStrategy"];
  customPenalty?: number;
  unit?: string;
  isBinary?: boolean;
  keywords: readonly string[];
}

const GROUP6_CRITERIA_PRESETS: readonly Group6CriterionPreset[] = [
  {
    id: "c1",
    code: "C1",
    name: "Tarif Cuci Lipat",
    type: "cost",
    missingStrategy: "penalty_max",
    unit: "Rp",
    keywords: ["cuci lipat"],
  },
  {
    id: "c2",
    code: "C2",
    name: "Tarif Cuci Setrika",
    type: "cost",
    missingStrategy: "penalty_max",
    unit: "Rp",
    keywords: ["cuci setrika"],
  },
  {
    id: "c3",
    code: "C3",
    name: "Tarif Paket Kilat",
    type: "cost",
    missingStrategy: "custom_penalty",
    customPenalty: 20000,
    unit: "Rp",
    keywords: ["ekspress", "express", "kilat"],
  },
  {
    id: "c4",
    code: "C4",
    name: "Jarak dari Kampus",
    type: "cost",
    missingStrategy: "penalty_max",
    unit: "m",
    keywords: ["jarak"],
  },
  {
    id: "c5",
    code: "C5",
    name: "Durasi Pengerjaan",
    type: "cost",
    missingStrategy: "penalty_max",
    unit: "hari",
    keywords: ["durasi"],
  },
  {
    id: "c6",
    code: "C6",
    name: "Batas Minimal Berat",
    type: "cost",
    missingStrategy: "min_value",
    unit: "kg",
    keywords: ["minimal berat", "min berat"],
  },
  {
    id: "c7",
    code: "C7",
    name: "Jam Operasional",
    type: "benefit",
    missingStrategy: "min_value",
    unit: "jam",
    keywords: ["jam buka", "jam operasional"],
  },
  {
    id: "c8",
    code: "C8",
    name: "Layanan Antar-Jemput",
    type: "benefit",
    missingStrategy: "min_value",
    isBinary: true,
    keywords: ["antar jemput", "antar-jemput"],
  },
  {
    id: "qris",
    code: "QRIS",
    name: "Pembayaran QRIS",
    type: "benefit",
    missingStrategy: "min_value",
    isBinary: true,
    keywords: ["qris"],
  },
  {
    id: "c9",
    code: "C9",
    name: "Garansi Pakaian",
    type: "benefit",
    missingStrategy: "min_value",
    isBinary: true,
    keywords: ["garansi"],
  },
];

type SheetGrid = RawCellValue[][];

function normalizeCellString(value: RawCellValue): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

function normalizeCellForStorage(value: RawCellValue): RawCellValue {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return value.trim();
}

function isRowEmpty(row: readonly RawCellValue[]): boolean {
  return row.every((cell) => normalizeCellString(cell) === "");
}

function readSheetGrid(sheet: XLSX.WorkSheet): SheetGrid {
  return XLSX.utils.sheet_to_json<RawCellValue[]>(sheet, {
    header: 1,
    defval: "",
    blankrows: true,
  });
}

function findSheetNameCaseInsensitive(
  sheetNames: readonly string[],
  targetLower: string
): string | undefined {
  return sheetNames.find(
    (name) => name.trim().toLowerCase() === targetLower
  );
}

function extractActiveHeaders(
  headerRow: readonly RawCellValue[] | undefined,
  sheetName: string
): string[] {
  if (!headerRow || headerRow.length === 0) {
    throw new Error(`Sheet "${sheetName}" does not contain a header row.`);
  }

  let lastNonEmptyIndex = -1;
  for (let i = headerRow.length - 1; i >= 0; i--) {
    if (normalizeCellString(headerRow[i]) !== "") {
      lastNonEmptyIndex = i;
      break;
    }
  }

  if (lastNonEmptyIndex < 0) {
    throw new Error(`Sheet "${sheetName}" has an empty header row.`);
  }

  const headers: string[] = [];
  for (let i = 0; i <= lastNonEmptyIndex; i++) {
    const header = normalizeCellString(headerRow[i]);
    if (header === "") {
      throw new Error(
        `Column ${i + 1} in sheet "${sheetName}" has an empty header.`
      );
    }
    headers.push(header);
  }

  return headers;
}

function parsePositiveNumber(
  rawValue: RawCellValue,
  context: string
): number {
  if (typeof rawValue === "number") {
    if (!Number.isFinite(rawValue) || rawValue <= 0) {
      throw new Error(`${context}: expected a number > 0, got ${rawValue}.`);
    }
    return rawValue;
  }

  const text = normalizeCellString(rawValue);
  if (text === "") {
    throw new Error(`${context}: value is missing.`);
  }

  const normalized = text.replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${context}: expected a positive number, got "${text}".`);
  }

  return parsed;
}

function isMissingOrEmpty(value: RawCellValue): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === "string") {
    return MISSING_VALUE_MARKERS.has(value.trim().toLowerCase());
  }
  return false;
}

function isBooleanEntry(value: RawCellValue): boolean {
  if (typeof value === "boolean") {
    return true;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return (
      BINARY_TRUE_WORDS.has(normalized) || BINARY_FALSE_WORDS.has(normalized)
    );
  }
  return false;
}

function detectBinaryColumn(
  rows: readonly (readonly RawCellValue[])[],
  colIndex: number
): boolean {
  let nonMissingCount = 0;

  for (const row of rows) {
    const cell = row[colIndex];
    if (isMissingOrEmpty(cell)) {
      continue;
    }
    nonMissingCount += 1;
    if (!isBooleanEntry(cell)) {
      return false;
    }
  }

  return nonMissingCount > 0;
}

function isAddressHeader(header: string): boolean {
  return ADDRESS_HEADER_ALIASES.has(header.trim().toLowerCase());
}

function matchGroup6CriterionPreset(
  header: string,
  criterionOffset: number
): Group6CriterionPreset | undefined {
  const normalized = header.trim().toLowerCase();
  const byKeyword = GROUP6_CRITERIA_PRESETS.find((preset) =>
    preset.keywords.some((kw) => normalized.includes(kw))
  );
  if (byKeyword) {
    return byKeyword;
  }
  return GROUP6_CRITERIA_PRESETS[criterionOffset];
}

function buildGroup6CriterionConfig(
  header: string,
  criterionOffset: number
): CriterionConfig {
  const preset = matchGroup6CriterionPreset(header, criterionOffset);
  if (preset) {
    return {
      id: preset.id,
      code: preset.code,
      name: preset.name,
      type: preset.type,
      missingStrategy: preset.missingStrategy,
      ...(preset.customPenalty !== undefined
        ? { customPenalty: preset.customPenalty }
        : {}),
      active: true,
      ...(preset.unit !== undefined ? { unit: preset.unit } : {}),
      ...(preset.isBinary !== undefined ? { isBinary: preset.isBinary } : {}),
    };
  }

  const fallbackIndex = criterionOffset + 1;
  return {
    id: `c${fallbackIndex}`,
    code: `C${fallbackIndex}`,
    name: header,
    type: "benefit",
    missingStrategy: "min_value",
    active: true,
  };
}

function parseGroup6Alternatives(
  sheet: XLSX.WorkSheet,
  sheetName: string
): {
  criteria: CriterionConfig[];
  alternatives: AlternativeItem[];
  alternativeValues: Record<string, Record<string, RawCellValue>>;
} {
  const grid = readSheetGrid(sheet);
  const headers = extractActiveHeaders(grid[0], sheetName);

  const hasAddressCol = headers[1] !== undefined && isAddressHeader(headers[1]);
  const startCriterionCol = hasAddressCol ? 2 : 1;

  if (headers.length <= startCriterionCol) {
    throw new Error(
      `Sheet "${sheetName}" must contain at least one criterion column.`
    );
  }

  const criteria: CriterionConfig[] = [];
  for (let col = startCriterionCol; col < headers.length; col++) {
    const header = headers[col];
    if (header !== undefined) {
      criteria.push(
        buildGroup6CriterionConfig(header, col - startCriterionCol)
      );
    }
  }

  const alternatives: AlternativeItem[] = [];
  const alternativeValues: Record<string, Record<string, RawCellValue>> = {};

  for (let rowIdx = 1; rowIdx < grid.length; rowIdx++) {
    const row = grid[rowIdx];
    if (!row || isRowEmpty(row)) {
      continue;
    }

    const name = normalizeCellString(row[0]);
    if (name === "") {
      throw new Error(
        `Row ${rowIdx + 1} in sheet "${sheetName}" is missing an alternative name in column 1.`
      );
    }

    const altId = `alt-${alternatives.length + 1}`;
    const address = hasAddressCol ? normalizeCellString(row[1]) : "";
    alternatives.push({
      id: altId,
      name,
      ...(address !== "" ? { address } : {}),
    });

    const rowValues: Record<string, RawCellValue> = {};
    for (let cIdx = 0; cIdx < criteria.length; cIdx++) {
      const criterion = criteria[cIdx];
      if (!criterion) {
        continue;
      }
      rowValues[criterion.id] = normalizeCellForStorage(
        row[startCriterionCol + cIdx]
      );
    }
    alternativeValues[altId] = rowValues;
  }

  if (alternatives.length === 0) {
    throw new Error(
      `Sheet "${sheetName}" contains no alternative rows to import.`
    );
  }

  return { criteria, alternatives, alternativeValues };
}

interface Group6WeightColumns {
  nameCol: number;
  facultyCol: number;
  majorCol: number;
  batchCol: number;
  scoreColsByCriterionId: Map<string, number>;
}

function locateGroup6WeightColumns(
  headers: readonly string[],
  criteria: readonly CriterionConfig[],
  sheetName: string
): Group6WeightColumns {
  const lowerHeaders = headers.map((h) => h.toLowerCase());

  const nameCol = lowerHeaders.findIndex((h) => h.includes("nama"));
  const facultyCol = lowerHeaders.findIndex((h) => h.includes("fakultas"));
  const majorCol = lowerHeaders.findIndex(
    (h) => h.includes("program studi") || h.includes("prodi")
  );
  const batchCol = lowerHeaders.findIndex((h) => h.includes("angkatan"));

  const scoreColsByCriterionId = new Map<string, number>();

  for (let col = 0; col < headers.length; col++) {
    const header = headers[col]?.trim() ?? "";
    const numberedMatch = /^(\d+)\./.exec(header);
    if (!numberedMatch || numberedMatch[1] === undefined) {
      continue;
    }
    const targetCode = `C${numberedMatch[1]}`;
    const matchedCriterion = criteria.find(
      (c) => c.code.toUpperCase() === targetCode
    );
    if (matchedCriterion) {
      scoreColsByCriterionId.set(matchedCriterion.id, col);
    }
  }

  if (scoreColsByCriterionId.size === 0) {
    const fallbackStart = Math.max(
      nameCol,
      facultyCol,
      majorCol,
      batchCol,
      0
    ) + 1;
    const scorableCriteria = criteria.filter((c) => c.id !== "qris");
    for (let i = 0; i < scorableCriteria.length; i++) {
      const criterion = scorableCriteria[i];
      const col = fallbackStart + i;
      if (criterion && col < headers.length) {
        scoreColsByCriterionId.set(criterion.id, col);
      }
    }
  }

  if (scoreColsByCriterionId.size === 0) {
    throw new Error(
      `Sheet "${sheetName}" does not contain recognizable criterion score columns.`
    );
  }

  return {
    nameCol,
    facultyCol,
    majorCol,
    batchCol,
    scoreColsByCriterionId,
  };
}

function isGroup6DerivedSectionStart(row: readonly RawCellValue[]): boolean {
  const first = normalizeCellString(row[0]).toLowerCase();
  const second = normalizeCellString(row[1]).toLowerCase();
  return (
    first === "nama (opsional)" ||
    first === "nama" ||
    first === "kode" ||
    second === "kode" ||
    second === "total"
  );
}

function parseBatchValue(raw: RawCellValue): string | number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.trunc(raw);
  }
  const text = normalizeCellString(raw);
  if (text === "") {
    return undefined;
  }
  const num = Number(text);
  return Number.isFinite(num) ? Math.trunc(num) : text;
}

function parseGroup6Respondents(
  sheet: XLSX.WorkSheet,
  sheetName: string,
  criteria: readonly CriterionConfig[]
): {
  respondents: RespondentItem[];
  respondentScores: Record<string, Record<string, number>>;
} {
  const grid = readSheetGrid(sheet);
  const headers = extractActiveHeaders(grid[0], sheetName);
  const cols = locateGroup6WeightColumns(headers, criteria, sheetName);

  const respondents: RespondentItem[] = [];
  const respondentScores: Record<string, Record<string, number>> = {};

  for (let rowIdx = 1; rowIdx < grid.length; rowIdx++) {
    const row = grid[rowIdx];
    if (!row || isRowEmpty(row) || isGroup6DerivedSectionStart(row)) {
      break;
    }

    const index = respondents.length + 1;
    const respId = `resp-${index}`;
    const rawName =
      cols.nameCol >= 0 ? normalizeCellString(row[cols.nameCol]) : "";
    const name = rawName !== "" ? rawName : `Responden #${index}`;

    const faculty =
      cols.facultyCol >= 0 ? normalizeCellString(row[cols.facultyCol]) : "";
    const major =
      cols.majorCol >= 0 ? normalizeCellString(row[cols.majorCol]) : "";
    const batch =
      cols.batchCol >= 0 ? parseBatchValue(row[cols.batchCol]) : undefined;

    respondents.push({
      id: respId,
      name,
      ...(faculty !== "" ? { faculty } : {}),
      ...(major !== "" ? { major } : {}),
      ...(batch !== undefined ? { batch } : {}),
    });

    const scores: Record<string, number> = {};
    for (const criterion of criteria) {
      const col = cols.scoreColsByCriterionId.get(criterion.id);
      if (col === undefined) {
        scores[criterion.id] = DEFAULT_SLIDER_SCORE;
        continue;
      }
      scores[criterion.id] = parsePositiveNumber(
        row[col],
        `Respondent "${name}" on "${criterion.code}" (row ${rowIdx + 1})`
      );
    }
    respondentScores[respId] = scores;
  }

  if (respondents.length === 0) {
    throw new Error(
      `Sheet "${sheetName}" contains no respondent survey rows.`
    );
  }

  return { respondents, respondentScores };
}

function parseGroup6Workbook(
  workbook: XLSX.WorkBook,
  dataSheetName: string,
  weightsSheetName: string
): GadaInput {
  const dataSheet = workbook.Sheets[dataSheetName];
  const weightsSheet = workbook.Sheets[weightsSheetName];

  if (!dataSheet || !weightsSheet) {
    throw new Error("Group 6 survey sheets could not be opened.");
  }

  const { criteria, alternatives, alternativeValues } = parseGroup6Alternatives(
    dataSheet,
    dataSheetName
  );
  const { respondents, respondentScores } = parseGroup6Respondents(
    weightsSheet,
    weightsSheetName,
    criteria
  );

  return {
    datasetName: GROUP6_DATASET_NAME,
    criteria,
    alternatives,
    respondents,
    alternativeValues,
    respondentScores,
    options: { ...DEFAULT_GADA_OPTIONS },
  };
}

function parseGenericAlternatives(
  sheet: XLSX.WorkSheet,
  sheetName: string
): {
  criteria: CriterionConfig[];
  alternatives: AlternativeItem[];
  alternativeValues: Record<string, Record<string, RawCellValue>>;
} {
  const grid = readSheetGrid(sheet);
  const headers = extractActiveHeaders(grid[0], sheetName);

  const hasAddressCol = headers[1] !== undefined && isAddressHeader(headers[1]);
  const startCriterionCol = hasAddressCol ? 2 : 1;

  if (headers.length <= startCriterionCol) {
    throw new Error(
      `Sheet "${sheetName}" must include at least one criterion column after the alternative name${hasAddressCol ? " and address/description" : ""} column.`
    );
  }

  const dataRows: Array<{ sourceRowNum: number; row: RawCellValue[] }> = [];
  for (let rowIdx = 1; rowIdx < grid.length; rowIdx++) {
    const row = grid[rowIdx];
    if (!row || isRowEmpty(row)) {
      continue;
    }
    dataRows.push({ sourceRowNum: rowIdx + 1, row });
  }

  if (dataRows.length === 0) {
    throw new Error(
      `Sheet "${sheetName}" contains headers but no alternative data rows.`
    );
  }

  const rawRowsOnly = dataRows.map((entry) => entry.row);
  const criteria: CriterionConfig[] = [];

  for (let col = startCriterionCol; col < headers.length; col++) {
    const criterionName = headers[col];
    if (criterionName === undefined) {
      continue;
    }
    const index = criteria.length + 1;
    const isBinary = detectBinaryColumn(rawRowsOnly, col);
    criteria.push({
      id: `c${index}`,
      code: `C${index}`,
      name: criterionName,
      type: "benefit",
      missingStrategy: "min_value",
      active: true,
      ...(isBinary ? { isBinary: true } : {}),
    });
  }

  const alternatives: AlternativeItem[] = [];
  const alternativeValues: Record<string, Record<string, RawCellValue>> = {};

  for (const { sourceRowNum, row } of dataRows) {
    const name = normalizeCellString(row[0]);
    if (name === "") {
      throw new Error(
        `Row ${sourceRowNum} in sheet "${sheetName}" is missing an alternative name in column 1.`
      );
    }

    const altId = `alt-${alternatives.length + 1}`;
    const address = hasAddressCol ? normalizeCellString(row[1]) : "";
    alternatives.push({
      id: altId,
      name,
      ...(address !== "" ? { address } : {}),
    });

    const rowValues: Record<string, RawCellValue> = {};
    for (let cIdx = 0; cIdx < criteria.length; cIdx++) {
      const criterion = criteria[cIdx];
      if (!criterion) {
        continue;
      }
      rowValues[criterion.id] = normalizeCellForStorage(
        row[startCriterionCol + cIdx]
      );
    }
    alternativeValues[altId] = rowValues;
  }

  return { criteria, alternatives, alternativeValues };
}

function findGenericRespondentsSheetName(
  workbook: XLSX.WorkBook,
  firstSheetName: string
): string | undefined {
  const candidates = workbook.SheetNames.filter(
    (name) => name !== firstSheetName
  );
  if (candidates.length === 0) {
    return undefined;
  }

  const preferred = candidates.find((name) =>
    RESPONDENT_SHEET_ALIASES.has(name.trim().toLowerCase())
  );
  const target = preferred ?? candidates[0];
  if (!target) {
    return undefined;
  }

  const sheet = workbook.Sheets[target];
  if (!sheet) {
    return undefined;
  }

  const grid = readSheetGrid(sheet);
  const hasAnyContent = grid.some((row) => !isRowEmpty(row));
  return hasAnyContent ? target : undefined;
}

function mapGenericRespondentScoreColumns(
  headers: readonly string[],
  criteria: readonly CriterionConfig[],
  sheetName: string
): Map<string, number> {
  const scoreColHeaders = headers.slice(1);
  if (scoreColHeaders.length !== criteria.length) {
    throw new Error(
      `Sheet "${sheetName}" has ${scoreColHeaders.length} criterion score column(s), expected ${criteria.length} to match Sheet 1 criteria.`
    );
  }

  const byIdentifier = new Map<string, number>();
  const matchedCols = new Set<number>();

  for (const criterion of criteria) {
    const codeLower = criterion.code.toLowerCase();
    const nameLower = criterion.name.toLowerCase();

    const matchedIdx = scoreColHeaders.findIndex((header, idx) => {
      if (matchedCols.has(idx)) {
        return false;
      }
      const lower = header.trim().toLowerCase();
      return lower === codeLower || lower === nameLower;
    });

    if (matchedIdx >= 0) {
      matchedCols.add(matchedIdx);
      byIdentifier.set(criterion.id, matchedIdx + 1);
    }
  }

  if (byIdentifier.size === criteria.length) {
    return byIdentifier;
  }

  const positional = new Map<string, number>();
  criteria.forEach((criterion, idx) => {
    positional.set(criterion.id, idx + 1);
  });
  return positional;
}

function parseGenericRespondents(
  sheet: XLSX.WorkSheet,
  sheetName: string,
  criteria: readonly CriterionConfig[]
): {
  respondents: RespondentItem[];
  respondentScores: Record<string, Record<string, number>>;
} {
  const grid = readSheetGrid(sheet);
  const headers = extractActiveHeaders(grid[0], sheetName);
  const scoreCols = mapGenericRespondentScoreColumns(
    headers,
    criteria,
    sheetName
  );

  const respondents: RespondentItem[] = [];
  const respondentScores: Record<string, Record<string, number>> = {};

  for (let rowIdx = 1; rowIdx < grid.length; rowIdx++) {
    const row = grid[rowIdx];
    if (!row || isRowEmpty(row)) {
      continue;
    }

    const name = normalizeCellString(row[0]);
    if (name === "") {
      throw new Error(
        `Row ${rowIdx + 1} in sheet "${sheetName}" is missing a respondent name in column 1.`
      );
    }

    const respId = `resp-${respondents.length + 1}`;
    respondents.push({ id: respId, name });

    const scores: Record<string, number> = {};
    for (const criterion of criteria) {
      const col = scoreCols.get(criterion.id);
      if (col === undefined) {
        throw new Error(
          `Missing column mapping for criterion "${criterion.name}" in sheet "${sheetName}".`
        );
      }
      scores[criterion.id] = parsePositiveNumber(
        row[col],
        `Respondent "${name}" on "${criterion.name}" (row ${rowIdx + 1})`
      );
    }
    respondentScores[respId] = scores;
  }

  if (respondents.length === 0) {
    throw new Error(
      `Sheet "${sheetName}" contains headers but no respondent rows.`
    );
  }

  return { respondents, respondentScores };
}

function createDefaultEqualWeightRespondents(
  criteria: readonly CriterionConfig[]
): {
  respondents: RespondentItem[];
  respondentScores: Record<string, Record<string, number>>;
} {
  const defaultScores: Record<string, number> = {};
  for (const criterion of criteria) {
    defaultScores[criterion.id] = DEFAULT_SLIDER_SCORE;
  }

  return {
    respondents: [{ id: "resp-1", name: "Default Equal Weight" }],
    respondentScores: { "resp-1": defaultScores },
  };
}

function deriveDatasetNameFromFilename(fileName: string): string {
  const stripped = fileName.replace(/\.(xlsx|xls|csv)$/i, "").trim();
  return stripped !== "" ? stripped : "Imported GADA Dataset";
}

function parseGenericWorkbook(
  workbook: XLSX.WorkBook,
  fileName: string
): GadaInput {
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("The uploaded file contains no worksheets.");
  }

  const firstSheet = workbook.Sheets[firstSheetName];
  if (!firstSheet) {
    throw new Error(`Worksheet "${firstSheetName}" could not be read.`);
  }

  const { criteria, alternatives, alternativeValues } =
    parseGenericAlternatives(firstSheet, firstSheetName);

  const secondSheetName = findGenericRespondentsSheetName(
    workbook,
    firstSheetName
  );
  const secondSheet = secondSheetName
    ? workbook.Sheets[secondSheetName]
    : undefined;

  const { respondents, respondentScores } =
    secondSheet && secondSheetName
      ? parseGenericRespondents(secondSheet, secondSheetName, criteria)
      : createDefaultEqualWeightRespondents(criteria);

  return {
    datasetName: deriveDatasetNameFromFilename(fileName),
    criteria,
    alternatives,
    respondents,
    alternativeValues,
    respondentScores,
    options: { ...DEFAULT_GADA_OPTIONS },
  };
}

function detectCsvFieldSeparator(text: string): string | undefined {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim() !== "");
  if (!firstLine) {
    return undefined;
  }
  if (firstLine.includes(";") && !firstLine.includes(",")) {
    return ";";
  }
  return undefined;
}

async function readWorkbookFromFile(file: File): Promise<XLSX.WorkBook> {
  const isCsv =
    file.name.toLowerCase().endsWith(".csv") ||
    file.type.toLowerCase() === "text/csv";

  if (isCsv) {
    const text = await file.text();
    if (text.trim() === "") {
      throw new Error(`CSV file "${file.name}" is empty.`);
    }
    const separator = detectCsvFieldSeparator(text);
    return XLSX.read(text, {
      type: "string",
      ...(separator !== undefined ? { FS: separator } : {}),
    });
  }

  const arrayBuffer = await file.arrayBuffer();
  if (arrayBuffer.byteLength === 0) {
    throw new Error(`Spreadsheet file "${file.name}" is empty.`);
  }
  return XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
}

/**
 * Parses an uploaded .xlsx, .xls, or .csv file into a GadaInput object.
 * Auto-detects the Group 6 survey workbook (Mode A) or any generic multi-domain file (Mode B).
 */
export async function parseSpreadsheetToGadaInput(
  file: File
): Promise<GadaInput> {
  let workbook: XLSX.WorkBook;
  try {
    workbook = await readWorkbookFromFile(file);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read "${file.name}": ${message}`);
  }

  if (workbook.SheetNames.length === 0) {
    throw new Error(`File "${file.name}" contains no readable sheets.`);
  }

  const dataLaundrySheet = findSheetNameCaseInsensitive(
    workbook.SheetNames,
    GROUP6_DATA_SHEET
  );
  const bobotKriteriaSheet = findSheetNameCaseInsensitive(
    workbook.SheetNames,
    GROUP6_WEIGHTS_SHEET
  );

  if (dataLaundrySheet && bobotKriteriaSheet) {
    return parseGroup6Workbook(workbook, dataLaundrySheet, bobotKriteriaSheet);
  }

  return parseGenericWorkbook(workbook, file.name);
}

/**
 * Creates a minimal valid starter dataset (3 alternatives, 3 criteria, 2 respondents).
 */
export function createBlankGadaInput(): GadaInput {
  return {
    datasetName: "Dataset Baru (3x3)",
    criteria: [
      {
        id: "c1",
        code: "C1",
        name: "Biaya / Harga",
        type: "cost",
        missingStrategy: "penalty_max",
        active: true,
        unit: "Rp",
      },
      {
        id: "c2",
        code: "C2",
        name: "Kualitas",
        type: "benefit",
        missingStrategy: "min_value",
        active: true,
        unit: "skor",
      },
      {
        id: "c3",
        code: "C3",
        name: "Kelengkapan Fitur",
        type: "benefit",
        missingStrategy: "min_value",
        active: true,
        isBinary: true,
      },
    ],
    alternatives: [
      { id: "alt-1", name: "Alternatif A", address: "Catatan opsi A" },
      { id: "alt-2", name: "Alternatif B", address: "Catatan opsi B" },
      { id: "alt-3", name: "Alternatif C", address: "Catatan opsi C" },
    ],
    respondents: [
      { id: "resp-1", name: "Responden 1" },
      { id: "resp-2", name: "Responden 2" },
    ],
    alternativeValues: {
      "alt-1": { c1: 100000, c2: 4, c3: "Ya" },
      "alt-2": { c1: 125000, c2: 5, c3: "Ya" },
      "alt-3": { c1: 85000, c2: 3, c3: "Tidak" },
    },
    respondentScores: {
      "resp-1": { c1: 5, c2: 4, c3: 3 },
      "resp-2": { c1: 4, c2: 5, c3: 4 },
    },
    options: { ...DEFAULT_GADA_OPTIONS },
  };
}

/**
 * Generates and downloads a clean 2-sheet .xlsx template (Alternatives, Respondents).
 */
export function downloadTemplateWorkbook(): void {
  const alternativesRows: RawCellValue[][] = [
    [
      "Alternative Name",
      "Description",
      "Cost Metric",
      "Benefit Metric",
      "Binary Feature",
    ],
    ["Option A", "Example description A", 100, 4, "Ya"],
    ["Option B", "Example description B", 150, 5, "Tidak"],
    ["Option C", "Example description C", 120, 3, "Ya"],
  ];

  const respondentsRows: RawCellValue[][] = [
    ["Respondent Name", "Cost Metric", "Benefit Metric", "Binary Feature"],
    ["Respondent 1", 5, 4, 3],
    ["Respondent 2", 4, 5, 4],
  ];

  const alternativesSheet = XLSX.utils.aoa_to_sheet(alternativesRows);
  alternativesSheet["!cols"] = [
    { wch: 22 },
    { wch: 26 },
    { wch: 15 },
    { wch: 15 },
    { wch: 16 },
  ];

  const respondentsSheet = XLSX.utils.aoa_to_sheet(respondentsRows);
  respondentsSheet["!cols"] = [
    { wch: 22 },
    { wch: 15 },
    { wch: 15 },
    { wch: 16 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, alternativesSheet, "Alternatives");
  XLSX.utils.book_append_sheet(workbook, respondentsSheet, "Respondents");

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], { type: XLSX_MIME_TYPE });

  if (typeof document === "undefined") {
    return;
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = TEMPLATE_FILE_NAME;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
