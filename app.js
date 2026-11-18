/* =========================================================
   GemEdu — Application Logic
   Mobile-first practice engine (TKA: PG & PG kompleks)
   ========================================================= */

'use strict';

/* ---------- Jenjang & mata pelajaran ---------- */
const JENJANG = {
  sd:  { name: 'SD',  kelas: '6',  mapel: ['math', 'bin'] },
  smp: { name: 'SMP', kelas: '9',  mapel: ['math', 'bin'] },
  sma: { name: 'SMA', kelas: '12', mapel: ['math', 'bin', 'ipa', 'ips', 'ing'] },
};

const SUBJECTS = {
  math: { name: 'Matematika',       short: 'Matematika', emoji: '➗' },
  bin:  { name: 'Bahasa Indonesia', short: 'B. Indonesia', emoji: '📖' },
  ipas: { name: 'IPAS',             short: 'IPAS', emoji: '🌍' },
  ipa:  { name: 'IPA',              short: 'IPA', emoji: '🔬' },
  ips:  { name: 'IPS',              short: 'IPS', emoji: '🗺️' },
  ing:  { name: 'Bahasa Inggris',   short: 'B. Inggris', emoji: '🗣️' },
};

const STORAGE_KEY = 'gemaedu:v3';
const MODE_KEY = STORAGE_KEY + ':mode';
const STUDENT_KEY = STORAGE_KEY + ':student';
const RECORDS_KEY = STORAGE_KEY + ':records';

/* Mode simulasi mengikuti durasi resmi TKA: 30 soal / 75 menit */
const MODE_COUNTS = { 20: 20, 30: 30, 60: 60 };
const SIM_SECONDS = 75 * 60;

/* ---------- Helpers ---------- */
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const store = {
  get(k)  { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } },
  set(k,v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch {/* noop */} }
};
const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const LEVEL_LABEL = {
  1: 'Mudah · C1', 2: 'Mudah · C2',
  3: 'Sedang · C3', 4: 'Sedang · C4',
  5: 'Sulit · C5', 6: 'Sulit · C6',
};
const MODE_LABEL = { 20: 'Cepat', 30: 'Simulasi', 60: 'Lengkap' };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function levelOf(q) { return Number.isInteger(q.lv) && q.lv >= 1 && q.lv <= 6 ? q.lv : 3; }

/* ---------- State ---------- */
const state = {
  jenjang: 'sd',
  subject: null,
  mode: 60,               // 20 cepat | 30 simulasi | 60 lengkap
  session: [],
  index: 0,
  answers: [],
  startedAt: 0,
  finishedAt: 0,
  timerId: null,
  elapsedSec: 0,
  timedOut: false,
  student: null,
};

/* ---------- Scoring ---------- */
function answered(ans) {
  return Array.isArray(ans) ? ans.length > 0 : ans !== null && ans !== undefined;
}
function isCorrect(q, ans) {
  if (!answered(ans)) return false;
  if (q.tipe === 'multi') {
    const key = q.k.slice().sort((a, b) => a - b).join(',');
    const got = ans.slice().sort((a, b) => a - b).join(',');
    return key === got;
  }
  return ans === q.k;
}
function answerLabel(q, ans) {
  if (!answered(ans)) return 'Tidak dijawab';
  const idx = Array.isArray(ans) ? ans : [ans];
  return idx.slice().sort((a, b) => a - b).map(i => LETTERS[i]).join(', ');
}
function keyLabel(q) {
  const idx = Array.isArray(q.k) ? q.k : [q.k];
  return idx.slice().sort((a, b) => a - b).map(i => LETTERS[i]).join(', ');
}

/* ---------- Screen management ---------- */
function showScreen(id) {
  $$('.screen').forEach(s => {
    s.hidden = s.id !== id;
    s.classList.toggle('active', s.id === id);
  });
  window.scrollTo({ top: 0, behavior: 'instant' });
}

/* ---------- Home ---------- */
function bank(jenjang, subject) {
  return QUESTIONS.filter(q => q.j === jenjang && q.p === subject);
}

function renderSubjects() {
  const grid = $('.subject-grid');
  grid.innerHTML = '';
  for (const id of JENJANG[state.jenjang].mapel) {
    const s = SUBJECTS[id];
    const btn = document.createElement('button');
    btn.className = 'subject-btn';
    btn.type = 'button';
    btn.dataset.subject = id;
    const n = bank(state.jenjang, id).length;
    btn.innerHTML = `<span class="subject-emoji" aria-hidden="true">${s.emoji}</span>
      <span class="subject-name">${s.name}<small class="subject-meta">${n} soal</small></span>`;
    btn.addEventListener('click', () => startQuiz(id));
    grid.appendChild(btn);
  }
}

function updateJenjangUI() {
  $$('.jenjang-btn').forEach(b => {
    const active = b.dataset.jenjang === state.jenjang;
    b.classList.toggle('active', active);
    b.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  renderSubjects();
}

function updateModeUI() {
  $$('.mode-btn').forEach(b => b.classList.toggle('active', Number(b.dataset.mode) === state.mode));
}

/* ---------- Start ---------- */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Ambil n soal dengan komposisi level seimbang:
 * C1,C2 (mudah) · C3,C4 (sedang) · C5,C6 (sulit).
 */
function pickBalanced(pool, n) {
  const buckets = [1, 2, 3, 4, 5, 6].map(lv => shuffle(pool.filter(q => levelOf(q) === lv)));
  const base = Math.floor(n / 6);
  const rem = n % 6;
  const picked = [];
  buckets.forEach((bucket, i) => picked.push(...bucket.slice(0, base + (i < rem ? 1 : 0))));

  // Kalau ada level yang kurang, lengkapi dari sisa bank
  if (picked.length < n) {
    const used = new Set(picked);
    const rest = shuffle(pool.filter(q => !used.has(q)));
    picked.push(...rest.slice(0, n - picked.length));
  }
  return shuffle(picked.slice(0, n));
}

function currentStudent() {
  const s = store.get(STUDENT_KEY);
  return s && String(s.name || '').trim() ? s : null;
}

function isSimulation() { return state.mode === 30; }

function startQuiz(subject) {
  const pool = bank(state.jenjang, subject);
  if (!pool.length) return;

  const student = currentStudent();
  if (!student) {
    showScreen('screen-home');
    $('#student-status').textContent = 'Isi nama siswa dulu ya, biar hasilnya bisa direkap.';
    $('#student-status').className = 'sheets-status error';
    $('#student-name').focus();
    return;
  }

  state.student = student;
  state.subject = subject;
  state.session = pickBalanced(pool, Math.min(MODE_COUNTS[state.mode] || state.mode, pool.length));
  state.index = 0;
  state.answers = new Array(state.session.length).fill(null);
  state.startedAt = Date.now();
  state.finishedAt = 0;
  state.elapsedSec = 0;
  state.timedOut = false;

  $('#btn-submit').hidden = !isSimulation();
  $('#quiz-subject').textContent = SUBJECTS[subject].name;
  $('#input-name').value = student.name;
  $('#input-kelas').value = student.kelas || '';
  showScreen('screen-quiz');
  startTimer();
  renderQuestion();
}

/* ---------- Timer ---------- */
function startTimer() {
  if (state.timerId) clearInterval(state.timerId);
  const timer = $('#quiz-timer');
  timer.classList.add('running');
  timer.classList.remove('danger');

  const tick = () => {
    const spent = Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000));
    let shown;
    if (isSimulation()) {
      const left = Math.max(0, SIM_SECONDS - spent);
      state.elapsedSec = SIM_SECONDS - left;
      shown = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
      timer.classList.toggle('danger', left <= 300);
      if (left === 0) {
        timer.textContent = '00:00';
        state.timedOut = true;
        finishQuiz();
        return;
      }
    } else {
      state.elapsedSec = spent;
      shown = `${String(Math.floor(spent / 60)).padStart(2, '0')}:${String(spent % 60).padStart(2, '0')}`;
    }
    timer.textContent = shown;
  };

  tick();
  state.timerId = setInterval(tick, 1000);
}
function stopTimer() {
  if (state.timerId) clearInterval(state.timerId);
  state.timerId = null;
  $('#quiz-timer').classList.remove('running', 'danger');
}

/* ---------- Question ---------- */
function renderQuestion() {
  const q = state.session[state.index];
  if (!q) return finishQuiz();

  const J = JENJANG[state.jenjang];
  $('#question-jenjang').textContent = `${J.name} · Kelas ${J.kelas} · Soal ${state.index + 1}`;
  $('#question-text').textContent = q.t;
  $('#quiz-counter').textContent = `Soal ${state.index + 1} / ${state.session.length}`;
  $('#question-hint').hidden = q.tipe !== 'multi';

  const lv = levelOf(q);
  const badge = $('#question-level');
  badge.textContent = LEVEL_LABEL[lv];
  badge.className = 'level-badge ' + (lv <= 2 ? 'mudah' : lv <= 4 ? 'sedang' : 'sulit');

  const box = $('#options');
  box.innerHTML = '';
  const current = state.answers[state.index];
  const isMulti = q.tipe === 'multi';
  box.classList.toggle('multi', isMulti);

  q.o.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option';
    btn.setAttribute('role', isMulti ? 'checkbox' : 'radio');
    const sel = isMulti ? Array.isArray(current) && current.includes(i) : current === i;
    btn.setAttribute('aria-checked', sel ? 'true' : 'false');
    btn.innerHTML = `<span class="option-prefix">${LETTERS[i]}</span><span class="option-text">${opt}</span>`;
    btn.addEventListener('click', () => {
      if (isMulti) {
        const cur = Array.isArray(state.answers[state.index]) ? state.answers[state.index].slice() : [];
        const pos = cur.indexOf(i);
        if (pos >= 0) cur.splice(pos, 1); else cur.push(i);
        state.answers[state.index] = cur;
        box.querySelectorAll('.option').forEach((o, idx) =>
          o.setAttribute('aria-checked', cur.includes(idx) ? 'true' : 'false'));
      } else {
        state.answers[state.index] = i;
        box.querySelectorAll('.option').forEach((o, idx) =>
          o.setAttribute('aria-checked', idx === i ? 'true' : 'false'));
      }
    });
    box.appendChild(btn);
  });

  $('#quiz-progress-bar').style.width = ((state.index + 1) / state.session.length) * 100 + '%';
  $('#btn-prev').disabled = state.index === 0;
  $('#btn-prev').style.opacity = state.index === 0 ? '.4' : '1';
  $('#btn-next').textContent = state.index === state.session.length - 1 ? 'Selesai & Nilai ✓' : 'Selanjutnya →';
}

/* ---------- Finish ---------- */
function finishQuiz() {
  stopTimer();
  state.finishedAt = Date.now();

  let correct = 0, wrong = 0, empty = 0;
  state.session.forEach((q, i) => {
    const ans = state.answers[i];
    if (!answered(ans)) empty++;
    else if (isCorrect(q, ans)) correct++;
    else wrong++;
  });

  const total = state.session.length;
  const pct = Math.round((correct / total) * 100);

  let verdict = 'Ayo, fokus lagi ya.';
  if (pct >= 90) verdict = 'Luar biasa — kamu sudah sangat siap!';
  else if (pct >= 75) verdict = 'Bagus! Sedikit lagi menuju sempurna.';
  else if (pct >= 60) verdict = 'Cukup. Coba ulangi dan tingkatkan.';
  if (state.timedOut) verdict = 'Waktu habis! Tetap cek hasilmu di bawah.';

  $('#result-percent').textContent = pct + '%';
  $('#result-verdict').textContent = verdict;
  $('#result-ring').style.setProperty('--pct', pct);
  $('#stat-correct').textContent = correct;
  $('#stat-wrong').textContent = wrong;
  $('#stat-empty').textContent = empty;
  $('#stat-time').textContent = `${Math.floor(state.elapsedSec / 60)}:${String(state.elapsedSec % 60).padStart(2, '0')}`;

  const list = $('#result-answers');
  list.innerHTML = '';
  state.session.forEach((q, i) => {
    const ans = state.answers[i];
    const status = !answered(ans) ? 'unanswered' : (isCorrect(q, ans) ? 'correct' : 'wrong');
    const div = document.createElement('div');
    div.className = 'ans-item ' + status;
    const keyTxt = keyLabel(q);
    const ansTxt = answerLabel(q, ans);
    div.innerHTML = `<span class="ans-q">${i + 1}. ${q.t}</span>
      <span class="ans-detail">Jawabanmu: ${ansTxt} · Kunci: ${keyTxt}</span>`;
    list.appendChild(div);
  });

  store.set(STORAGE_KEY + ':last', {
    jenjang: state.jenjang, subject: state.subject, mode: state.mode,
    pct, correct, wrong, empty, elapsedSec: state.elapsedSec, finishedAt: state.finishedAt,
    timedOut: state.timedOut,
  });

  // Rekap otomatis untuk halaman guru (tersimpan di perangkat ini)
  const rec = {
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    ts: state.finishedAt,
    name: state.student ? state.student.name : $('#input-name').value.trim(),
    kelas: state.student ? (state.student.kelas || '') : $('#input-kelas').value.trim(),
    jenjang: JENJANG[state.jenjang].name,
    subject: SUBJECTS[state.subject].name,
    mode: MODE_LABEL[state.mode] || String(state.mode),
    total, correct, wrong, empty, pct,
    elapsedSec: state.elapsedSec,
    timedOut: state.timedOut,
  };
  const recs = store.get(RECORDS_KEY) || [];
  recs.push(rec);
  store.set(RECORDS_KEY, recs.slice(-1000));

  showScreen('screen-result');
}

/* ---------- Google Sheets ---------- */
/* Tempel Web app URL dari google-apps-script.gs di sini (lihat README). */
const SHEETS_ENDPOINT = '';

const SHEETS_ENDPOINT_KEY = STORAGE_KEY + ':sheets-endpoint';
function getSheetsEndpoint() {
  return SHEETS_ENDPOINT || store.get(SHEETS_ENDPOINT_KEY) || '';
}

function resultPayload(name, klass) {
  let correct = 0, wrong = 0, empty = 0;
  state.session.forEach((q, i) => {
    const ans = state.answers[i];
    if (!answered(ans)) empty++;
    else if (isCorrect(q, ans)) correct++;
    else wrong++;
  });
  return {
    timestamp: Date.now(),
    name, class: klass,
    jenjang: JENJANG[state.jenjang].name,
    subject: SUBJECTS[state.subject].name,
    total: state.session.length,
    correct, wrong, empty,
    pct: Math.round((correct / state.session.length) * 100),
    elapsedSec: state.elapsedSec,
  };
}

async function saveToSheets(payload) {
  const endpoint = getSheetsEndpoint();
  if (!endpoint) {
    $('#sheets-status').textContent = 'Belum tersambung ke spreadsheet — pakai tombol "Unduh CSV" di bawah, lalu buka di Google Sheets.';
    $('#sheets-status').className = 'sheets-status error';
    return false;
  }
  try {
    await fetch(endpoint, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
    });
    $('#sheets-status').textContent = 'Tersimpan ke Google Sheets ✓';
    $('#sheets-status').className = 'sheets-status ok';
    return true;
  } catch (e) {
    $('#sheets-status').textContent = 'Gagal terhubung. Coba unduh CSV.';
    $('#sheets-status').className = 'sheets-status error';
    return false;
  }
}

/* ---------- CSV ---------- */
function downloadCSV() {
  const name = $('#input-name').value.trim() || 'Siswa';
  const klass = $('#input-kelas').value.trim() || `${JENJANG[state.jenjang].name} ${JENJANG[state.jenjang].kelas}`;
  const r = resultPayload(name, klass);
  const rows = [
    ['Waktu', 'Nama', 'Kelas', 'Jenjang', 'Mata Pelajaran', 'Jumlah Soal', 'Benar', 'Salah', 'Kosong', 'Nilai', 'Durasi (detik)'],
    [new Date(r.timestamp).toLocaleString('id-ID'), r.name, r.class, r.jenjang, r.subject,
     r.total, r.correct, r.wrong, r.empty, r.pct, r.elapsedSec],
  ];
  const csv = rows.map(row => row.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\r\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Gema_Edu_${r.subject.replace(/\s+/g, '_')}_${name.replace(/\s+/g, '_')}_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------- Student + Teacher ---------- */
function renderStudentUI() {
  const s = currentStudent();
  const nameInput = $('#student-name');
  const classInput = $('#student-class');
  nameInput.value = s ? s.name : '';
  classInput.value = s ? (s.kelas || '') : '';
  nameInput.readOnly = !!s;
  classInput.readOnly = !!s;
  $('#btn-save-student').hidden = !!s;
  $('#btn-change-student').hidden = !s;
  if (s) {
    $('#student-status').textContent = `Siswa aktif: ${s.name}${s.kelas ? ' · ' + s.kelas : ''}`;
    $('#student-status').className = 'sheets-status ok';
  } else {
    $('#student-status').textContent = '';
    $('#student-status').className = 'sheets-status';
  }
}

function saveStudent() {
  const name = $('#student-name').value.trim();
  const kelas = $('#student-class').value.trim();
  if (!name) {
    $('#student-status').textContent = 'Nama wajib diisi.';
    $('#student-status').className = 'sheets-status error';
    $('#student-name').focus();
    return;
  }
  store.set(STUDENT_KEY, { name, kelas });
  state.student = { name, kelas };
  renderStudentUI();
}

function teacherRecords() {
  const name = $('#t-filter-name').value.trim().toLowerCase();
  const mapel = $('#t-filter-mapel').value;
  return (store.get(RECORDS_KEY) || []).filter(r =>
    (!name || String(r.name).toLowerCase().includes(name)) &&
    (!mapel || r.subject === mapel)
  );
}

function renderTeacher() {
  const recs = teacherRecords();
  const unique = new Set(recs.map(r => String(r.name).toLowerCase()));
  const avg = recs.length ? Math.round(recs.reduce((s, r) => s + Number(r.pct || 0), 0) / recs.length) : 0;
  $('#t-total').textContent = recs.length;
  $('#t-students').textContent = unique.size;
  $('#t-avg').textContent = avg;

  // Isi pilihan mapel dari data yang ada
  const select = $('#t-filter-mapel');
  const current = select.value;
  const subjects = Array.from(new Set(recs.map(r => r.subject))).sort();
  select.innerHTML = '<option value="">Semua mapel</option>' +
    subjects.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
  select.value = subjects.includes(current) ? current : '';

  const list = $('#teacher-list');
  if (!recs.length) {
    list.innerHTML = '<p class="teacher-empty">Belum ada hasil. Siswa selesai mengerjakan, datanya muncul di sini.</p>';
    return;
  }
  list.innerHTML = recs.slice().reverse().map(r => {
    const cls = Number(r.pct) < 60 ? 'low' : Number(r.pct) < 80 ? 'mid' : '';
    const tgl = new Date(r.ts).toLocaleString('id-ID');
    return `<div class="teacher-row ${cls}">
      <span class="teacher-name">${esc(r.name)} <small>(${esc(r.kelas || '-')})</small></span>
      <span class="teacher-score">${Number(r.pct)}%</span>
      <span class="teacher-meta">${esc(r.jenjang)} · ${esc(r.subject)} · ${esc(r.mode)} · ${r.correct}/${r.total} benar · ${tgl}${r.timedOut ? ' · waktu habis' : ''}</span>
    </div>`;
  }).join('');
}

function exportTeacherCSV() {
  const recs = teacherRecords();
  if (!recs.length) return;
  const rows = [
    ['Waktu', 'Nama', 'Kelas', 'Jenjang', 'Mapel', 'Mode', 'Total Soal', 'Benar', 'Salah', 'Kosong', 'Nilai', 'Durasi (detik)', 'Keterangan'],
  ].concat(recs.map(r => [
    new Date(r.ts).toLocaleString('id-ID'), r.name, r.kelas, r.jenjang, r.subject, r.mode,
    r.total, r.correct, r.wrong, r.empty, r.pct, r.elapsedSec, r.timedOut ? 'Waktu habis' : '',
  ]));
  const csv = rows.map(row => row.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\r\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Gema_Edu_Rekap_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------- Wiring ---------- */
function init() {
  state.mode = store.get(MODE_KEY) || 60;
  updateModeUI();
  updateJenjangUI();
  state.student = currentStudent();
  renderStudentUI();

  const total = $('#chip-total');
  if (total) {
    let n = 0;
    for (const j of Object.keys(JENJANG)) {
      for (const p of JENJANG[j].mapel) n += bank(j, p).length;
    }
    total.textContent = n + ' soal';
  }

  $$('.jenjang-btn').forEach(btn => btn.addEventListener('click', () => {
    state.jenjang = btn.dataset.jenjang;
    updateJenjangUI();
  }));

  $$('.mode-btn').forEach(btn => btn.addEventListener('click', () => {
    state.mode = Number(btn.dataset.mode);
    store.set(MODE_KEY, state.mode);
    updateModeUI();
  }));

  $('#btn-back').addEventListener('click', () => { stopTimer(); showScreen('screen-home'); });

  $('#btn-prev').addEventListener('click', () => {
    if (state.index > 0) { state.index--; renderQuestion(); }
  });

  $('#btn-next').addEventListener('click', () => {
    if (state.index < state.session.length - 1) { state.index++; renderQuestion(); }
    else finishQuiz();
  });

  $('#btn-submit').addEventListener('click', () => finishQuiz());

  $('#btn-retry').addEventListener('click', () => {
    state.index = 0;
    state.answers = new Array(state.session.length).fill(null);
    state.startedAt = Date.now();
    state.elapsedSec = 0;
    state.timedOut = false;
    startTimer();
    showScreen('screen-quiz');
    renderQuestion();
  });

  $('#btn-home').addEventListener('click', () => showScreen('screen-home'));

  $('#form-sheets').addEventListener('submit', async e => {
    e.preventDefault();
    $('#sheets-status').textContent = 'Menyimpan…';
    $('#sheets-status').className = 'sheets-status';
    const payload = resultPayload(
      $('#input-name').value.trim(),
      $('#input-kelas').value.trim() || `${JENJANG[state.jenjang].name} ${JENJANG[state.jenjang].kelas}`
    );
    await saveToSheets(payload);
  });

  $('#btn-download-csv').addEventListener('click', downloadCSV);

  // Identitas siswa
  $('#btn-save-student').addEventListener('click', saveStudent);
  $('#btn-change-student').addEventListener('click', () => {
    localStorage.removeItem(STUDENT_KEY);
    state.student = null;
    renderStudentUI();
  });

  // Halaman guru
  $('#btn-teacher').addEventListener('click', () => { renderTeacher(); showScreen('screen-teacher'); });
  $('#btn-teacher-back').addEventListener('click', () => showScreen('screen-home'));
  $('#t-filter-name').addEventListener('input', renderTeacher);
  $('#t-filter-mapel').addEventListener('change', renderTeacher);
  $('#t-export').addEventListener('click', exportTeacherCSV);
  $('#t-clear').addEventListener('click', () => {
    if (window.confirm('Hapus semua rekap nilai di perangkat ini? Tindakan ini tidak bisa dibatalkan.')) {
      store.set(RECORDS_KEY, []);
      renderTeacher();
    }
  });

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {/* diabaikan */});
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
