
# Software & Mathematical Specification — Dynamic GADA DSS

**References:**

1. Javed, S. A., Mahmoudi, A., & Liu, S. (2020). *Grey Absolute Decision Analysis (GADA) Method for Multiple Criteria Group Decision-Making Under Uncertainty*. International Journal of Fuzzy Systems, 22(4).
2. Group 6 Study: *Penentuan Jasa Laundry Terbaik untuk Mahasiswa Menggunakan Metode GADA* (Informatics Engineering, Universitas Sriwijaya, 2026).
3. Ground-Truth Workbook: `METODE GADA (Kelompok 6) (1).xlsx`.

---

## 1. System Scope & Architectural Principles

This application is a **dynamic, domain-agnostic Multi-Criteria Group Decision-Making (MCGDM)** web system implementing the adapted **Grey Absolute Decision Analysis (GADA)** method.

- **Method Adaptation:** Rather than requiring every decision-maker to score every alternative cell (3D matrix in the original paper), decision-makers ($N$ respondents) rate **criterion importance** on a positive scale (e.g., 1–5 Likert), while alternative performance ($S$ alternatives $\times$ $M$ criteria) comes from **objective measurements**.
- **Default Seed Preset:** Ships pre-loaded with the UNSRI Laundry dataset ($20$ alternatives, $9$ active criteria + $1$ zero-variance QRIS column, $30$ student respondents).
- **Universal Multi-Domain Support:** Zero hardcoded dimensions or column names inside the calculation engine. Any decision problem (boarding houses, cafes, vendors, laptops, scholarships) with arbitrary $S \ge 1$, $M \ge 2$, and $N \ge 1$ must work via spreadsheet upload, blank dataset creation, or live table editing.

---

## 2. Two-Layer Data Preprocessing Specification

Preprocessing separates **universal mathematical safety rules** from **dataset-specific domain configurations**.

### 2.1 Layer A — Universal Engine Rules (Applied to All Datasets)

Executed deterministically inside `src/lib/gada/engine.ts` prior to GADA math:

1. **Numeric Pass-Through:** Finite numbers pass through unchanged.
2. **Missing Value Detection:** Empty strings (`""`), hyphens (`"-"`), `null`, `undefined`, `"null"`, and `"N/A"` (case-insensitive) normalize to `null` and trigger criterion-level imputation.
3. **Boolean / Categorical Parsing:** Case-insensitive `"ya"`, `"yes"`, `"true"` map to `options.binaryTrueValue` (default `5`); `"tidak"`, `"no"`, `"false"` map to `options.binaryFalseValue` (default `1`).
4. **Time-Range Duration Parsing:** Strings matching `HH.MM - HH.MM` or `HH:MM - HH:MM` compute operating hours as `(endHour + endMin / 60) - (startHour + startMin / 60)`. If the difference is $\le 0$ (overnight range), add $24$. Example: `"07.00 - 21.30"` $\rightarrow$ `14.5`.
5. **Distance Unit Normalization:** Values suffixed with `km` (supporting `.` or `,` decimals, e.g., `"4,5 km"`) convert to meters by multiplying by $1000$ (`4500`). Values suffixed with `m` (e.g., `"800 m"`, `"3000m"`) extract the numeric value directly.
6. **General Unit & Currency Extraction:** Strip currency prefixes (`Rp`, `$`), thousand separators when formatted as rupiah/integers, and trailing text units (e.g., `"3 hari"` $\rightarrow$ `3`, `"2 kg"` $\rightarrow$ `2`).
7. **Per-Criterion Missing Imputation:**
   - `penalty_max`: Replace `null` with the maximum valid value in that criterion column.
   - `min_value`: Replace `null` with the minimum valid value in that criterion column.
   - `custom_penalty`: Replace `null` with the criterion's explicit `customPenalty` value.
   - Every imputed cell must be recorded in `imputationLogs`.
8. **Zero-Variance Auto-Elimination:** When `options.autoDropZeroVariance` is enabled, any active criterion where all $S$ cleaned values are identical (unique value count $\le 1$) is excluded from calculation and recorded in `excludedCriteria`.
9. **Strict Positivity Guard ($x > 0$):** Every cleaned active cell must satisfy $x > 0$ and be finite. Throw a descriptive validation error naming both alternative and criterion if any value is $\le 0$ or `NaN` (protects $1/a_{jk}$ and $\ln(r_{jk})$).

### 2.2 Layer B — Laundry Preset Configuration (Data-Driven Only)

Configured strictly inside `src/data/laundry-seed.ts` and auto-mapped by Group 6 Excel import (never hardcoded in `engine.ts`):

- **C1 (`Tarif Cuci Lipat`, `cost`):** `missingStrategy = penalty_max` (imputes missing `Apix Laundry` to `6000`).
- **C3 (`Tarif Paket Kilat`, `cost`):** `missingStrategy = custom_penalty`, `customPenalty = 20000` (penalizes laundries lacking express service).
- **C6 (`Batas Minimal Berat`, `cost`):** `missingStrategy = min_value` (imputes missing `"-"` to `1` kg).
- **C8 (`Layanan Antar-Jemput`, `benefit`) & C9 (`Garansi Pakaian`, `benefit`):** Binary scale mapped via centralized `options` (`Ya = 5`, `Tidak = 1`; overrides the outdated `Ya = 2` legend note in the raw Excel sheet).
- **`Pembayaran QRIS`:** Kept in the raw preset (all $20$ laundries `"Ya"`) so users visibly observe Layer A's automatic zero-variance elimination log.

---

## 3. Mathematical Formulation (GADA Algorithm)

Let $S \ge 1$ be the number of alternatives ($j = 1, \dots, S$), $M \ge 2$ be the number of active criteria after preprocessing ($k = 1, \dots, M$), and $N \ge 1$ be the number of respondents ($i = 1, \dots, N$).

### Step 1: Group Criteria Weighting ($W_k$)

1. **Preference Normalization ($\beta_i(k)$):**
   Validate every respondent score $\text{Score}_{ik} > 0$, then normalize each row so it sums to $1$:

   $$
   \beta_i(k) = \frac{\text{Score}_{ik}}{\sum_{m=1}^{M} \text{Score}_{im}}, \qquad \sum_{k=1}^{M} \beta_i(k) = 1
   $$
2. **Zero-Starting Point Image ($x_i^0(k)$) & Signed Area ($s_i$):**
   Shift each respondent's sequence relative to the first active criterion ($k = 1$):

   $$
   x_i^0(k) = \beta_i(k) - \beta_i(1), \qquad k = 1, \dots, M
   $$

   $$
   s_i = \sum_{k=2}^{M-1} x_i^0(k) + \frac{1}{2} x_i^0(M), \qquad |s_i| = \left|s_i\right|
   $$

   *(For $M = 2$, the middle sum is $0$, leaving $s_i = \frac{1}{2} x_i^0(2)$.)*
3. **AGRPC Matrix ($[\epsilon_{ij}]$) & Respondent Consistency ($\sqrt{\alpha_i}$):**
   For every respondent pair $(i, j) \in \{1, \dots, N\}^2$:

   $$
   \epsilon_{ij} = \frac{1 + |s_i| + |s_j|}{1 + |s_i| + |s_j| + |s_i - s_j|}
   $$

   $$
   \alpha_i = \frac{1}{N} \sum_{j=1}^{N} \epsilon_{ij}, \qquad \sqrt{\alpha_i} = \sqrt{\alpha_i}
   $$

   - **Consistency Status Thresholds (stored in `constants.ts`):**
     - `high`: $\alpha_i \ge 0.85$
     - `moderate`: $0.65 \le \alpha_i < 0.85$
     - `low_warning`: $\alpha_i < 0.65$ (weak group alignment; approaching theoretical lower bound $0.5$)
4. **Simulated Individual Weights ($\theta_{ik}$) & Group Consensus ($\delta(k)$):**
   Compute group consensus via **log-space geometric mean** to prevent floating-point underflow:

   $$
   \theta_{ik} = \beta_i(k) \cdot \sqrt{\alpha_i}, \qquad \delta(k) = \exp\left(\frac{1}{N} \sum_{i=1}^{N} \ln(\theta_{ik})\right)
   $$
5. **Final Normalized Criterion Weights ($W_k$):**

   $$
   W_k = \frac{\delta(k)}{\sum_{m=1}^{M} \delta(m)}, \qquad \text{Percentage}_k = W_k \times 100\%
   $$

   Rank criteria $1 \dots M$ in descending order of $W_k$.

### Step 2: Reciprocating Operator (RO) Transformation

Convert cleaned alternative matrix $A = [a_{jk}]$ ($S \times M$) into dimensionless higher-is-better matrix $R = [r_{jk}]$:

$$
r_{jk} = \begin{cases} \dfrac{1}{a_{jk}}, & \text{if criterion } k \text{ is } \texttt{cost} \\ a_{jk}, & \text{if criterion } k \text{ is } \texttt{benefit} \end{cases}
$$

### Step 3: Weighted Geometric Aggregation & Ranking

1. **GADA Index ($\hat{r}_j$) & Normalized Relative Score ($\hat{R}_j$):**
   $$
   \hat{r}_j = \exp\left(\sum_{k=1}^{M} W_k \ln(r_{jk})\right), \qquad \hat{R}_j = \frac{\hat{r}_j}{\sum_{p=1}^{S} \hat{r}_p}
   $$
2. **Ranking & Tier Classification (stored in `constants.ts`):**
   Sort descending by $\hat{R}_j$ (Rank $1$ = highest score):
   - Rank $1$–$3$: `Sangat Direkomendasikan`
   - Rank $4$–$10$: `Direkomendasikan`
   - Rank $\ge 11$: `Kurang Direkomendasikan`

### Step 4: Simulator Override & Radar Normalization

1. **Personal Weight Override:** When optional `overrideWeights` (user slider scores $u_k \in [1, 5]$) is passed to `runGadaAnalysis`, bypass respondent aggregation and compute $W_k^{\text{sim}} = u_k / \sum_{m=1}^{M} u_m$, then run Steps 2 and 3 directly.
2. **Rank Delta:** $\Delta\text{Rank}_j = \text{GroupRank}_j - \text{PersonalRank}_j$ (positive = rank improved; negative = rank dropped).
3. **Radar Profile Scaling (0–100):** For visual multi-alternative comparison across mixed units, scale each column $k$ of `reciprocatedMatrix` relative to its column maximum:
   $$
   z_{jk} = \frac{r_{jk}}{\max_{1 \le p \le S} r_{pk}} \times 100
   $$

---

## 4. Data Entity Schemas (Domain Contracts)

All modules share exact contracts defined in `src/lib/gada/types.ts` and default thresholds in `src/lib/gada/constants.ts`:

| Entity                                    | Required Fields                                                                                                                                                                                              | Optional / Notes                                                                                                                                  |
| :---------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`CriterionConfig`**             | `id`, `code`, `name`, `type` (`cost` \| `benefit`), `missingStrategy` (`penalty_max` \| `min_value` \| `custom_penalty`), `active` (boolean)                                           | `unit`, `isBinary`, `customPenalty` (number)                                                                                                |
| **`AlternativeItem`**             | `id`, `name`                                                                                                                                                                                             | `address` (or general description/notes)                                                                                                        |
| **`RespondentItem`**              | `id`, `name`                                                                                                                                                                                             | `faculty`, `major`, `batch`                                                                                                                 |
| **`GadaOptions`**                 | `binaryTrueValue` (default `5`), `binaryFalseValue` (default `1`), `autoDropZeroVariance` (default `true`)                                                                                       | Single source of truth for preprocessing behavior                                                                                                 |
| **`GadaInput`**                   | `criteria`, `alternatives`, `respondents`, `alternativeValues` ($S \times M$ map), `respondentScores` ($N \times M$ map), `options`                                                          | `datasetName`                                                                                                                                   |
| **`CriterionWeightResult`**       | `criterionId`, `code`, `name`, `type`, `simulatedDelta` ($\delta_k$), `normalizedWeight` ($W_k$), `percentage`, `rank`                                                                   | Ordered by active criteria index; `rank` denotes priority $1 \dots M$                                                                         |
| **`RespondentConsistencyResult`** | `respondentId`, `name`, `signedArea` ($s_i$), `absSignedArea` ($|s_i|$), `alpha` ($\alpha_i$), `sqrtAlpha` ($\sqrt{\alpha_i}$), `status` (`high` \| `moderate` \| `low_warning`) | Used in KPI averages and Audit Diagnostics                                                                                                        |
| **`AlternativeRankingResult`**    | `alternativeId`, `name`, `gadaIndex` ($\hat{r}_j$), `relativeScore` ($\hat{R}_j$), `rank`, `tier`                                                                                            | `address`; sorted descending by `relativeScore`                                                                                               |
| **`GadaOutput`**                  | `activeCriteria`, `excludedCriteria`, `imputationLogs`, `criteriaWeights`, `respondentConsistency`, `rankings`, `auditTrace`                                                                   | `auditTrace` holds 6 matrices: `cleanedMatrix`, `betaMatrix`, `zeroPointMatrix`, `agrpcMatrix`, `thetaMatrix`, `reciprocatedMatrix` |
| **`SimulationComparisonRow`**     | `alternativeId`, `name`, `groupRank`, `personalRank`, `rankDelta`, `groupScore`, `personalScore`                                                                                               | Produced by `src/lib/gada/simulator.ts`                                                                                                         |

---

## 5. Module Behavioral Specifications

### 5.1 Core Math Engine (`src/lib/gada/engine.ts` — Amirul)

- Exposes `parseRawCell` (for granular unit testing) and `runGadaAnalysis(input, overrideWeights?)`.
- Pure deterministic logic: zero React, DOM, or external side effects.
- Throws clear, human-readable validation errors on invalid dimensions ($M < 2$, $S < 1$, $N < 1$) or non-positive values ($\le 0$).

### 5.2 Universal Spreadsheet I/O (`src/lib/gada/excel.ts` — Fathir)

- **Import (`parseSpreadsheetToGadaInput`):** Accepts any `.xlsx`, `.xls`, or `.csv` file:
  - **Auto-Detect Mode A (Group 6 Survey Workbook):** If sheets named `Data Laundry` and `Bobot Kriteria` exist (case-insensitive), automatically maps `C1`–`C6` (`cost`), `C7`–`C9` (`benefit`), `Pembayaran QRIS` (binary candidate), `C3` `customPenalty = 20000`, `C1` `penalty_max`, and `C6` `min_value`.
  - **Auto-Detect Mode B (Generic Multi-Domain File):**
    - **Sheet 1 (Alternatives):** Column 1 = Alternative Name; if Column 2 header matches `alamat`/`address`/`deskripsi`/`description`/`catatan`, map to `address`; remaining columns become criteria `C1..CM`. Auto-flag `isBinary` if all non-empty entries are boolean words. Default new criteria to `benefit` (`min_value`); toggling to `cost` in UI switches default missing strategy to `penalty_max`.
    - **Sheet 2 (Respondents — Optional):** Column 1 = Respondent Name; remaining columns = positive criterion importance scores. If absent (e.g., single-sheet CSV), auto-generate 1 neutral respondent (`"Default Equal Weight"`, score `3` for every criterion) so ranking runs immediately.
- **Blank Dataset & Template Helpers:**
  - `createBlankGadaInput()`: Returns a valid minimal starter dataset ($3$ alternatives, $3$ criteria: $1$ `cost` + $2$ `benefit`, $2$ respondents).
  - `downloadTemplateWorkbook()`: Generates and downloads a clean 2-sheet `.xlsx` template (`Alternatives`, `Respondents`).

### 5.3 Simulator & Radar Helpers (`src/lib/gada/simulator.ts` — Rama)

- `compareSimulations(input, baseResult, overrideWeights)`: Runs personal simulation via `runGadaAnalysis` and maps each alternative to `SimulationComparisonRow` with $\Delta\text{Rank}$.
- `buildRadarChartData(input, result, selectedAlternativeIds)`: Converts `reciprocatedMatrix` columns into $0$–$100$ normalized records ready for Recharts `RadarChart`.

### 5.4 Report Exporter (`src/lib/gada/exporter.ts` — Anugerah)

- `exportGadaOutputToExcel(input, output, filename?)`: Downloads a 4-sheet `.xlsx` report containing: (1) `Ranking & Scores`, (2) `Criteria Weights`, (3) `Respondent Consistency`, and (4) `Audit Matrices` (Cleaned & RO matrices).
- `formatMatrixAsMarkdown(headers, rows)` & `formatMatrixAsTSV(headers, rows)`: Formats any audit matrix for one-click clipboard copy into academic reports or spreadsheets.

---

## 6. User Interface Functional Specification (4-Tab Workspace)

The root workspace (`src/app/page.tsx`, owned by **Stevanus**) holds active `GadaInput` state (initialized with `laundrySeedInput`), safely runs `runGadaAnalysis` on every state change, surfaces validation errors in a global banner without crashing the app, and renders a unified header (dataset title, live $S / M / N$ badges, "Reset UNSRI Preset", "Export Excel") above **4 main tabs**:

1. **Tab 1 — Results & Charts (`ResultsView.tsx` — Stevanus):**
   - Inputs: `result`, optional `onExportExcel` callback.
   - Features: Top 3 podium cards (6-decimal $\hat{R}_j$ & tier badge), KPI summary strip (active criteria, excluded criteria, total alternatives, average $\sqrt{\alpha}$), Recharts horizontal bar chart of sorted criterion weights ($W_k\%$, color-coded `cost` vs `benefit`), and a searchable, tier-filterable ranking leaderboard table.
2. **Tab 2 — Data & Excel Manager (`DataEditor.tsx` — Fathir):**
   - Inputs: `input`, `result` (nullable), `error` (nullable), `onChange`, `onResetPreset`.
   - Features: Drag-and-drop `.xlsx`/`.xls`/`.csv` upload, "Download Template (.xlsx)", "New Blank Dataset", "Reset UNSRI Preset", preprocessing setting controls (`autoDropZeroVariance`, `binaryTrueValue`, `binaryFalseValue`), transparent alerts listing `excludedCriteria` and `imputationLogs`, and 3 CRUD sub-tabs (Criteria Manager, Alternatives Matrix $S \times M$, Respondents Matrix $N \times M$).
3. **Tab 3 — Simulator & Radar (`SimulatorView.tsx` — Rama):**
   - Inputs: `input`, `baseResult`.
   - Features: Interactive 1–5 sliders per active criterion displaying live simulated weight percentage $W_k^{\text{sim}}\%$ with "Reset to Group Consensus", side-by-side Group vs. Personal Rank table with color-coded $\Delta\text{Rank}$ badges, and an interactive Recharts `RadarChart` comparing 2–4 user-selected alternatives (defaulting to Top 3).
4. **Tab 4 — Math Audit & Consistency (`AuditDiagnosticsView.tsx` — Anugerah):**
   - Inputs: `input`, `result`.
   - Features: Respondent Consistency Monitor (Min/Max/Avg $\sqrt{\alpha}$, warning count, searchable table of $s_i, |s_i|, \alpha_i, \sqrt{\alpha_i}$, status badges) + Step-by-Step Mathematical Audit Inspector with sub-tabs for all 6 matrices in `auditTrace`, formula subtitles, "Copy Markdown" / "Copy TSV" clipboard buttons, and "Export 4-Sheet Excel Report".
