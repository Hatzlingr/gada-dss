
# Milestone-Based Development Plan & AI Agent Tasks (5 Developers)

This execution plan uses **dependency-driven Milestones** instead of rigid day counts so every team member can work asynchronously while guaranteeing zero Git merge conflicts and fast MVP delivery.

## Dependency Flow

- **Milestone 1 (Core Foundation Gate):** Amirul builds and tests the core math engine, types, constants, and seed dataset, then merges to `main`.
- **Milestone 2 (Parallel Feature Gate — Async Branches):**
  - **Priority 1A (MVP Core):** Stevanus — UI Shell, Design System & Results Dashboard
  - **Priority 1B (MVP Core):** Fathir — Universal Excel/CSV I/O & Dynamic Data Editor
  - **Analytical Track A:** Rama — What-If Personal Simulator & Radar Comparison
  - **Analytical Track B:** Anugerah — Step-by-Step Math Audit, Consistency Monitor & Report Exporter
- **Milestone 3 (Integration, QA & Deployment Gate):** Merge branches into `main`, wire all 4 tabs in `src/app/page.tsx`, run full QA against `docs/TESTING.md`, and deploy to Vercel.
- **Milestone 4 (Academic Report & Submission Gate):** Compile Chapters 1–5 using live screenshots and exported audit matrices, plus `README.md`.

> **MVP Checkpoint:** As soon as **Amirul + Stevanus + Fathir** complete and merge their tracks, the application is already a fully working end-to-end GADA DSS usable for both the UNSRI Laundry dataset and any uploaded `.xlsx`/`.csv` dataset. Rama and Anugerah's tracks plug cleanly into Tabs 3 and 4 without blocking MVP delivery.

---

## Milestone 1: Core Foundation Gate (Owner: Amirul)

- **Prerequisite:** Project initialized (`Next.js 16`, `TypeScript`, `Tailwind`, `Vitest`, `xlsx`, `recharts`, `lucide-react`, and `shadcn/ui` primitives installed on `main`).
- **Branch:** `feat/core-engine` $\rightarrow$ merge directly into `main`
- **Owned Files:**
  - `src/lib/gada/types.ts`
  - `src/lib/gada/constants.ts`
  - `src/lib/gada/engine.ts`
  - `src/data/laundry-seed.ts`
  - `tests/gada/laundry.test.ts`

### Checklist

- [x] Verify `tsconfig.json` has `strict: true` and `noUncheckedIndexedAccess: true`, and `vitest.config.ts` resolves `@/*` to `./src/*`.
- [x] Implement all shared domain interfaces in `src/lib/gada/types.ts` and centralized defaults (binary scale, consistency thresholds, tier cutoffs) in `src/lib/gada/constants.ts` per `docs/SPEC.md`.
- [x] Implement `parseRawCell` and `runGadaAnalysis(input, overrideWeights?)` in `src/lib/gada/engine.ts` following Layer A Universal Rules and all GADA equations (log-space geometric mean, strict $> 0$ guard, toggleable zero-variance auto-elimination, per-criterion imputation).
- [x] Populate `src/data/laundry-seed.ts` with all $20$ raw laundry records (including `Pembayaran QRIS` and raw unit/time strings) and all $30$ student respondents from `docs/dataset.xlsx`.
- [x] Implement `tests/gada/laundry.test.ts` validating every ground-truth benchmark, edge case, and non-laundry dynamic matrix test listed in `docs/TESTING.md`.
- [x] **Gate Acceptance:** `npm run typecheck`, `npm run test` (15/15 passing), and `npm run lint` all passed with $0$ errors on `main` (ready to commit & push).

### Copy-Paste Prompt for Amirul's AI Agent

> Read `AGENTS.md`, `docs/SPEC.md`, and `docs/TESTING.md` carefully before writing any code. You are implementing Milestone 1 (Core Foundation Gate) for Amirul. Only create or modify: `src/lib/gada/types.ts`, `src/lib/gada/constants.ts`, `src/lib/gada/engine.ts`, `src/data/laundry-seed.ts`, and `tests/gada/laundry.test.ts`.
>
> Requirements:
>
> 1. Define all domain interfaces in `types.ts` and centralized default constants in `constants.ts` matching `docs/SPEC.md`.
> 2. Implement `engine.ts` with pure, framework-agnostic functions `parseRawCell()` and `runGadaAnalysis(input, overrideWeights?)`. Enforce the Two-Layer Preprocessing architecture (universal unit/time/boolean parsing, per-criterion missing imputation, toggleable zero-variance auto-elimination, strict $> 0$ positivity guard) and log-space geometric mean. Do not hardcode matrix dimensions or laundry-specific column names inside `engine.ts`.
> 3. Populate `src/data/laundry-seed.ts` with all 20 laundry alternatives and 30 student respondents from the Group 6 workbook, applying Layer B criterion configs (`C3` custom penalty `20000`, `C1` `penalty_max`, `C6` `min_value`, plus raw `Pembayaran QRIS`).
> 4. Write `tests/gada/laundry.test.ts` asserting every benchmark weight, consistency bound, all 20 rankings (tolerance $< 10^{-6}$), edge cases, and an arbitrary non-laundry dataset test per `docs/TESTING.md`.
> 5. Run `npm run typecheck`, `npm run test`, and `npm run lint` until everything passes with zero errors.

---

## Milestone 2: Parallel Feature Gate (Async — 4 Isolated Tracks)

- **Prerequisite:** Run `git pull origin main` after Milestone 1 is merged, then create your assigned feature branch.
- **Priority Order:** **Track 2A (Stevanus)** and **Track 2B (Fathir)** complete the core MVP first; **Track 2C (Rama)** and **Track 2D (Anugerah)** proceed concurrently.

---

### Track 2A (Priority 1A — MVP Core): UI Shell, Design System & Main Results (Owner: Stevanus)

- **Branch:** `feat/ui-results`
- **Owned Files:**
  - `src/app/globals.css`
  - `src/app/layout.tsx`
  - `src/app/page.tsx`
  - `src/components/gada/ResultsView.tsx`

#### Checklist

- [ ] Establish cohesive global design tokens, clean typography, and light/neutral palette in `src/app/globals.css` and `src/app/layout.tsx`.
- [ ] Build `src/components/gada/ResultsView.tsx` (`'use client'`) accepting `result` and optional `onExportExcel`:
  - Top 3 Podium Cards with 6-decimal $\hat{R}_j$ and tier badges.
  - KPI Summary Strip (active criteria count, auto-excluded criteria count, total alternatives, average group $\sqrt{\alpha}$).
  - Responsive Recharts horizontal `BarChart` of sorted criterion weights ($W_k\%$), distinguishing `cost` vs `benefit`.
  - Searchable, tier-filterable Ranking Leaderboard table (`rank`, `name`, `address`, 6-decimal $\hat{r}_j$, 6-decimal $\hat{R}_j$, tier badge) plus Export Excel button.
- [ ] Build `src/app/page.tsx` (`'use client'`) managing top-level `GadaInput` state (initialized with `laundrySeedInput`), safely evaluating `runGadaAnalysis(input)` inside `useMemo` with `try/catch`, displaying validation errors via `Alert` without crashing, and rendering the header bar + 4-Tab workspace (`ResultsView` wired on Tab 1; clean placeholder cards on Tabs 2–4 ready for Milestone 3 wiring).
- [ ] **Acceptance Criteria:** `npm run typecheck` and `npm run lint` pass with $0$ errors; `npm run dev` renders cleanly on desktop and mobile.

#### Copy-Paste Prompt for Stevanus's AI Agent

> Read `AGENTS.md`, `docs/SPEC.md`, `src/lib/gada/types.ts`, `src/lib/gada/constants.ts`, and `src/lib/gada/engine.ts`. You are implementing Track 2A (UI Shell & Main Results) for Stevanus. Only create or modify: `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, and `src/components/gada/ResultsView.tsx`.
>
> Requirements:
>
> 1. Configure a clean, cohesive visual theme and semantic styling in `globals.css` and `layout.tsx` using Tailwind CSS and `shadcn/ui` tokens.
> 2. Build `ResultsView.tsx` (`'use client'`) accepting `{ result: GadaOutput; onExportExcel?: () => void }`. Render: (a) Top 3 recommended alternatives podium cards, (b) KPI summary strip (active criteria, excluded criteria, total alternatives, average $\sqrt{\alpha}$), (c) responsive Recharts horizontal BarChart of sorted criterion weights (`percentage`) color-coded by `cost` vs `benefit`, and (d) a searchable, tier-filterable ranking table with 6-decimal `gadaIndex` and `relativeScore` plus an optional Export button.
> 3. Build `src/app/page.tsx` (`'use client'`) holding active `GadaInput` state initialized with `laundrySeedInput`, safely computing `runGadaAnalysis(input)` via `useMemo` with error catching, showing a top header (dataset title, live $S / M / N$ badges, "Reset UNSRI Preset" button), and a 4-Tab layout (Results, Data & Excel, Simulator & Radar, Math Audit). Mount `ResultsView` on Tab 1 and clean placeholder cards on Tabs 2–4 for Milestone 3 wiring.
> 4. Follow all UI cohesion and number formatting rules in `AGENTS.md`. Run `npm run typecheck` and `npm run lint` until zero errors.

---

### Track 2B (Priority 1B — MVP Core): Universal Excel/CSV I/O & Dynamic Data Editor (Owner: Fathir)

- **Branch:** `feat/data-editor`
- **Owned Files:**
  - `src/lib/gada/excel.ts`
  - `src/components/gada/DataEditor.tsx`

#### Checklist

- [ ] Implement `src/lib/gada/excel.ts` using `xlsx` (SheetJS):
  - `parseSpreadsheetToGadaInput(file)`: Auto-detects Mode A (Group 6 `Data Laundry` + `Bobot Kriteria` workbook) AND Mode B (any generic 1-sheet CSV or 2-sheet `.xlsx` from another domain, generating a neutral equal-weight respondent if Sheet 2 is omitted).
  - `createBlankGadaInput()`: Returns a valid minimal starter dataset ($3$ alternatives, $3$ criteria, $2$ respondents).
  - `downloadTemplateWorkbook()`: Generates and downloads a 2-sheet `.xlsx` template (`Alternatives`, `Respondents`).
- [ ] Build `src/components/gada/DataEditor.tsx` (`'use client'`) accepting `{ input, result, error, onChange, onResetPreset }`:
  - Drag-and-drop `.xlsx`/`.xls`/`.csv` upload zone with import error/success feedback.
  - Action toolbar: "Download Template (.xlsx)", "New Blank Dataset", and "Reset UNSRI Preset".
  - Preprocessing settings panel (`autoDropZeroVariance` toggle, `binaryTrueValue`, `binaryFalseValue`) + transparent alerts showing `result.excludedCriteria` and `result.imputationLogs`.
  - Three CRUD sub-tabs: **Criteria Manager** (add/delete, toggle `cost`/`benefit`, toggle `active`, select missing strategy & custom penalty), **Alternatives Matrix** ($S \times M$ inline cell editing + add/delete rows), and **Respondents Matrix** ($N \times M$ inline positive score editing + add/delete rows).
- [ ] **Acceptance Criteria:** `npm run typecheck` and `npm run lint` pass with $0$ errors; works with both Group 6 Excel and generic non-laundry spreadsheets.

#### Copy-Paste Prompt for Fathir's AI Agent

> Read `AGENTS.md`, `docs/SPEC.md`, `src/lib/gada/types.ts`, and `src/lib/gada/constants.ts`. You are implementing Track 2B (Universal Excel/CSV I/O & Dynamic Data Editor) for Fathir. Only create or modify: `src/lib/gada/excel.ts` and `src/components/gada/DataEditor.tsx`.
>
> Requirements:
>
> 1. In `src/lib/gada/excel.ts`, use `xlsx` (SheetJS) to implement: (a) `parseSpreadsheetToGadaInput(file: File): Promise<GadaInput>` supporting both Group 6's `Data Laundry` + `Bobot Kriteria` sheets and generic multi-domain `.xlsx`/`.xls`/`.csv` files per `docs/SPEC.md` Section 5.2, (b) `createBlankGadaInput(): GadaInput` returning a valid 3×3 starter dataset, and (c) `downloadTemplateWorkbook(): void` exporting a clean 2-sheet `.xlsx` template.
> 2. In `src/components/gada/DataEditor.tsx` (`'use client'`), accept `{ input: GadaInput; result: GadaOutput | null; error: string | null; onChange: (next: GadaInput) => void; onResetPreset: () => void }`. Build using `shadcn/ui` primitives: drag-and-drop spreadsheet upload, action buttons (Download Template, New Blank Dataset, Reset Preset), preprocessing controls (`autoDropZeroVariance`, binary mapping), exclusion/imputation audit alerts, and 3 interactive CRUD sub-tabs (Criteria, Alternatives, Respondents). Ensure switching criterion type to `cost` updates its default missing strategy to `penalty_max` (and `min_value` for `benefit`).
> 3. Follow all UI cohesion rules in `AGENTS.md` (use `space-y-6` and semantic Tailwind classes). Run `npm run typecheck` and `npm run lint` until zero errors.

---

### Track 2C (Analytical Track A): What-If Simulator & Radar Comparison (Owner: Rama)

- **Branch:** `feat/simulator`
- **Owned Files:**
  - `src/lib/gada/simulator.ts`
  - `src/components/gada/SimulatorView.tsx`

#### Checklist

- [ ] Implement pure helpers in `src/lib/gada/simulator.ts`:
  - `compareSimulations(input, baseResult, overrideWeights)`: Calls `runGadaAnalysis(input, overrideWeights)` and returns sorted `SimulationComparisonRow[]` with $\Delta\text{Rank} = \text{groupRank} - \text{personalRank}$.
  - `buildRadarChartData(input, result, selectedAlternativeIds)`: Scales each column of `reciprocatedMatrix` to $0$–$100$ ($z_{jk} = (r_{jk} / \max_p r_{pk}) \times 100$) for Recharts `RadarChart`.
- [ ] Build `src/components/gada/SimulatorView.tsx` (`'use client'`) accepting `{ input, baseResult }`:
  - Interactive 1–5 sliders for every active criterion showing live normalized personal weight ($W_k^{\text{sim}}\%$) + "Reset to Group Consensus" button.
  - Side-by-side Group Rank vs. Personal Rank table with color-coded $\Delta\text{Rank}$ indicators (green up, red down, neutral dash).
  - Multi-alternative selector (2–4 alternatives, defaulting to Top 3) driving a responsive Recharts `RadarChart` across all active criteria.
- [ ] **Acceptance Criteria:** `npm run typecheck` and `npm run lint` pass with $0$ errors.

#### Copy-Paste Prompt for Rama's AI Agent

> Read `AGENTS.md`, `docs/SPEC.md`, `src/lib/gada/types.ts`, and `src/lib/gada/engine.ts`. You are implementing Track 2C (What-If Simulator & Radar Comparison) for Rama. Only create or modify: `src/lib/gada/simulator.ts` and `src/components/gada/SimulatorView.tsx`.
>
> Requirements:
>
> 1. In `src/lib/gada/simulator.ts` (pure TypeScript, no React), implement `compareSimulations(input, baseResult, overrideWeights)` returning `SimulationComparisonRow[]` with `rankDelta = groupRank - personalRank`, and `buildRadarChartData(input, result, selectedAlternativeIds)` scaling each column of `result.auditTrace.reciprocatedMatrix` to 0–100 relative to its column maximum per `docs/SPEC.md` Step 4.
> 2. In `src/components/gada/SimulatorView.tsx` (`'use client'`), accept `{ input: GadaInput; baseResult: GadaOutput }`. Render: (a) 1–5 importance sliders per active criterion showing live simulated weight percentages and a "Reset to Group Consensus" button, (b) a real-time comparison table of Group Rank vs. Personal Rank with color-coded rank-delta badges, and (c) an interactive Recharts `RadarChart` allowing users to select 2–4 alternatives (default Top 3) to compare normalized profiles across all active criteria.
> 3. Follow all UI cohesion and number formatting rules in `AGENTS.md`. Run `npm run typecheck` and `npm run lint` until zero errors.

---

### Track 2D (Analytical Track B): Math Audit Trail, Consistency & Report Exporter (Owner: Anugerah)

- **Branch:** `feat/audit-export`
- **Owned Files:**
  - `src/lib/gada/exporter.ts`
  - `src/components/gada/AuditDiagnosticsView.tsx`

#### Checklist

- [ ] Implement `src/lib/gada/exporter.ts`:
  - `exportGadaOutputToExcel(input, output, filename?)`: Uses `xlsx` to download a 4-sheet workbook (`Ranking & Scores`, `Criteria Weights`, `Respondent Consistency`, `Audit Matrices`).
  - `formatMatrixAsMarkdown(headers, rows)` and `formatMatrixAsTSV(headers, rows)`: Clean string formatters for one-click clipboard copy into academic reports or spreadsheets.
- [ ] Build `src/components/gada/AuditDiagnosticsView.tsx` (`'use client'`) accepting `{ input, result }`:
  - **Respondent Consistency Monitor:** Summary KPI cards (Min $\sqrt{\alpha}$, Max $\sqrt{\alpha}$, Average $\sqrt{\alpha}$, Warning Count) + searchable table showing `name`, `signedArea` ($s_i$), `absSignedArea` ($|s_i|$), `alpha` ($\alpha_i$), `sqrtAlpha` ($\sqrt{\alpha_i}$), and color-coded status badge (`high`, `moderate`, `low_warning`).
  - **Step-by-Step Mathematical Audit Inspector:** Sub-tabs for all 6 matrices in `result.auditTrace` (`cleanedMatrix`, `betaMatrix`, `zeroPointMatrix`, `agrpcMatrix`, `thetaMatrix`, `reciprocatedMatrix`) with formula descriptions, "Copy Markdown" & "Copy TSV" clipboard buttons, and an "Export 4-Sheet Excel Report" button.
- [ ] **Acceptance Criteria:** `npm run typecheck` and `npm run lint` pass with $0$ errors.

#### Copy-Paste Prompt for Anugerah's AI Agent

> Read `AGENTS.md`, `docs/SPEC.md`, `src/lib/gada/types.ts`, and `src/lib/gada/constants.ts`. You are implementing Track 2D (Math Audit Trail, Consistency & Report Exporter) for Anugerah. Only create or modify: `src/lib/gada/exporter.ts` and `src/components/gada/AuditDiagnosticsView.tsx`.
>
> Requirements:
>
> 1. In `src/lib/gada/exporter.ts`, implement `exportGadaOutputToExcel(input, output, filename?)` using `xlsx` to export a 4-sheet `.xlsx` report (`Ranking & Scores`, `Criteria Weights`, `Respondent Consistency`, `Audit Matrices`), plus pure string helpers `formatMatrixAsMarkdown(headers, rows)` and `formatMatrixAsTSV(headers, rows)`.
> 2. In `src/components/gada/AuditDiagnosticsView.tsx` (`'use client'`), accept `{ input: GadaInput; result: GadaOutput }`. Render two sections using `shadcn/ui`: (a) Respondent Consistency Monitor with KPI summary cards (min/max/avg $\sqrt{\alpha}$, low-consistency warning count) and a searchable table displaying $s_i$, $|s_i|$, $\alpha_i$, $\sqrt{\alpha_i}$, and color-coded status badges, and (b) a Step-by-Step Math Audit Inspector with sub-tabs for all 6 matrices in `result.auditTrace` (`cleanedMatrix`, `betaMatrix`, `zeroPointMatrix`, `agrpcMatrix`, `thetaMatrix`, `reciprocatedMatrix`), formula subtitles, "Copy Markdown" / "Copy TSV" buttons with copied feedback, and an "Export 4-Sheet Excel Report" button.
> 3. Follow all UI cohesion and number formatting rules in `AGENTS.md`. Run `npm run typecheck` and `npm run lint` until zero errors.

---

## Milestone 3: Integration, E2E QA & Deployment Gate (Lead: Amirul + Stevanus)

- **Prerequisite:** All Milestone 2 branches reviewed and passing `npm run typecheck` and `npm run lint`.
- **Target Branch:** `main`

### Checklist

- [ ] Merge MVP branches first (`feat/ui-results` and `feat/data-editor`), then merge analytical branches (`feat/simulator` and `feat/audit-export`) into `main`.
- [ ] Update `src/app/page.tsx` to replace Tabs 2–4 placeholders with live `DataEditor`, `SimulatorView`, and `AuditDiagnosticsView`, and connect `exportGadaOutputToExcel` to the header and `ResultsView` export buttons.
- [ ] Run full automated verification: `npm run typecheck && npm run test && npm run lint && npm run build`.
- [ ] Complete manual QA checks from `docs/TESTING.md` Section 5 (re-uploading `METODE GADA (Kelompok 6) (1).xlsx` reproduces Rank #1 `Laundry Bedeng Putih` = `0.062660` and Top Criterion `Garansi Pakaian` = `12.85%`; uploading a generic non-laundry CSV/XLSX works smoothly).
- [ ] Deploy `main` to Vercel and share the live URL with the team.

---

## Milestone 4: Academic Report & Submission Gate (All 5 Members)

- **Prerequisite:** Live Vercel deployment & verified audit tables from Milestone 3.
- **Deliverables:** Final Report (`.docx` & `.pdf`), `README.md` (setup guide + live URL), and exported `.xlsx` proof workbook.

### Collaborative Report Split

- [ ] **Chapter 1 (Introduction) & Chapter 5 (Conclusion):** Background, problem formulation, objectives, and final summary.
- [ ] **Chapter 2 (Literature Review):** Grey System Theory & GADA methodology (Javed, Mahmoudi, & Liu, 2020).
- [ ] **Chapter 3 (Methodology & System Design):** 9 criteria + QRIS elimination, two-layer preprocessing rules, GADA equations, and web application architecture.
- [ ] **Chapter 4 (Results, Testing & Discussion):** Side-by-side validation (Excel vs. Web App), criteria priority chart, respondent consistency analysis, What-If sensitivity insights, and high-resolution screenshots of all 4 tabs.
- [ ] **Final Packaging:** Add `README.md` to repository root and verify all attachments before submission.
