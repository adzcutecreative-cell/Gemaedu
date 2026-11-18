#!/usr/bin/env node
/**
 * Gabungkan banks/*.json → questions.js
 * Validasi: 4 opsi unik, kunci valid, tipe multi benar, tidak ada duplikat teks.
 */
const fs = require('fs');
const path = require('path');

const BANKS = [
  ['sd', 'math'], ['sd', 'bin'], ['sd', 'ipas'],
  ['smp', 'math'], ['smp', 'bin'], ['smp', 'ipa'], ['smp', 'ips'], ['smp', 'ing'],
  ['sma', 'math'], ['sma', 'bin'], ['sma', 'ipa'], ['sma', 'ips'], ['sma', 'ing'],
];

const OUT = path.join(__dirname, 'questions.js');
const errors = [];
const all = [];
const seenText = new Map();
const summary = [];

for (const [j, p] of BANKS) {
  const file = path.join(__dirname, 'banks', `${j}-${p}.json`);
  if (!fs.existsSync(file)) { errors.push(`MISSING ${j}-${p}.json`); continue; }

  let arr;
  try { arr = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { errors.push(`${j}-${p}: JSON invalid — ${e.message}`); continue; }

  if (!Array.isArray(arr)) { errors.push(`${j}-${p}: bukan array`); continue; }
  if (arr.length !== 60) errors.push(`${j}-${p}: ${arr.length} soal (harus 60)`);

  let multi = 0;
  arr.forEach((q, i) => {
    const tag = `${j}-${p}[${i}]`;
    if (!q || typeof q.t !== 'string' || !q.t.trim()) return errors.push(`${tag}: teks kosong`);
    if (!Array.isArray(q.o) || q.o.length !== 4) return errors.push(`${tag}: opsi harus 4`);
    if (new Set(q.o.map(o => String(o).trim())).size !== 4) return errors.push(`${tag}: opsi duplikat`);
    if (q.o.some(o => !String(o).trim())) return errors.push(`${tag}: ada opsi kosong`);

    const isMulti = q.tipe === 'multi';
    if (isMulti) {
      multi++;
      if (!Array.isArray(q.k) || q.k.length < 2 || q.k.length > 3) return errors.push(`${tag}: kunci multi harus 2-3`);
      if (q.k.some(k => !Number.isInteger(k) || k < 0 || k > 3)) return errors.push(`${tag}: index kunci invalid`);
      if (new Set(q.k).size !== q.k.length) return errors.push(`${tag}: kunci multi duplikat`);
    } else {
      if (!Number.isInteger(q.k) || q.k < 0 || q.k > 3) return errors.push(`${tag}: kunci invalid`);
      if (q.tipe !== undefined) return errors.push(`${tag}: tipe tidak dikenal`);
    }

    const key = q.t.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seenText.has(key)) errors.push(`${tag}: duplikat teks dengan ${seenText.get(key)}`);
    else seenText.set(key, tag);

    const item = { j, p, t: q.t, o: q.o, k: q.k };
    if (isMulti) item.tipe = 'multi';
    if (Number.isInteger(q.lv) && q.lv >= 1 && q.lv <= 6) item.lv = q.lv;
    else errors.push(`${tag}: lv belum diisi (jalankan assign_levels.js)`);
    all.push(item);
  });

  summary.push(`${j}-${p}: ${arr.length} soal (${multi} multi)`);
}

if (errors.length) {
  console.error('VALIDASI GAGAL:\n' + errors.join('\n'));
  process.exit(1);
}

const body = all.map(q => '  ' + JSON.stringify(q)).join(',\n');

const out = `/* =========================================================
   GemEdu — Bank Soal TKA
   Digenerate oleh build_questions.js — jangan diedit manual.
   Format: { j, p, t, o, k, tipe? }
     j = jenjang sd|smp|sma
     p = mapel math|bin|ipas|ipa|ips|ing
     t = teks soal
     o = 4 opsi
     k = index kunci (number) atau array index untuk tipe "multi"
   ========================================================= */

const QUESTIONS = [
${body}
];
`;

fs.writeFileSync(OUT, out, 'utf8');
console.log(summary.join('\n'));
console.log(`\nTOTAL: ${all.length} soal → questions.js`);
