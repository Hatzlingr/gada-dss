# Dynamic GADA Decision Support System (DSS)

Implementasi web Sistem Pendukung Keputusan (SPK) multi-kriteria yang **universal (domain-agnostik)** berbasis metode **Grey Absolute Decision Analysis (GADA)** (Javed, Mahmoudi, & Liu, 2020; diadaptasi oleh Kelompok 6, Teknik Informatika, Universitas Sriwijaya, 2026).

Aplikasi ini dapat digunakan untuk mengevaluasi **dataset apa saja** ($S \ge 1$ alternatif, $M \ge 2$ kriteria aktif, $N \ge 1$ responden) melalui unggahan `.xlsx`/`.xls`/`.csv` sesuai template maupun input manual langsung di editor.

---

## Fitur Utama

1. **Layar Awal Netral & Input Fleksibel:**
   - **Unggah Excel / CSV:** Mendukung file 1-sheet (`.csv`/`.xlsx`) maupun 2-sheet (`Alternatif` + `Responden`) dengan deteksi opsional tag tipe `(Cost)` / `(Benefit)` pada header kriteria.
   - **Template & Input Manual:** Tersedia tombol *Download Template (.xlsx)* (`Template_Dataset_GADA.xlsx`) dan pembuat matriks starter `3 × 3` untuk langsung diisi di editor.
2. **Preprocessing Dua Lapis Otomatis (`src/lib/gada/engine.ts`):**
   - Normalisasi satuan jarak (`m`/`km`), durasi/berat (`hari`, `kg`, `Rp`), rentang jam buka (`07.00 - 21.30` → `14.5`), serta data biner (`Ya = 5`, `Tidak = 1`).
   - Imputasi nilai kosong per kriteria (`penalty_max`, `min_value`, `mean`, `custom_penalty`).
   - Eliminasi otomatis kriteria bernilai seragam (varians nol), seperti `Pembayaran QRIS` pada studi kasus laundry.
   - Validasi ketat nilai $> 0$ dan agregasi geometrik dalam ruang logaritma (*log-space*).
3. **Hasil, Visualisasi & Audit Matematis 6 Tahap:**
   - Grafik interaktif Recharts untuk **Bobot Konsensus Kriteria ($W_k\%$)** dan **Top Alternatif ($\hat{R}_j$)**.
   - Tabel peringkat lengkap ($\hat{r}_j$, $\hat{R}_j$, persentase skor).
   - Monitor Konsistensi Responden ($s_i$, $|s_i|$, $\alpha_i$, $\sqrt{\alpha_i}$) dan Inspektor 6 Matriks Audit (`Cleaned`, `Beta`, `Zero-Point`, `AGRPC`, `Theta`, `RO`) dengan tombol salin Markdown/TSV.
   - **Export Excel 4-Sheet** (`Ranking & Scores`, `Criteria Weights`, `Respondent Consistency`, `Audit Matrices`).

---

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`)
- **UI & Styling:** Tailwind CSS v4 + `shadcn/ui` + `lucide-react`
- **Visualisasi:** `recharts`
- **Spreadsheet I/O:** SheetJS (`xlsx`)
- **Testing:** `vitest`

---

## Menjalankan Secara Lokal

```bash
# 1. Install dependensi
npm install

# 2. Jalankan development server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

### Perintah Verifikasi

```bash
npm run typecheck   # Validasi TypeScript (tsc --noEmit)
npm run test        # Menjalankan 15 unit test & benchmark ground-truth (vitest run)
npm run lint        # Pemeriksaan ESLint
npm run build       # Build produksi Next.js
```

---

## Struktur Direktori Inti

```text
src/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                          # Shell welcome screen & workspace 3 tab
├── components/gada/
│   ├── WelcomeScreen.tsx                 # Layar awal netral (Upload / Manual / Studi Kasus)
│   ├── DataEditor.tsx                    # Impor spreadsheet & editor CRUD dinamis
│   ├── ResultsView.tsx                   # Ringkasan hasil, grafik, & tabel peringkat
│   └── AuditDiagnosticsView.tsx          # Konsistensi AGRPC & inspektor matriks 6 tahap
├── data/
│   └── laundry-seed.ts                   # Fixture studi kasus untuk unit test benchmark
└── lib/gada/
    ├── types.ts                          # Kontrak tipe domain GADA
    ├── constants.ts                      # Konstanta & ambang batas terpusat
    ├── engine.ts                         # Mesin perhitungan & preprocessing GADA
    ├── excel.ts                          # Parser Excel/CSV & generator template
    └── exporter.ts                       # Ekspor laporan Excel 4-sheet & Markdown/TSV
tests/
└── gada/
    └── laundry.test.ts                   # Benchmark ground-truth & uji edge-case
```
