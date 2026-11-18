#!/usr/bin/env node
/**
 * Ratakan sebaran kunci jawaban tiap bank soal.
 * Opsi diacak posisi (swap) supaya kunci tidak menumpuk di A/B,
 * kecuali soal yang opsinya saling merujuk (mis. "semua di atas").
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'banks');
const REF = /semua (pernyataan|opsi|jawaban|pilihan)|di atas|tersebut di atas|A dan B|B dan C|keduanya|ketiganya|pilihan A|opsi A|jawaban A/i;

let changed = 0, skipped = 0;

for (const file of fs.readdirSync(DIR).filter(f => f.endsWith('.json'))) {
  const full = path.join(DIR, file);
  const arr = JSON.parse(fs.readFileSync(full, 'utf8'));
  let counter = 0;

  for (const q of arr) {
    if (q.tipe === 'multi') continue;                     // multi dibiarkan
    if (q.o.some(o => REF.test(o))) { skipped++; continue; }
    const target = counter++ % 4;
    if (q.k !== target) {
      const tmp = q.o[q.k];
      q.o[q.k] = q.o[target];
      q.o[target] = tmp;
      q.k = target;
      changed++;
    }
  }

  fs.writeFileSync(full, JSON.stringify(arr, null, 2) + '\n', 'utf8');

  const single = arr.filter(q => q.tipe !== 'multi');
  const dist = [0, 0, 0, 0];
  single.forEach(q => dist[q.k]++);
  console.log(`${file.padEnd(14)} kunci: ${dist.join('/')}`);
}

console.log(`\n${changed} soal diacak ulang, ${skipped} dilewati (opsi saling merujuk).`);
