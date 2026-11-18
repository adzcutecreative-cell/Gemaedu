# GemEdu — Latihan TKA SD · SMP · SMA

Aplikasi web gratis untuk latihan Tes Kemampuan Awal siswa Indonesia.
**Chill belajarnya, skill ujiannya.**

🌐 **Live:** https://adzcutecreative-cell.github.io/Gemaedu/

## Isi

- **3 jenjang**: SD (Kelas 6), SMP (Kelas 9), SMA (Kelas 12)
- **5 mata pelajaran** per jenjang: Matematika, Bahasa Indonesia, IPA, IPS, Bahasa Inggris
- **100 soal per jenjang** → 20 soal per mapel, tiap sesi 15 soal acak
- Timer, progress bar, penilaian otomatis, pembahasan singkat, tombol ulangi
- **Mobile-first** — dirancang untuk HP, jalan juga di laptop
- Hasil bisa **disimpan ke Google Sheets** atau **diunduh sebagai CSV**
- Tanpa login, tanpa biaya, tanpa iklan

## Struktur

```
index.html            Halaman + layar (home / kuis / hasil)
styles.css            Tema hijau-krem, mobile-first
questions.js          Bank soal: 300 soal (100 per jenjang)
app.js                Logika kuis, penilaian, ekspor
google-apps-script.gs Konektor Google Sheets (opsional)
assets/logo-dark.png  Logo GemEdu
```

## Jalanin di lokal

```bash
python -m http.server 8124
# buka http://localhost:8124
```

## Deploy

Otomatis: setiap `git push` ke `main` → GitHub Pages build ulang (±1 menit).

```
Settings → Pages → Deploy from a branch → main → / (root)
```

## Sambungkan Google Sheets (opsional, ±5 menit)

1. Buka <https://sheets.new>, beri nama **GemEdu - Nilai Siswa**
2. **Extensions → Apps Script**, hapus isi `Code.gs`
3. Tempel seluruh isi `google-apps-script.gs` → **Save**
4. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. **Deploy → Authorize access → Advanced → Go to … (unsafe) → Allow**
6. Copy **Web app URL** (`https://script.google.com/macros/s/AKfy…/exec`)
7. Buka `app.js`, isi:

```js
const SHEETS_ENDPOINT = 'https://script.google.com/macros/s/AKfy…/exec';
```

8. `git commit` + `git push` → tunggu ±1 menit

Setelah itu, setiap siswa selesai kuis dan klik **Simpan ke Google Sheets**, satu baris otomatis masuk ke sheet **Nilai**.

> Kalau endpoint belum diisi, tombol Sheets menampilkan pesan dan CSV tetap bisa dipakai:
> unduh CSV → buka <https://sheets.new> → **File → Import**.

## Pasang di HP (opsional)

Tambahkan ke layar utama supaya seperti aplikasi:

- **Android (Chrome):** buka situs → menu ⋮ → **Add to Home screen / Install app**
- **iPhone (Safari):** buka situs → tombol Share → **Add to Home Screen**

Setelah terpasang, app kebuka tanpa address bar dan dasar-dasarnya tetap jalan walau sinyal jelek (service worker menyimpan cache).

## Catatan

- Soal disusun sebagai latihan formatif, **bukan** bocoran soal resmi TKA.
- Semua data nilai disimpan di perangkat siswa (localStorage) + spreadsheet milikmu. Tidak ada server pihak ketiga.
