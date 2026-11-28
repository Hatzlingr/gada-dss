import * as XLSX from "xlsx";
import { PERCENTAGE_SCALE } from "./constants";
import type {
  CriterionConfig,
  GadaInput,
  GadaOutput,
  RespondentItem,
} from "./types";

export type MatrixCellValue = string | number;

const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const DEFAULT_EXPORT_BASENAME = "gada-analysis-report";

type SheetCell = string | number | boolean | null;

function sanitizeCellForMarkdown(value: MatrixCellValue): string {
  return String(value)
    .replaceAll("\r\n", " ")
    .replaceAll("\n", " ")
    .replaceAll("|", "\\|");
}

function sanitizeCellForTSV(value: MatrixCellValue): string {
  return String(value)
    .replaceAll("\r\n", " ")
    .replaceAll("\n", " ")
    .replaceAll("\t", " ");
}

/**
 * Formats tabular headers and rows as a GitHub-Flavored Markdown table.
 */
export function formatMatrixAsMarkdown(
  headers: readonly string[],
  rows: ReadonlyArray<ReadonlyArray<MatrixCellValue>>
): string {
  if (headers.length === 0) {
    return "";
  }

  const headerLine = `| ${headers.map(sanitizeCellForMarkdown).join(" | ")} |`;
  const separatorLine = `| ${headers.map(() => "---").join(" | ")} |`;
  const bodyLines = rows.map((row) => {
    const cells = headers.map((_, colIdx) => {
      const cell = row[colIdx];
      return cell === undefined ? "" : sanitizeCellForMarkdown(cell);
    });
    return `| ${cells.join(" | ")} |`;
  });

  return [headerLine, separatorLine, ...bodyLines].join("\n");
}

/**
 * Formats tabular headers and rows as Tab-Separated Values (TSV) for spreadsheet paste.
 */
export function formatMatrixAsTSV(
  headers: readonly string[],
  rows: ReadonlyArray<ReadonlyArray<MatrixCellValue>>
): string {
  if (headers.length === 0) {
    return "";
  }

  const headerLine = headers.map(sanitizeCellForTSV).join("\t");
  const bodyLines = rows.map((row) =>
    headers
      .map((_, colIdx) => {
        const cell = row[colIdx];
        return cell === undefined ? "" : sanitizeCellForTSV(cell);
      })
      .join("\t")
  );

  return [headerLine, ...bodyLines].join("\n");
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
    "Recommendation Tier",
  ];

  const dataRows: SheetCell[][] = output.rankings.map((item) => [
    item.rank,
    item.alternativeId,
    item.name,
    item.address ?? "",
    item.gadaIndex,
    item.relativeScore,
    item.relativeScore * PERCENTAGE_SCALE,
    item.tier,
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

function buildConsistencySheetRows(
  input: GadaInput,
  output: GadaOutput
): SheetCell[][] {
  const respondentById = new Map<string, RespondentItem>(
    input.respondents.map((respondent) => [respondent.id, respondent])
  );

  const rows: SheetCell[][] = [
    [
      "No",
      "Respondent ID",
      "Respondent Name",
      "Faculty",
      "Major",
      "Batch",
      "Signed Area (s_i)",
      "Abs Signed Area (|s_i|)",
      "Alpha (alpha_i)",
      "Sqrt Alpha (sqrt(alpha_i))",
      "Status",
    ],
  ];

  if (output.respondentConsistency.length === 0) {
    rows.push([
      "No respondent consistency data available (override weights active or empty).",
    ]);
    return rows;
  }

  output.respondentConsistency.forEach((item, index) => {
    const meta = respondentById.get(item.respondentId);
    rows.push([
      index + 1,
      item.respondentId,
      item.name,
      meta?.faculty ?? "",
      meta?.major ?? "",
      meta?.batch !== undefined ? String(meta.batch) : "",
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
    target.push(["(Not generated — override weights active or no rows)"]);
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

  appendMatrixSection(
    rows,
    "1. Cleaned Decision Matrix (A = [a_jk])",
    "Alternative",
    criterionHeaders,
    alternativeLabels,
    output.auditTrace.cleanedMatrix
  );

  appendMatrixSection(
    rows,
    "2. Reciprocated Operator Matrix (R = [r_jk])",
    "Alternative",
    criterionHeaders,
    alternativeLabels,
    output.auditTrace.reciprocatedMatrix
  );

  appendMatrixSection(
    rows,
    "3. Preference Normalization Matrix (Beta = [beta_i(k)])",
    "Respondent",
    criterionHeaders,
    respondentLabels,
    output.auditTrace.betaMatrix
  );

  appendMatrixSection(
    rows,
    "4. Zero-Starting Point Image Matrix (X0 = [x_i^0(k)])",
    "Respondent",
    criterionHeaders,
    respondentLabels,
    output.auditTrace.zeroPointMatrix
  );

  appendMatrixSection(
    rows,
    "5. AGRPC Matrix (Epsilon = [epsilon_ij])",
    "Respondent",
    respondentLabels,
    respondentLabels,
    output.auditTrace.agrpcMatrix
  );

  appendMatrixSection(
    rows,
    "6. Weighted Individual Preference Matrix (Theta = [theta_ik])",
    "Respondent",
    criterionHeaders,
    respondentLabels,
    output.auditTrace.thetaMatrix
  );

  return rows;
}

/**
 * Builds the 4-sheet GADA report workbook without triggering browser side effects.
 */
export function buildGadaReportWorkbook(
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
    buildWorksheet(buildConsistencySheetRows(input, output)),
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
  const buffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  }) as ArrayBuffer;

  if (typeof document === "undefined") {
    return;
  }

  const blob = new Blob([buffer], { type: XLSX_MIME_TYPE });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = resolvedFilename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
