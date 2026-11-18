# Gema Edu — Latihan TKA SD · SMP · SMA

Aplikasi web gratis untuk latihan **Tes Kemampuan Akademik (TKA)**.
**Chill belajarnya, skill ujiannya.**

🌐 **Live:** https://adzcutecreative-cell.github.io/Gemaedu/

## Isi

| Jenjang | Mata pelajaran | Soal per mapel | Total bank |
|---|---|---|---|
| **SD** (Kelas 6) | Matematika, B. Indonesia | 60 | **120** |
| **SMP** (Kelas 9) | Matematika, B. Indonesia | 60 | **120** |
| **SMA** (Kelas 12) | Matematika, B. Indonesia, IPA, IPS, B. Inggris | 60 | **300** |

**Total 540 soal.**

Fitur:

- **Dua bentuk soal seperti TKA**: pilihan ganda biasa & **pilihan ganda kompleks** (jawaban benar lebih dari satu)
- Mode **20 soal (cepat)** atau **60 soal (lengkap)**
- Timer, progress bar, penilaian otomatis, rincian kunci jawaban, tombol ulangi
- **Mobile-first** + bisa dipasang di HP (PWA, ada cache offline)
- Hasil bisa dikirim ke **Google Sheets** atau diunduh sebagai **CSV**
- Tanpa login, tanpa iklan, tanpa biaya

> Catatan: pada TKA 2026 resmi, SD & SMP hanya menguji **Matematika** dan **Bahasa Indonesia**.
> Mapel lain di GemEdu adalah pengayaan. Lihat `KISI_TKA_2026.md`.

## Struktur

```
index.html              Halaman + 3 layar (home / kuis / hasil)
styles.css              Tema hijau-krem, mobile-first
app.js                  Mesin kuis, penilaian, ekspor
questions.js            Hasil gabungan bank soal (auto-generate)
build_questions.js      Gabung + validasi banks/*.json → questions.js
banks/*.json            Sumber soal per jenjang-mapel (60 soal/file)
google-apps-script.gs   Konektor Google Sheets (opsional)
manifest.json, sw.js    PWA + cache offline
KISI_TKA_2026.md        Ringkasan kisi-kisi resmi
```

## Jalanin di lokal

```bash
python -m http.server 8124
# buka http://localhost:8124
```

## Ubah / tambah soal

1. Edit file di `banks/` (format: `{"t":"soal","o":["A","B","C","D"],"k":0}`;
   untuk PG kompleks `"k":[0,2],"tipe":"multi"`).
2. Jalankan:

```bash
node build_questions.js
```

Skrip ini memvalidasi (4 opsi unik, kunci valid, tanpa duplikat) lalu menulis `questions.js`.

## Deploy

Otomatis: `git push` ke `main` → GitHub Pages build ulang (±1 menit).

## Google Sheets (opsional, ±5 menit)

1. Buka <https://sheets.new>, beri nama **Gema Edu - Nilai Siswa**
2. **Extensions → Apps Script**, hapus isi `Code.gs`
3. Tempel seluruh isi `google-apps-script.gs` → **Save**
4. **Deploy → New deployment → Web app** → Execute as **Me**, access **Anyone** → Deploy → Allow
5. Copy **Web app URL** (`https://script.google.com/macros/s/AKfy…/exec`)
6. Isi di `app.js`:

```js
const SHEETS_ENDPOINT = 'https://script.google.com/macros/s/AKfy…/exec';
```

7. Commit + push → tunggu ±1 menit

Selama belum diset, pakai **Unduh CSV** → buka <https://sheets.new> → **File → Import**.

## Pasang di HP

- **Android (Chrome):** menu ⋮ → **Install app / Add to Home screen**
- **iPhone (Safari):** Share → **Add to Home Screen**

## Catatan konten

- SD & SMP mengikuti komposisi resmi TKA 2026: **Matematika + Bahasa Indonesia**.
- Bank soal SD IPAS tetap disimpan di `banks/` sebagai pengayaan, tetapi tidak ditampilkan.
- SMA memakai **IPA/IPS** sebagai payung untuk 2 mapel pilihan.
- Bank soal SMP IPA/IPS/B. Inggris masih disimpan di `banks/` untuk keperluan lain, tetapi **tidak ditampilkan** di aplikasi.
