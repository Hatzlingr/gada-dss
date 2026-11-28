import * as XLSX from "xlsx";
import {
  BINARY_FALSE_WORDS,
  BINARY_TRUE_WORDS,
  DEFAULT_GADA_OPTIONS,
  DEFAULT_LIKERT_SCORE,
  MISSING_VALUE_MARKERS,
} from "./constants";
import type {
  AlternativeItem,
  CriterionConfig,
  CriterionType,
  GadaInput,
  ImputationStrategy,
  RawCellValue,
  RespondentItem,
} from "./types";

const TEMPLATE_FILE_NAME = "Template_Dataset_GADA.xlsx";
const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const CRITERION_TYPE_TAG_REGEX = /^(.*?)\s*\((cost|benefit)\)\s*$/i;

const ADDRESS_HEADER_ALIASES: ReadonlySet<string> = new Set([
  "alamat",
  "address",
  "deskripsi",
  "description",
  "catatan",
  "keterangan",
]);

const RESPONDENT_SHEET_ALIASES: ReadonlySet<string> = new Set([
  "respondents",
  "responden",
  "bobot",
  "bobot kriteria",
  "weights",
]);

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

/**
 * Extracts clean criterion name and optional `(Cost)` / `(Benefit)` suffix tag.
 */
function parseCriterionHeader(rawHeader: string): {
  name: string;
  type: CriterionType;
  missingStrategy: ImputationStrategy;
} {
  const trimmed = rawHeader.trim();
  const match = CRITERION_TYPE_TAG_REGEX.exec(trimmed);

  if (match && match[1] !== undefined && match[2] !== undefined) {
    const baseName = match[1].trim();
    if (baseName !== "") {
      const type: CriterionType =
        match[2].toLowerCase() === "cost" ? "cost" : "benefit";
      return {
        name: baseName,
        type,
        missingStrategy: type === "cost" ? "penalty_max" : "min_value",
      };
    }
  }

  return {
    name: trimmed,
    type: "benefit",
    missingStrategy: "min_value",
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
      `Sheet "${sheetName}" must include at least one criterion column after the alternative name${hasAddressCol ? " and description" : ""} column.`
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
    const rawHeader = headers[col];
    if (rawHeader === undefined) {
      continue;
    }
    const index = criteria.length + 1;
    const isBinary = detectBinaryColumn(rawRowsOnly, col);
    const { name, type, missingStrategy } = parseCriterionHeader(rawHeader);

    criteria.push({
      id: `c${index}`,
      code: `C${index}`,
      name,
      type,
      missingStrategy,
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
      const rawLower = header.trim().toLowerCase();
      const parsedNameLower = parseCriterionHeader(header).name.toLowerCase();
      return (
        rawLower === codeLower ||
        rawLower === nameLower ||
        parsedNameLower === nameLower
      );
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
    defaultScores[criterion.id] = DEFAULT_LIKERT_SCORE;
  }

  return {
    respondents: [{ id: "resp-1", name: "Bobot Setara Default" }],
    respondentScores: { "resp-1": defaultScores },
  };
}

function deriveDatasetNameFromFilename(fileName: string): string {
  const stripped = fileName.replace(/\.(xlsx|xls|csv)$/i, "").trim();
  return stripped !== "" ? stripped : "Dataset Evaluasi GADA";
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
 * Parses an uploaded .xlsx, .xls, or .csv file into a generic GadaInput object.
 * Supports 1-sheet CSV/Excel or 2-sheet (Alternatif + Responden) workbooks.
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

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error(`File "${file.name}" contains no readable sheets.`);
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
    datasetName: deriveDatasetNameFromFilename(file.name),
    criteria,
    alternatives,
    respondents,
    alternativeValues,
    respondentScores,
    options: { ...DEFAULT_GADA_OPTIONS },
  };
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
 * Generates and downloads a clean 2-sheet .xlsx template (Alternatif, Responden).
 */
export function downloadTemplateWorkbook(): void {
  const alternativesRows: RawCellValue[][] = [
    [
      "Nama Alternatif",
      "Keterangan",
      "Biaya (Cost)",
      "Kualitas (Benefit)",
      "Fitur Biner (Benefit)",
    ],
    ["Alternatif A", "Contoh keterangan A", 100, 4, "Ya"],
    ["Alternatif B", "Contoh keterangan B", 150, 5, "Tidak"],
    ["Alternatif C", "Contoh keterangan C", 120, 3, "Ya"],
  ];

  const respondentsRows: RawCellValue[][] = [
    ["Nama Responden", "Biaya", "Kualitas", "Fitur Biner"],
    ["Responden 1", 5, 4, 3],
    ["Responden 2", 4, 5, 4],
  ];

  const alternativesSheet = XLSX.utils.aoa_to_sheet(alternativesRows);
  alternativesSheet["!cols"] = [
    { wch: 22 },
    { wch: 26 },
    { wch: 16 },
    { wch: 20 },
    { wch: 22 },
  ];

  const respondentsSheet = XLSX.utils.aoa_to_sheet(respondentsRows);
  respondentsSheet["!cols"] = [
    { wch: 22 },
    { wch: 16 },
    { wch: 18 },
    { wch: 16 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, alternativesSheet, "Alternatif");
  XLSX.utils.book_append_sheet(workbook, respondentsSheet, "Responden");

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
