# Rencana Revisi & Perampingan — Dynamic GADA DSS

Dokumen ini menjadi acuan terarah untuk merampingkan **GADA DSS** agar lebih *to the point* sebagai **implementasi perhitungan metode Grey Absolute Decision Analysis (GADA) yang universal (bisa digunakan untuk data apa saja)**, sekaligus tetap mendukung studi kasus Kelompok 6 (Laundry UNSRI), penyusunan laporan, dan demo presentasi PPT.

---

## 1. Latar Belakang & Tujuan Revisi

Saat ini seluruh modul pada spesifikasi awal (`docs/SPEC.md` & `docs/TASKS.md`) telah selesai dibangun, namun muncul tiga masalah praktis untuk kebutuhan tugas dan presentasi:

1. **Kesan Terkunci ke Satu Studi Kasus:** Saat aplikasi pertama kali dibuka (`src/app/page.tsx`), state awal langsung memuat `laundrySeedInput` dan menampilkan hasil laundry, sehingga terasa seperti aplikasi khusus laundry alih-alih sistem SPK generik.
2. **Kode UI Terlalu Gemuk & Redundan:** Total komponen UI mencapai ~4.479 baris dengan banyak duplikasi antar-tab (tombol Export Excel muncul di 4 tempat, log preprocessing muncul berulang, serta beberapa kartu ringkasan dan form metadata mahasiswa yang spesifik domain).
3. **Fitur Tambahan di Luar Inti GADA:** Tab *Simulator & Radar* (`SimulatorView.tsx` + `simulator.ts`, total 1.229 baris) menggunakan `overrideWeights` yang melewati perhitungan konsensus AGRPC responden, sehingga kurang selaras jika tujuan utamanya adalah aplikasi perhitungan GADA yang ringkas dan langsung pada intinya.

### Prinsip Desain Setelah Revisi

- **Domain-Agnostic First:** Layar awal netral, tidak langsung menampilkan data atau hasil laundry.
- **1-Klik Demo Studi Kasus:** Dataset Kelompok 6 (Laundry UNSRI) tetap tersedia melalui tombol preset untuk kebutuhan validasi laporan dan demo PPT.
- **Ramping & Linear (3 Tab):** Alur UI mengikuti alur alami metode GADA: **Input Data → Hasil & Peringkat → Audit Perhitungan**.
- **Core Math & Test Tetap Utuh:** Engine perhitungan (`engine.ts`), parser spreadsheet (`excel.ts`), exporter (`exporter.ts`), dan unit test ground-truth (`tests/gada/laundry.test.ts`) dipertahankan penuh.

---

## 2. Alur Aplikasi Baru (User Flow)

### A. Layar Awal Netral (Saat `gadaInput === null`)

Ketika user membuka `/` pertama kali, tampilkan halaman pembuka (*Welcome / Setup View*) dengan judul netral (**Sistem Pendukung Keputusan — Metode GADA**) dan 3 pilihan masuk yang jelas:

1. **Upload File Excel / CSV** (`.xlsx`, `.xls`, `.csv`)
   - Mendukung drag-and-drop atau pilih file.
   - Menyertakan tombol **Download Template (.xlsx)** yang sudah berbahasa Indonesia dan netral domain.
2. **Buat Data Baru (Input Manual)**
   - Memuat starter minimal generik via `createBlankGadaInput()` (3 alternatif × 3 kriteria × 2 responden) langsung di tab Input Data.
3. **Muat Contoh Studi Kasus (Laundry UNSRI)**
   - Memuat `laundrySeedInput` (20 alternatif × 9 kriteria aktif + 1 varians nol × 30 responden) dalam 1 klik untuk demo PPT dan verifikasi laporan.

> Begitu salah satu sumber data dipilih/dimuat, aplikasi masuk ke workspace utama. Di header tetap tersedia tombol **"Ganti / Reset Data"** untuk kembali ke layar awal atau mengganti dataset kapan saja.

### B. Workspace Utama (3 Tab Fokus)

1. **Tab 1 — `Data & Kriteria` (`DataEditor.tsx`)**
   - Upload ulang file, Download Template, Buat Dataset Baru, Muat Studi Kasus, dan edit judul dataset.
   - Editor 3 sub-tab ringkas:
     - **Kriteria:** Kode, Nama, Tipe (`Cost`/`Benefit`), Status (`Aktif`/`Nonaktif`), Strategi Missing (`penalty_max`, `min_value`, `mean`, `custom_penalty`).
     - **Alternatif ($S \times M$):** Tambah/hapus baris, edit nama, catatan opsional, dan nilai sel.
     - **Responden ($N \times M$):** Tambah/hapus responden, edit nama responden, dan skor kepentingan ($> 0$).
2. **Tab 2 — `Hasil & Peringkat` (`ResultsView.tsx`)**
   - Strip ringkasan 3 kartu inti: **Peringkat #1**, **Kriteria Bobot Tertinggi ($W_k\%$)**, dan **Rata-rata Konsistensi Responden ($\sqrt{\bar{\alpha}}$)**.
   - Dua grafik utama: **Bobot Konsensus Kriteria ($W_k\%$)** dan **Skor Akhir Alternatif ($\hat{R}_j$)**.
   - **Tabel Peringkat Alternatif:** Pencarian nama, kolom Peringkat (`#1..#S`), Nama/Catatan, Indeks GADA ($\hat{r}_j$, 6 desimal), Skor Relatif ($\hat{R}_j$, 6 desimal), dan Persentase Skor.
3. **Tab 3 — `Audit Perhitungan` (`AuditDiagnosticsView.tsx`)**
   - Ringkasan praproses otomatis (kriteria varians nol yang dieliminasi + jumlah sel yang diimputasi).
   - **Monitor Konsistensi Responden:** Ringkasan Min/Max/Avg $\sqrt{\alpha_i}$ + tabel nilai $s_i, |s_i|, \alpha_i, \sqrt{\alpha_i}$, dan status konsistensi.
   - **Inspektor Matriks 6 Tahap:** `Cleaned (A)`, `Beta (βᵢ)`, `Zero-Point (xᵢ⁰)`, `AGRPC (εᵢⱼ)`, `Theta (θᵢₖ)`, dan `RO (rⱼₖ)` beserta formula dan tombol salin tabel untuk laporan.

---

## 3. Rincian Perubahan per File

### A. Dihapus (Pemangkasan Fitur di Luar Inti GADA)

| File | Alasan Penghapusan |
| :--- | :--- |
| `src/components/gada/SimulatorView.tsx` | Fitur *What-If slider* & *Radar chart* berada di luar alur baku GADA (`overrideWeights` melewati AGRPC responden) dan menyumbang 1.039 baris UI. |
| `src/lib/gada/simulator.ts` | Helper khusus `SimulatorView` (`compareSimulations`, `buildRadarChartData`, `computeSimulatedWeights`). |

### B. Dirampingkan & Dinetralkan dari Konteks Spesifik

| File | Perubahan yang Dilakukan |
| :--- | :--- |
| `src/app/page.tsx` | Ubah state awal dari `laundrySeedInput` menjadi `null` (tampilkan layar awal netral dengan 3 opsi masuk). Pangkas tab dari 4 menjadi 3 (`Data & Kriteria`, `Hasil & Peringkat`, `Audit Perhitungan`). Sisakan **1 tombol `Export Excel`** di header global + tombol `Ganti Data` untuk kembali ke layar awal. |
| `src/components/gada/DataEditor.tsx` | 1. Hapus panel `PreprocessingOptionsCard` (`binaryTrueValue`, `binaryFalseValue`, toggle `autoDropZeroVariance`) dari UI — gunakan nilai default dari `constants.ts` secara otomatis di engine.<br>2. Hapus kolom metadata mahasiswa (`Fakultas`, `Jurusan / Prodi`, `Angkatan`) pada `RespondentsCrudTab` agar netral untuk semua domain.<br>3. Hapus duplikasi alert log imputasi/eliminasi yang terlalu panjang di atas editor (cukup tampil ringkas di Tab Audit). |
| `src/components/gada/ResultsView.tsx` | 1. Ganti `TopPodiumSection` (3 card) + `KpiSummaryStrip` (4 card) menjadi **1 strip ringkasan 3 kartu**. <br>2. Hilangkan filter & kolom `Tier Rekomendasi` berbasis cutoff rank statis `3` dan `10` (agar valid untuk jumlah alternatif berapapun, mis. $S = 3$ atau $S = 5$); cukup beri highlight pada Top 3.<br>3. Hapus tombol `Export Excel` duplikat di dalam header tabel. |
| `src/components/gada/AuditDiagnosticsView.tsx` | 1. Hapus metadata & pencarian `prodi/fakultas` pada tabel konsistensi responden.<br>2. Hapus 2 tombol `Export 4-Sheet Excel Report` yang duplikat (cukup gunakan tombol Export di header global).<br>3. Rapikan istilah UI agar akademis (hindari jargon kode seperti `"Layer A"`, `"Override"`, `"Auto-Drop"`).<br>4. Pertahankan 1 tombol salin tabel (atau Markdown/TSV ringkas) untuk kebutuhan penyusunan laporan. |
| `src/lib/gada/excel.ts` | Pertahankan penuh Mode A (auto-detect workbook Kelompok 6) dan Mode B (generic `.xlsx`/`.xls`/`.csv`). Perbarui label pada `downloadTemplateWorkbook()` dan `createBlankGadaInput()` agar konsisten berbahasa Indonesia dan netral domain. |
| `src/lib/gada/constants.ts` | Pertahankan seluruh konstanta inti (`DEFAULT_GADA_OPTIONS`, `CONSISTENCY_THRESHOLDS`, batas dimensi minimum). Cutoff tier `TOP_MAX_RANK` / `RECOMMENDED_MAX_RANK` bisa tetap disimpan jika masih direferensikan tipe/test, atau ditandai opsional. |

### C. Tidak Diubah (Tetap Utuh sebagai Inti Matematis & Validasi)

| File | Status |
| :--- | :--- |
| `src/lib/gada/engine.ts` | **Utuh.** Seluruh perhitungan GADA (`parseRawCell`, `runGadaAnalysis`, log-space geometric mean, guard $> 0$, zero-variance auto-drop) tetap menjadi satu-satunya mesin hitung. *(Opsional: parameter `overrideWeights` boleh tetap ada untuk kompatibilitas unit test yang sudah lolos.)* |
| `src/data/laundry-seed.ts` | **Utuh.** Dipanggil saat user menekan **"Muat Contoh Studi Kasus (Laundry UNSRI)"** dan oleh suite pengujian. |
| `src/lib/gada/exporter.ts` | **Utuh.** Export 4-sheet Excel (`Ranking & Scores`, `Criteria Weights`, `Respondent Consistency`, `Audit Matrices`) tetap dipertahankan sebagai bukti output laporan. |
| `tests/gada/laundry.test.ts` | **Utuh** *(kecuali jika ada test khusus `overrideWeights` yang memang tetap kompatibel dengan `engine.ts`)*. |

---

## 4. Perbaikan Teknis & Sinkronisasi Dokumentasi

Selain perampingan fitur UI, beberapa temuan teknis dari audit proyek perlu dibereskan sebelum pengumpulan akhir:

1. **Pasang `vitest` di `package.json`:**
   - Saat ini `vitest` belum terinstall di `devDependencies`, sehingga `npm run typecheck` dan `npm run test` gagal.
   - Instalasi `vitest` memungkinkan seluruh 15+ skenario uji ground-truth pada `tests/gada/laundry.test.ts` dijalankan dan dilampirkan di Bab 4 laporan.
2. **Perhatikan Font Build Offline (`src/app/layout.tsx`):**
   - `next/font/google` (`Geist`, `Geist_Mono`) gagal saat `npm run build` dijalankan tanpa akses internet. Pertimbangkan fallback ke font sistem atau `next/font/local` jika demo/build dilakukan di lingkungan offline.
3. **Perbarui `README.md`:**
   - Ganti template bawaan `create-next-app` dengan dokumentasi ringkas proyek GADA DSS (fitur, cara pakai dengan dataset bebas, struktur data Excel/CSV, cara menjalankan lokal, dan daftar tim).
4. **Sinkronkan Dokumen Teknis (`docs/`):**
   - Sesuaikan `docs/SPEC.md`, `docs/TASKS.md`, `docs/TESTING.md`, dan `AGENTS.md` (terutama menghapus referensi `SimulatorView`/4-tab dan memperbarui checklist *Preset Boot Check* menjadi *Welcome Screen + Load Case Study Button*) agar dokumentasi 100% cocok dengan aplikasi final.

---

## 5. Checklist Eksekusi Bertahap

- [x] **Tahap 1 — Cleanup Track Simulator:** Hapus `src/components/gada/SimulatorView.tsx` dan `src/lib/gada/simulator.ts`.
- [x] **Tahap 2 — Welcome State & Shell 3 Tab (`src/app/page.tsx`):** Ubah inisialisasi menjadi `null`, bangun layar awal netral (Upload / Buat Baru / Muat Studi Kasus), pasang 3 tab dan 1 tombol Export Excel di header.
- [x] **Tahap 3 — Perampingan Komponen UI:**
  - [x] Sederhanakan `src/components/gada/DataEditor.tsx` (hapus panel Layer A & kolom fakultas/jurusan/angkatan).
  - [x] Sederhanakan `src/components/gada/ResultsView.tsx` (strip 3 kartu ringkas, 2 grafik, tabel tanpa tier statis 3/10 dan tanpa tombol Export duplikat).
  - [x] Sederhanakan `src/components/gada/AuditDiagnosticsView.tsx` (hapus kolom prodi/fakultas & tombol Export duplikat, rapikan istilah).
  - [x] Rapikan label template di `src/lib/gada/excel.ts` agar konsisten netral & berbahasa Indonesia.
- [x] **Tahap 4 — Perbaikan Build & Test:** Install `vitest`, pastikan `npm run typecheck`, `npm run test`, `npm run lint`, dan `npm run build` seluruhnya lulus tanpa error.
- [x] **Tahap 5 — Finalisasi Dokumentasi:** Tulis ulang `README.md` dan sinkronkan `docs/SPEC.md`, `docs/TASKS.md`, `docs/TESTING.md`, serta `AGENTS.md`.


---

## 6. Revisi Lanjutan (Tahap 6): Mode 100% Generik Berbasis Template

Sesuai kebutuhan presentasi di mana **dataset studi kasus akan diunggah langsung menggunakan format Template** (tanpa tombol pintas di UI dan tanpa parser khusus), aplikasi dirampingkan lebih lanjut menjadi **100% netral dan bergantung penuh pada jalur Template / Upload generik + Editor**.

### A. Tujuan Tahap 6

1. **Hapus Shortcut Studi Kasus dari UI:** Menghapus tombol `"Muat Studi Kasus Laundry"` di `WelcomeScreen.tsx` dan `DataEditor.tsx`, serta menghapus seluruh import `laundrySeedInput` di `src/app/page.tsx`.
2. **Layar Awal 2 Jalur Murni:** Saat `/` dibuka, user hanya melihat dua opsi utama:
   - **Unggah Dataset (`.xlsx`, `.xls`, `.csv`)** + **Download Template (`.xlsx`)**
   - **Buat Dataset Manual (`3×3`)**
3. **Parser 100% Generik (`src/lib/gada/excel.ts`):** Menghapus `parseGroup6Workbook` (~590 baris khusus sheet `Data Laundry` & `Bobot Kriteria`), dan menambahkan dukungan tag header opsional `(Cost)` / `(Benefit)` pada parser generik sehingga template seperti `Biaya (Cost)` otomatis terpetakan menjadi kriteria `cost` (`penalty_max`).
4. **Status `src/data/laundry-seed.ts` & `tests/gada/laundry.test.ts`:**
   - Tidak lagi masuk ke bundle UI/halaman web.
   - *(Keputusan sebelum eksekusi)*: Tetap dipertahankan khusus sebagai fixture pengujian matematis `npm run test` (**Opsi A — Disarankan**), atau dihapus sekalian (**Opsi B**).

### B. Rincian Perubahan per File (Tahap 6)

| File | Perubahan |
| :--- | :--- |
| `src/components/gada/WelcomeScreen.tsx` | Hapus card `"Contoh Studi Kasus"`, tombol `"Muat Studi Kasus Laundry"`, prop `onLoadCaseStudy`, dan penyebutan `"Kelompok 6"`. Fokus pada 2 kartu sejajar: Upload/Template & Input Manual. |
| `src/app/page.tsx` | Hapus import `laundrySeedInput`, `handleLoadCaseStudy`, dan prop `onLoadCaseStudy`. |
| `src/components/gada/DataEditor.tsx` | Hapus prop `onLoadCaseStudy`, tombol `"Muat Studi Kasus Laundry"`, dan teks `"workbook survei Kelompok 6"`. |
| `src/lib/gada/excel.ts` | Hapus seluruh blok `Mode A (parseGroup6Workbook)` (~590 baris). Perkuat `parseGenericAlternatives` agar mengenali akhiran header `(Cost)` / `(Benefit)` secara umum (default tetap `benefit` jika tidak ada tag). |
| `README.md`, `docs/SPEC.md`, `docs/TESTING.md` | Perbarui dokumentasi agar hanya mencantumkan 2 jalur masuk dan parser generik murni. |

### C. Panduan Penyesuaian Dataset Presentasi ke Format Template

Agar dataset studi kasus (maupun dataset domain lain) berjalan mulus saat diunggah melalui `Template_Dataset_GADA.xlsx` saat presentasi:

1. **Sheet 1 (`Alternatif`):**
   - Kolom 1: Nama alternatif.
   - Kolom 2 *(opsional)*: `Alamat` / `Keterangan` / `Deskripsi`.
   - Kolom 3 dst.: Nilai kriteria (angka, `800 m`, `3 hari`, `08.00 - 18.00`, `Ya`/`Tidak`, atau `-` untuk sel kosong).
   - *(Tips)*: Akhiri nama kolom dengan `(Cost)` untuk kriteria biaya/jarak/waktu (mis. `Tarif Cuci Lipat (Cost)`), atau atur langsung di Tab **Data & Kriteria** setelah upload.
2. **Sheet 2 (`Responden`):**
   - Kolom 1: Nama responden (tanpa kolom `Timestamp`, `Fakultas`, `Program Studi`, `Angkatan`, dan tanpa tabel hitungan lanjutan di baris bawah).
   - Kolom 2 dst.: Skor 1–5 tiap kriteria dengan **jumlah kolom sama persis dengan Sheet 1** (jika `Pembayaran QRIS` ikut dimasukkan di Sheet 1, sertakan juga kolomnya di Sheet 2—nanti otomatis tereliminasi karena varians nol).
3. **Penyesuaian Cepat Setelah Upload (di Tab `Data & Kriteria`):**
   - Jika ada kriteria dengan strategi missing khusus selain `penalty_max`/`min_value` (misalnya `Tarif Paket Kilat` = `custom_penalty` `20000` atau `Batas Minimal Berat` = `min_value`), ubah langsung pada kolom **Strategi Missing** sebelum berpindah ke Tab **Hasil & Peringkat**.

### D. Checklist Eksekusi Tahap 6

- [x] Hapus tombol & handler studi kasus di `WelcomeScreen.tsx`, `page.tsx`, dan `DataEditor.tsx`.
- [x] Pangkas `parseGroup6Workbook` di `src/lib/gada/excel.ts` dan tambahkan parsing tag header `(Cost)` / `(Benefit)` pada jalur generik.
- [x] Putuskan status `src/data/laundry-seed.ts` (dipertahankan khusus sebagai fixture untuk unit test `npm run test`).
- [x] Jalankan verifikasi penuh (`npm run typecheck`, `npm run test`, `npm run lint`, `npm run build`).
- [x] Sinkronkan `README.md`, `docs/SPEC.md`, dan `docs/TESTING.md`.
