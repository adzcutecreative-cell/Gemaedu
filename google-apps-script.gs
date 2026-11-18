/**
 * GemEdu — Google Sheets connector (Apps Script)
 * ------------------------------------------------------------
 * Cara pakai (sekali saja, ±5 menit):
 *
 * 1. Buka https://sheets.new  → buat spreadsheet baru, beri nama "GemEdu - Nilai Siswa"
 * 2. Menu Extensions → Apps Script
 * 3. Hapus semua isi Code.gs, tempel seluruh file ini
 * 4. Klik Deploy → New deployment → pilih tipe "Web app"
 *      - Description : GemEdu
 *      - Execute as  : Me
 *      - Who has access : Anyone
 *    Klik Deploy → Authorize access → pilih akun Google → Advanced → Go to (unsafe) → Allow
 * 5. Copy "Web app URL" (bentuknya https://script.google.com/macros/s/AKfy.../exec)
 * 6. Tempel URL itu di app.js, variabel SHEETS_ENDPOINT, lalu commit/push ulang.
 *
 * Setelah itu setiap siswa selesai kuis dan klik "Simpan ke Google Sheets",
 * satu baris otomatis masuk ke sheet "Nilai".
 */

var SHEET_NAME = 'Nilai';

var HEADERS = [
  'Waktu',
  'Nama',
  'Kelas',
  'Jenjang',
  'Mata Pelajaran',
  'Total Soal',
  'Benar',
  'Salah',
  'Kosong',
  'Nilai',
  'Durasi (detik)'
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = getSheet_();

    sheet.appendRow([
      new Date(data.timestamp || Date.now()),
      data.name || '',
      data.class || '',
      data.jenjang || '',
      data.subject || '',
      data.total || 0,
      data.correct || 0,
      data.wrong || 0,
      data.empty || 0,
      data.pct || 0,
      data.elapsedSec || 0
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

/** GET dipakai untuk cek cepat: buka URL web app di browser → {"ok":true} */
function doGet() {
  getSheet_();
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'GemEdu' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.getRange('A:A').setNumberFormat('dd/MM/yyyy HH:mm');
  }

  return sheet;
}
