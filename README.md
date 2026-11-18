# GemEdu — Latihan TKA SD · SMP · SMA

Aplikasi web gratis untuk latihan Tes Kemampuan Awal siswa Indonesia.
Tagline: *Chill belajarnya, skill ujiannya.*

- 100 soal per jenjang (SD Kelas 6, SMP Kelas 9, SMA Kelas 12)
- Lima mata pelajaran: Matematika, Bahasa Indonesia, IPA, IPS, Bahasa Inggris
- Penilaian otomatis, timer, retry, progress bar
- Berjalan 100% di browser — tanpa login, tanpa biaya

## Lokal
```bash
python -m http.server 8124
# → http://localhost:8124
```

## Deploy ke GitHub Pages
1. Push repo ini ke GitHub (Public)
2. Settings → Pages → Source: `main` branch, `/ (root)`
3. URL: `https://<username>.github.io/GemEdu/`

## Google Sheets (opsional)
Tambahkan Apps Script Web App URL ke `app.js` → `SHEETS_ENDPOINT_KEY` → atau edit baris `SHEETS_DEFAULT_ENDPOINT`.
Fungsinya: setiap siswa menyelesaikan quiz, hasil otomatis tersimpan sebagai baris di spreadsheet.
