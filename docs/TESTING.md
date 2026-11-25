
# Ground-Truth Benchmarks & Verification Suite — Dynamic GADA DSS

This document defines the exact numerical ground truth, edge-case unit tests, and end-to-end QA criteria used to verify the GADA calculation engine and all feature modules.

**Primary Sources:**

- `METODE GADA (Kelompok 6) (1).xlsx`
- `PPT_GADA_Laundry_Kelompok6 (1).pptx`

---

## 1. Automated Verification Targets

Run all automated tests with:

```bash
npm run test        # vitest run
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
```

- **Primary Test File:** `tests/gada/laundry.test.ts` (owned by **Amirul** in Milestone 1).
- **Numerical Tolerance:**
  - $< 10^{-6}$ for `simulatedDelta` ($\delta_k$), `normalizedWeight` ($W_k$), `sqrtAlpha` ($\sqrt{\alpha_i}$), `gadaIndex` ($\hat{r}_j$), and `relativeScore` ($\hat{R}_j$).
  - $< 10^{-2}$ for formatted `percentage` ($W_k \times 100\%$).

---

## 2. Two-Layer Preprocessing Assertions (Default UNSRI Laundry Preset)

When `runGadaAnalysis(laundrySeedInput)` executes on the $20$ raw laundry records:

1. **Layer A — Automatic Zero-Variance Elimination:**
   - Criterion `Pembayaran QRIS` (all $20$ values equal `"Ya"` $\rightarrow$ `5`) MUST be excluded automatically when `options.autoDropZeroVariance === true`.
   - `result.excludedCriteria` MUST contain an entry for `Pembayaran QRIS` with a zero-variance reason.
   - `result.activeCriteria.length` MUST equal `9` (`C1` through `C9`).
2. **Layer B — Criterion-Level Imputation Logs (`result.imputationLogs`):**
   - `C1` (`Apix Laundry`, raw `"-"`): imputed to `6000` (`penalty_max`).
   - `C3` (`Laundry Pangeran`, `Mely Laundry`, `Zeva Laundry`, `Rolansa Laundry`, raw `"-"`): imputed to `20000` (`custom_penalty`).
   - `C6` (`Laundry Neng Emi`, `Nayla Laundry`, `Sahabat Laundry`, raw `"-"`): imputed to `1` (`min_value`).
3. **Universal Raw Cell Parser (`parseRawCell`):**
   - Distance units: `"800 m"` $\rightarrow$ `800`, `"3000m"` $\rightarrow$ `3000`, `"4.5 km"` / `"4,5 km"` $\rightarrow$ `4500`.
   - Duration units: `"3 hari"` $\rightarrow$ `3`, `"2 kg"` $\rightarrow$ `2`.
   - Time ranges: `"08.00 - 18.00"` $\rightarrow$ `10`, `"07.00 - 21.30"` $\rightarrow$ `14.5`, `"09:00-18:00"` $\rightarrow$ `9`, overnight `"22.00 - 06.00"` $\rightarrow$ `8`.
   - Binary mapping: `"Ya"` / `"yes"` / `"true"` $\rightarrow$ `options.binaryTrueValue` (default `5`); `"Tidak"` / `"no"` / `"false"` $\rightarrow$ `options.binaryFalseValue` (default `1`).
   - Missing markers: `""`, `"-"`, `"N/A"`, `"null"`, `null`, `undefined` $\rightarrow$ `null`.

---

## 3. Ground-Truth Criteria Weights ($30$ Student Respondents)

Expected values for `result.criteriaWeights` on the UNSRI Laundry preset:

| Code         | Criterion Name       | Type        | Simulated $\delta(k)$ | Normalized $W_k$ | Percentage | Weight Rank |
| :----------- | :------------------- | :---------- | :---------------------: | :----------------: | :--------: | :---------: |
| **C1** | Tarif Cuci Lipat     | `cost`    |    `0.09540558445`    |    `0.106332`    | `10.63%` |      7      |
| **C2** | Tarif Cuci Setrika   | `cost`    |    `0.10123538456`    |    `0.112830`    | `11.28%` |      4      |
| **C3** | Tarif Paket Kilat    | `cost`    |    `0.09161459592`    |    `0.102107`    | `10.21%` |      9      |
| **C4** | Jarak dari Kampus    | `cost`    |    `0.10261291984`    |    `0.114366`    | `11.44%` |      3      |
| **C5** | Durasi Pengerjaan    | `cost`    |    `0.09338861175`    |    `0.104083`    | `10.41%` |      8      |
| **C6** | Batas Minimal Berat  | `cost`    |    `0.09606307914`    |    `0.107065`    | `10.71%` |      6      |
| **C7** | Jam Operasional      | `benefit` |    `0.09763558427`    |    `0.108817`    | `10.88%` |      5      |
| **C8** | Layanan Antar-Jemput | `benefit` |    `0.10402543651`    |    `0.115938`    | `11.59%` |      2      |
| **C9** | Garansi Pakaian      | `benefit` |    `0.11526279091`    |    `0.128462`    | `12.85%` |      1      |

- **Sum Invariant:** $\sum_{k=1}^{9} W_k = 1.000000$ (tolerance $< 10^{-9}$).

---

## 4. Ground-Truth Respondent Consistency Benchmarks

Expected metrics for `result.respondentConsistency` across all $30$ respondents:

- **Global Bounds:**
  - $\alpha_i \in [0.745806,\; 0.892546]$
  - $\sqrt{\alpha_i} \in [0.863601,\; 0.944746]$
  - Every pairwise entry in `auditTrace.agrpcMatrix` satisfies $0.5 < \epsilon_{ij} \le 1$, symmetry $\epsilon_{ij} = \epsilon_{ji}$, and unit diagonal $\epsilon_{ii} = 1$.
- **Exact Spot Checks (tolerance $< 10^{-6}$):**
  - Respondent #1 (`R`): $s_1 = -0.08$, $|s_1| = 0.08$, $\sqrt{\alpha_1} = 0.9404015995$
  - Respondent #2 (`Revita Agustin` — uniform scores): $s_2 = 0.00$, $|s_2| = 0.00$, $\sqrt{\alpha_2} = 0.9447463221$
  - Respondent #6 (`Anis`): $s_6 = -0.36$, $|s_6| = 0.36$, $\sqrt{\alpha_6} = 0.8960050902$

---

## 5. Ground-Truth Alternative Rankings (All $20$ Laundries)

Expected values for `result.rankings` (sorted descending by `relativeScore` $\hat{R}_j$):

|     Rank     | Alternative Name               | $\hat{r}_j$ (`gadaIndex`) | $\hat{R}_j$ (`relativeScore`) | Recommendation Tier     |
| :----------: | :----------------------------- | :---------------------------: | :-------------------------------: | :---------------------- |
| **1** | **Laundry Bedeng Putih** |         `0.047294`         |           `0.062660`           | Sangat Direkomendasikan |
| **2** | **Laundry Mbak Vivin**   |         `0.046062`         |           `0.061027`           | Sangat Direkomendasikan |
| **3** | **Express Pro Laundry**  |         `0.045893`         |           `0.060804`           | Sangat Direkomendasikan |
| **4** | Para Laundry                   |         `0.045431`         |           `0.060192`           | Direkomendasikan        |
| **5** | Laundry Neng Emi               |         `0.044375`         |           `0.058792`           | Direkomendasikan        |
| **6** | Sahabat Laundry                |         `0.043984`         |           `0.058274`           | Direkomendasikan        |
| **7** | Nayla Laundry                  |         `0.040387`         |           `0.053509`           | Direkomendasikan        |
| **8** | Cekgu Laundry                  |         `0.039541`         |           `0.052388`           | Direkomendasikan        |
| **9** | Mely Laundry                   |         `0.039489`         |           `0.052318`           | Direkomendasikan        |
| **10** | Ama Laundry                    |         `0.037672`         |           `0.049911`           | Direkomendasikan        |
| **11** | Silvy Laundry                  |         `0.037263`         |           `0.049369`           | Kurang Direkomendasikan |
| **12** | Azka Laundry                   |         `0.037025`         |           `0.049054`           | Kurang Direkomendasikan |
| **13** | Laundry Pangeran               |         `0.035437`         |           `0.046950`           | Kurang Direkomendasikan |
| **14** | Sanshan Laundry                |         `0.032842`         |           `0.043512`           | Kurang Direkomendasikan |
| **15** | Pasti Fresh Laundry            |         `0.032252`         |           `0.042731`           | Kurang Direkomendasikan |
| **16** | Apix Laundry                   |         `0.030990`         |           `0.041059`           | Kurang Direkomendasikan |
| **17** | Rolansa Laundry                |         `0.030250`         |           `0.040079`           | Kurang Direkomendasikan |
| **18** | DMA Laundry                    |         `0.029855`         |           `0.039555`           | Kurang Direkomendasikan |
| **19** | Zeva Laundry                   |         `0.029791`         |           `0.039471`           | Kurang Direkomendasikan |
| **20** | **Kaysha Laundry**       |         `0.028940`         |           `0.038343`           | Kurang Direkomendasikan |

- **Sum Invariant:** $\sum_{j=1}^{20} \hat{R}_j = 1.000000$ (tolerance $< 10^{-9}$).
- **Spot Check RO Values (`Laundry Bedeng Putih`):** $r_{1,1} = 1/4500 \approx 0.000222$, $r_{1,4} = 1/800 = 0.001250$, $r_{1,7} = 10.0$, $r_{1,8} = 5$, $r_{1,9} = 5$.

---

## 6. Mandatory Edge-Case & Multi-Domain Unit Tests

Every case below MUST be covered in `tests/gada/laundry.test.ts`:

1. **Strict Positivity Guard ($x \le 0$):**
   - Passing `0` or `-50` in any active alternative cell MUST throw an error naming both the alternative and criterion.
   - Passing `0` or `-1` in any respondent score MUST throw a descriptive validation error.
2. **Minimum Dimension Guards:**
   - Fewer than $2$ active criteria ($M < 2$, either initially or after zero-variance elimination) MUST throw an error.
   - Empty alternatives ($S = 0$) or empty respondents ($N = 0$ without `overrideWeights`) MUST throw an error.
3. **Uniform Respondent Stability:**
   - A respondent with identical scores across all criteria (e.g., `[5, 5, ..., 5]`) produces $x_i^0 = [0, \dots, 0]$, $s_i = 0$, and finite $\alpha_i > 0.5$ with zero `NaN` values.
4. **Arbitrary Non-Laundry Multi-Domain Dataset:**
   - Execute `runGadaAnalysis` on a completely unrelated synthetic dataset (e.g., $S = 3$ boarding houses, $M = 4$ criteria mixing `cost`/`benefit`, $N = 2$ respondents) and verify valid normalized weights ($\sum W_k = 1$), valid rankings ($\sum \hat{R}_j = 1$), and zero hardcoded column dependencies.
5. **Simulator Weight Override (`overrideWeights`):**
   - Passing equal slider values (`3` across all active criteria) produces uniform weights $W_k^{\text{sim}} = 1/M$ and deterministic sorted rankings.
   - Shifting a single criterion slider to `5` while keeping others at `1` shifts rankings toward alternatives strongest on that criterion.
6. **Minimum Criteria Boundary ($M = 2$):**
   - Verify signed area calculation when $M = 2$ (empty middle sum): $s_i = \frac{1}{2} x_i^0(2)$.

---

## 7. Milestone 3 End-to-End & Spreadsheet QA Checklist

Before deploying `main` to Vercel, verify all items manually in the running app (`npm run dev` / `npm run build && npm run start`):

- [ ] **Preset Boot Check:** Opening `/` immediately renders Top 3 (`Laundry Bedeng Putih`, `Laundry Mbak Vivin`, `Express Pro Laundry`), Top Weight (`Garansi Pakaian` = `12.85%`), and an audit notice confirming `Pembayaran QRIS` was auto-dropped.
- [ ] **Group 6 Excel Re-Upload:** Uploading `METODE GADA (Kelompok 6) (1).xlsx` in Tab 2 (`Data & Excel`) reproduces the exact Rank #1 (`0.062660`) through Rank #20 (`0.038343`) results.
- [ ] **Generic Non-Laundry Upload:** Uploading a generic 1-sheet `.csv` or 2-sheet `.xlsx` (e.g., 4 laptops or 5 boarding houses) loads cleanly without crashing, allows toggling `cost`/`benefit` in `DataEditor`, and updates Tabs 1, 3, and 4 immediately.
- [ ] **Blank Dataset & Live CRUD:** Clicking "New Blank Dataset" loads a valid 3×3 starter table; adding/editing/deleting criteria, alternatives, and respondents updates rankings in real time. Entering `0` triggers a non-crashing validation `Alert` banner.
- [ ] **Simulator & Radar Check:** Adjusting sliders in Tab 3 updates $\Delta\text{Rank}$ badges instantaneously; selecting 2–4 alternatives renders normalized $0$–$100$ polygons in the Recharts `RadarChart`; clicking "Reset to Group Consensus" restores zero deltas.
- [ ] **Audit & Export Check:** All 6 matrices display cleanly in Tab 4; "Copy Markdown" and "Copy TSV" copy valid tables to clipboard; "Export 4-Sheet Excel Report" downloads a valid `.xlsx` file readable in Excel/Google Sheets.
