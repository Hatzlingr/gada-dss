<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Project Agent Rules — Dynamic GADA Decision Support System (Group 6)

## 1. Project Overview

A dynamic, domain-agnostic web-based Decision Support System (DSS / SPK) implementing the adapted **Grey Absolute Decision Analysis (GADA)** method (Javed, Mahmoudi, & Liu, 2020; adapted by Group 6, Department of Informatics Engineering, Universitas Sriwijaya, 2026).

- **Default Seed Preset:** Evaluating $20$ laundry services around Universitas Sriwijaya across $9$ active decision criteria ($6$ `cost`, $3$ `benefit`) weighted by consensus from $30$ student respondents (1–5 Likert scale).
- **Universal Multi-Domain Generality:** The application is **not** restricted to laundry data. Users can evaluate any multi-criteria decision problem (e.g., boarding houses, cafes, vendors, laptops, scholarships) with arbitrary matrix dimensions ($S \ge 1$ alternatives, $M \ge 2$ active criteria, $N \ge 1$ respondents) via universal `.xlsx`/`.csv` upload, a "New Blank Dataset" workflow, or live CRUD table editing.

## 2. Tech Stack & Project Configuration

- **Framework:** Next.js 16 (App Router) with `src/` directory and `@/*` import alias
- **Language:** TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`)
- **UI & Styling:** Tailwind CSS + `shadcn/ui` + `lucide-react`
- **Charts:** `recharts`
- **Spreadsheet I/O:** SheetJS (`xlsx`)
- **Testing:** `vitest`

## 3. Mandatory Verification Commands

Before marking any task complete or opening a Pull Request, run all applicable checks and confirm zero errors:

```bash
npm run typecheck   # tsc --noEmit (MUST pass with 0 errors)
npm run test        # vitest run (MUST pass all ground-truth & edge-case tests)
npm run lint        # eslint (MUST pass with 0 errors)
npm run build       # next build (Required before Milestone 3 integration merge)
```

## 4. Strict File Ownership — Balanced Full-Stack Verticals (5 Developers)

All 5 team members collaborate asynchronously in parallel using AI coding agents. **You MUST only create or modify files assigned to your role to guarantee zero Git merge conflicts:**

### Milestone 1 — Core Foundation Gate (Blocking Prerequisite)

- **Amirul (Tech Lead & Math Core):**
  - `src/lib/gada/types.ts`
  - `src/lib/gada/constants.ts`
  - `src/lib/gada/engine.ts`
  - `src/data/laundry-seed.ts`
  - `tests/gada/laundry.test.ts`

### Milestone 2 — Parallel Feature Gate (Async Feature Branches)

- **Stevanus (Priority 1A — UI Shell, Design System & Main Results):**
  - `src/app/globals.css`
  - `src/app/layout.tsx`
  - `src/app/page.tsx`
  - `src/components/gada/ResultsView.tsx`
- **Fathir (Priority 1B — Universal Data Pipeline & Data Editor):**
  - `src/lib/gada/excel.ts`
  - `src/components/gada/DataEditor.tsx`
- **Rama (Analytical Track A — What-If Simulator & Radar Comparison):**
  - `src/lib/gada/simulator.ts`
  - `src/components/gada/SimulatorView.tsx`
- **Anugerah (Analytical Track B — Math Audit Trail, Consistency & Report Exporter):**
  - `src/lib/gada/exporter.ts`
  - `src/components/gada/AuditDiagnosticsView.tsx`

> **Shared UI Primitives Rule:** All `shadcn/ui` components under `src/components/ui/` are installed once on `main` before Milestone 2 begins. Do not modify files inside `src/components/ui/` within feature branches.

## 5. Architecture & Coding Conventions

1. **Pure Logic Isolation:** All mathematical computations, preprocessing, spreadsheet parsing, simulation deltas, and formatting helpers MUST reside inside `src/lib/gada/` with zero React or Next.js dependencies. (Only the browser download trigger inside `src/lib/gada/exporter.ts` may access DOM/Blob APIs.)
2. **Strict TypeScript Discipline:** Never use `any`, `@ts-ignore`, or unsafe non-null assertions without guards. Always handle `undefined` safely under `noUncheckedIndexedAccess: true` when indexing matrices (`matrix[i]?.[j]`).
3. **Single Source of Truth:** Default binary scale mappings (`Ya = 5`, `Tidak = 1`), consistency status thresholds, and recommendation tier cutoffs MUST live exclusively in `src/lib/gada/constants.ts`. Never hardcode them inside UI components.
4. **Two-Layer Preprocessing Separation:**
   - **Layer A — Universal Engine Rules** (strict positivity guard, zero-variance detection, generic unit/time/boolean parsing, type-aware default missing-value imputation) apply automatically to **all** datasets inside `engine.ts`.
   - **Layer B — Domain-Specific Rules** (e.g., `customPenalty = 20000` for Express laundry tariff) MUST be configured per-criterion inside `CriterionConfig` (in seed data or Excel importer), never hardcoded inside `engine.ts`.
5. **No Hardcoded Dimensions:** Never assume $S = 20$, $M = 9$, or $N = 30$ anywhere in `src/lib/gada/*` or `src/components/gada/*`.
6. **Next.js 16 Client Boundaries:** Add `'use client'` at the top of interactive UI components inside `src/components/gada/` and client page shells. Keep `src/lib/gada/*` completely framework-agnostic.

## 6. UI Visual Cohesion Rules (Anti-Frankenstein Protocol)

- **Global Theme Owner:** Stevanus defines the design tokens, typography, and color palette in `src/app/globals.css` and `src/app/layout.tsx`.
- **Standardized Components:** Every feature tab (`ResultsView`, `DataEditor`, `SimulatorView`, `AuditDiagnosticsView`) MUST use `shadcn/ui` primitives (`Card`, `Table`, `Tabs`, `Badge`, `Button`, `Input`, `Select`, `Slider`, `Alert`, `Separator`) and Tailwind semantic classes (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`).
- **Layout Rhythm:** Use `space-y-6` for vertical section spacing inside every tab component and responsive grids (`grid-cols-1 md:grid-cols-3`, etc.) so all 4 tabs appear visually unified inside `src/app/page.tsx`.
- **Number Formatting:** Format GADA indexes ($\hat{r}_j$) and relative scores ($\hat{R}_j$) to $6$ decimal places (`0.062660`), criterion weight percentages to $2$ decimal places (`12.85%`), and consistency metrics ($\alpha_i, \sqrt{\alpha_i}$) to $4$ decimal places in summary tables (and up to $6$ decimals in the Audit Inspector).

## 7. Critical Mathematical Guardrails

1. **Log-Space Geometric Mean:** Always compute weighted and unweighted geometric means using `Math.exp(sum(w_k * Math.log(x)))` to prevent floating-point underflow on small reciprocated values (e.g., $1/20000 = 0.00005$).
2. **Strict Positivity Guard ($x > 0$):** Because GADA relies on the Reciprocating Operator ($1/a_{jk}$) and natural logarithms ($\ln(r_{jk})$), validate that every cleaned active numeric value is strictly $> 0$ and finite. Throw a clear, descriptive `Error` identifying both the offending alternative and criterion if $\le 0$ or `NaN` is encountered.
3. **Automatic Zero-Variance Elimination:** When `options.autoDropZeroVariance` is `true`, automatically exclude any active criterion where all alternatives have identical cleaned values (unique count $\le 1$) and record it in `excludedCriteria`.
4. **No Division by Zero on Uniform Respondents:** A respondent assigning identical scores across all criteria produces $x_i^0 = [0, \dots, 0]$ and $s_i = 0$. Because the AGRPC denominator is $1 + |s_i| + |s_j| + |s_i - s_j| \ge 1$, it must execute cleanly without producing `NaN`.

## 8. Documentation Map

Always consult these documents before writing code:

- `docs/SPEC.md` — Complete mathematical formulas, two-layer preprocessing rules, TypeScript contracts, module APIs, and React component prop interfaces.
- `docs/TASKS.md` — Milestone-based execution plan (Dependency Gates) and copy-paste AI prompts for all 5 team members.
- `docs/TESTING.md` — Exact ground-truth benchmark values from the Group 6 Excel workbook & PPT plus mandatory edge-case and multi-domain QA checklists.
