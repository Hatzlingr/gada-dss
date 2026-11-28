import * as XLSX from "xlsx";
import { PERCENTAGE_SCALE } from "./constants";
import type {
  CriterionConfig,
  GadaInput,
  GadaOutput,
} from "./types";
import { downloadWorkbookFile } from "./workbook";

export type MatrixCellValue = string | number;

const DEFAULT_EXPORT_BASENAME = "gada-analysis-report";

type SheetCell = string | number | boolean | null;

function sanitizeCell(value: MatrixCellValue, format: "markdown" | "tsv"): string {
  const normalized = String(value).replaceAll("\r\n", " ").replaceAll("\n", " ");
  return format === "markdown"
    ? normalized.replaceAll("|", "\\|")
    : normalized.replaceAll("\t", " ");
}

function formatMatrixTable(
  headers: readonly string[],
  rows: ReadonlyArray<ReadonlyArray<MatrixCellValue>>,
  format: "markdown" | "tsv"
): string {
  if (headers.length === 0) {
    return "";
  }

  const formatRow = (cells: readonly MatrixCellValue[]) => {
    const sanitized = cells.map((cell) => sanitizeCell(cell, format));
    return format === "markdown"
      ? `| ${sanitized.join(" | ")} |`
      : sanitized.join("\t");
  };

  const lines = [formatRow(headers)];
  if (format === "markdown") {
    lines.push(`| ${headers.map(() => "---").join(" | ")} |`);
  }

  for (const row of rows) {
    const aligned = headers.map((_, colIdx) => row[colIdx] ?? "");
    lines.push(formatRow(aligned));
  }

  return lines.join("\n");
}

/**
 * Formats tabular headers and rows as a GitHub-Flavored Markdown table.
 */
export function formatMatrixAsMarkdown(
  headers: readonly string[],
  rows: ReadonlyArray<ReadonlyArray<MatrixCellValue>>
): string {
  return formatMatrixTable(headers, rows, "markdown");
}

/**
 * Formats tabular headers and rows as Tab-Separated Values (TSV) for spreadsheet paste.
 */
export function formatMatrixAsTSV(
  headers: readonly string[],
  rows: ReadonlyArray<ReadonlyArray<MatrixCellValue>>
): string {
  return formatMatrixTable(headers, rows, "tsv");
}

function resolveExportFilename(input: GadaInput, filename?: string): string {
  if (filename !== undefined && filename.trim().length > 0) {
    const trimmed = filename.trim();
    return trimmed.toLowerCase().endsWith(".xlsx") ? trimmed : `${trimmed}.xlsx`;
  }

  const datasetSlug = (input.datasetName ?? DEFAULT_EXPORT_BASENAME)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const base = datasetSlug.length > 0 ? datasetSlug : DEFAULT_EXPORT_BASENAME;
  return `${base}-gada-report.xlsx`;
}

function computeAutoColumnWidths(
  rows: ReadonlyArray<ReadonlyArray<SheetCell>>
): Array<{ wch: number }> {
  const maxColCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const widths: Array<{ wch: number }> = [];

  for (let colIdx = 0; colIdx < maxColCount; colIdx++) {
    let maxLen = 10;
    for (const row of rows) {
      const cell = row[colIdx];
      if (cell === null || cell === undefined) {
        continue;
      }
      const len = String(cell).length;
      if (len > maxLen) {
        maxLen = len;
      }
    }
    widths.push({ wch: Math.min(maxLen + 3, 44) });
  }

  return widths;
}

function buildWorksheet(
  rows: ReadonlyArray<ReadonlyArray<SheetCell>>
): XLSX.WorkSheet {
  const mutableRows: SheetCell[][] = rows.map((row) => [...row]);
  const worksheet = XLSX.utils.aoa_to_sheet(mutableRows);
  worksheet["!cols"] = computeAutoColumnWidths(rows);
  return worksheet;
}

function buildRankingSheetRows(output: GadaOutput): SheetCell[][] {
  const headers: SheetCell[] = [
    "Rank",
    "Alternative ID",
    "Alternative Name",
    "Address / Notes",
    "GADA Index (r_hat_j)",
    "Relative Score (R_hat_j)",
    "Percentage (%)",
  ];

  const dataRows: SheetCell[][] = output.rankings.map((item) => [
    item.rank,
    item.alternativeId,
    item.name,
    item.address ?? "",
    item.gadaIndex,
    item.relativeScore,
    item.relativeScore * PERCENTAGE_SCALE,
  ]);

  return [headers, ...dataRows];
}

function buildCriteriaWeightsSheetRows(output: GadaOutput): SheetCell[][] {
  const activeById = new Map<string, CriterionConfig>(
    output.activeCriteria.map((criterion) => [criterion.id, criterion])
  );

  const rows: SheetCell[][] = [
    [
      "Weight Rank",
      "Code",
      "Criterion Name",
      "Type",
      "Unit",
      "Missing Strategy",
      "Simulated Delta (delta_k)",
      "Normalized Weight (W_k)",
      "Percentage (%)",
    ],
  ];

  for (const weight of output.criteriaWeights) {
    const config = activeById.get(weight.criterionId);
    rows.push([
      weight.rank,
      weight.code,
      weight.name,
      weight.type,
      config?.unit ?? "",
      config?.missingStrategy ?? "",
      weight.simulatedDelta,
      weight.normalizedWeight,
      weight.percentage,
    ]);
  }

  if (output.excludedCriteria.length > 0) {
    rows.push([]);
    rows.push(["Excluded Criteria"]);
    rows.push(["Criterion ID", "Code", "Name", "Reason", "Detail"]);
    for (const excluded of output.excludedCriteria) {
      rows.push([
        excluded.criterionId,
        excluded.code,
        excluded.name,
        excluded.reason,
        excluded.detail,
      ]);
    }
  }

  if (output.imputationLogs.length > 0) {
    rows.push([]);
    rows.push(["Imputation Logs"]);
    rows.push([
      "Alternative ID",
      "Alternative Name",
      "Criterion Code",
      "Criterion Name",
      "Raw Value",
      "Imputed Value",
      "Strategy",
    ]);
    for (const log of output.imputationLogs) {
      rows.push([
        log.alternativeId,
        log.alternativeName,
        log.criterionCode,
        log.criterionName,
        log.rawValue === null || log.rawValue === undefined
          ? ""
          : String(log.rawValue),
        log.imputedValue,
        log.strategy,
      ]);
    }
  }

  return rows;
}

function buildConsistencySheetRows(output: GadaOutput): SheetCell[][] {
  const rows: SheetCell[][] = [
    [
      "No",
      "Respondent ID",
      "Respondent Name",
      "Signed Area (s_i)",
      "Abs Signed Area (|s_i|)",
      "Alpha (alpha_i)",
      "Sqrt Alpha (sqrt(alpha_i))",
      "Status",
    ],
  ];

  if (output.respondentConsistency.length === 0) {
    rows.push(["No respondent consistency data available."]);
    return rows;
  }

  output.respondentConsistency.forEach((item, index) => {
    rows.push([
      index + 1,
      item.respondentId,
      item.name,
      item.signedArea,
      item.absSignedArea,
      item.alpha,
      item.sqrtAlpha,
      item.status,
    ]);
  });

  return rows;
}

function appendMatrixSection(
  target: SheetCell[][],
  title: string,
  rowHeaderLabel: string,
  columnLabels: readonly string[],
  rowLabels: readonly string[],
  matrix: ReadonlyArray<ReadonlyArray<number>>
): void {
  if (target.length > 0) {
    target.push([]);
  }
  target.push([title]);

  if (matrix.length === 0) {
    target.push(["(Not generated — no rows available)"]);
    return;
  }

  target.push([rowHeaderLabel, ...columnLabels]);

  matrix.forEach((rowValues, rowIdx) => {
    const rowLabel = rowLabels[rowIdx] ?? `Row ${rowIdx + 1}`;
    const cells: SheetCell[] = [rowLabel];
    for (let colIdx = 0; colIdx < columnLabels.length; colIdx++) {
      cells.push(rowValues[colIdx] ?? null);
    }
    target.push(cells);
  });
}

function buildAuditMatricesSheetRows(
  input: GadaInput,
  output: GadaOutput
): SheetCell[][] {
  const rows: SheetCell[][] = [];
  const criterionHeaders = output.activeCriteria.map(
    (criterion) => `${criterion.code} (${criterion.name})`
  );
  const alternativeLabels = input.alternatives.map((alt) => alt.name);
  const respondentLabels = input.respondents.map((resp) => resp.name);

  const sections: Array<{
    title: string;
    rowHeaderLabel: string;
    columnLabels: readonly string[];
    rowLabels: readonly string[];
    matrix: ReadonlyArray<ReadonlyArray<number>>;
  }> = [
    {
      title: "1. Cleaned Decision Matrix (A = [a_jk])",
      rowHeaderLabel: "Alternative",
      columnLabels: criterionHeaders,
      rowLabels: alternativeLabels,
      matrix: output.auditTrace.cleanedMatrix,
    },
    {
      title: "2. Reciprocated Operator Matrix (R = [r_jk])",
      rowHeaderLabel: "Alternative",
      columnLabels: criterionHeaders,
      rowLabels: alternativeLabels,
      matrix: output.auditTrace.reciprocatedMatrix,
    },
    {
      title: "3. Preference Normalization Matrix (Beta = [beta_i(k)])",
      rowHeaderLabel: "Respondent",
      columnLabels: criterionHeaders,
      rowLabels: respondentLabels,
      matrix: output.auditTrace.betaMatrix,
    },
    {
      title: "4. Zero-Starting Point Image Matrix (X0 = [x_i^0(k)])",
      rowHeaderLabel: "Respondent",
      columnLabels: criterionHeaders,
      rowLabels: respondentLabels,
      matrix: output.auditTrace.zeroPointMatrix,
    },
    {
      title: "5. AGRPC Matrix (Epsilon = [epsilon_ij])",
      rowHeaderLabel: "Respondent",
      columnLabels: respondentLabels,
      rowLabels: respondentLabels,
      matrix: output.auditTrace.agrpcMatrix,
    },
    {
      title: "6. Weighted Individual Preference Matrix (Theta = [theta_ik])",
      rowHeaderLabel: "Respondent",
      columnLabels: criterionHeaders,
      rowLabels: respondentLabels,
      matrix: output.auditTrace.thetaMatrix,
    },
  ];

  for (const section of sections) {
    appendMatrixSection(
      rows,
      section.title,
      section.rowHeaderLabel,
      section.columnLabels,
      section.rowLabels,
      section.matrix
    );
  }

  return rows;
}

/**
 * Builds the 4-sheet GADA report workbook without triggering browser side effects.
 */
function buildGadaReportWorkbook(
  input: GadaInput,
  output: GadaOutput
): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    buildWorksheet(buildRankingSheetRows(output)),
    "Ranking & Scores"
  );
  XLSX.utils.book_append_sheet(
    workbook,
    buildWorksheet(buildCriteriaWeightsSheetRows(output)),
    "Criteria Weights"
  );
  XLSX.utils.book_append_sheet(
    workbook,
    buildWorksheet(buildConsistencySheetRows(output)),
    "Respondent Consistency"
  );
  XLSX.utils.book_append_sheet(
    workbook,
    buildWorksheet(buildAuditMatricesSheetRows(input, output)),
    "Audit Matrices"
  );

  return workbook;
}

/**
 * Exports a 4-sheet .xlsx GADA audit report and triggers a browser download.
 */
export function exportGadaOutputToExcel(
  input: GadaInput,
  output: GadaOutput,
  filename?: string
): void {
  const workbook = buildGadaReportWorkbook(input, output);
  const resolvedFilename = resolveExportFilename(input, filename);
  downloadWorkbookFile(workbook, resolvedFilename);
}
