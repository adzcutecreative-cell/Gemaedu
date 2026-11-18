#!/usr/bin/env node
/**
 * Beri tag tingkat kesulitan C1–C6 pada tiap bank soal.
 * Heuristik kompleksitas: panjang soal/opsi, teks bacaan, kata kunci penalaran,
 * angka besar, dan tipe PG kompleks. Hasilnya dibagi merata 10 soal per level.
 *
 * Tag lv bisa diedit manual di banks/*.json — skrip ini tidak akan menimpanya
 * kecuali dijalankan dengan --force.
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'banks');
const FORCE = process.argv.includes('--force');

function complexity(q) {
  let s = q.t.length / 18;
  s += q.o.reduce((a, o) => a + String(o).length, 0) / 45;
  if (q.tipe === 'multi') s += 4;
  if (/\n/.test(q.t)) s += 2;
  if (/[0-9]{3,}/.test(q.t)) s += 1;
  if (/\b(jika|diketahui|simpulan|inferensi|analisis|penalaran|asumsi|kausal|manakah yang|berikut yang)\b/i.test(q.t)) s += 2;
  if (/\b(turunan|integral|matriks|vektor|limit|logaritma|fungsi|persamaan)\b/i.test(q.t)) s += 2;
  if (/\b(tidak|bukan|kecuali|terkecil|terbesar|paling)\b/i.test(q.t)) s += 1;
  return Math.round(s * 100) / 100;
}

let tagged = 0, kept = 0;

for (const file of fs.readdirSync(DIR).filter(f => f.endsWith('.json'))) {
  const full = path.join(DIR, file);
  const arr = JSON.parse(fs.readFileSync(full, 'utf8'));
  const n = arr.length;

  if (!FORCE && arr.every(q => Number.isInteger(q.lv) && q.lv >= 1 && q.lv <= 6)) {
    kept++;
    console.log(`${file.padEnd(14)} lv sudah ada — dilewati`);
    continue;
  }

  const scored = arr.map((q, i) => ({ i, score: complexity(q) }))
    .sort((a, b) => a.score - b.score || a.i - b.i);

  scored.forEach((entry, rank) => {
    const lv = Math.min(6, Math.floor(rank * 6 / n) + 1);
    arr[entry.i].lv = lv;
  });

  fs.writeFileSync(full, JSON.stringify(arr, null, 2) + '\n', 'utf8');
  tagged++;

  const dist = [0, 0, 0, 0, 0, 0];
  arr.forEach(q => dist[q.lv - 1]++);
  console.log(`${file.padEnd(14)} C1–C6: ${dist.join('/')}`);
}

console.log(`\n${tagged} bank diberi level, ${kept} bank sudah memiliki level.`);
