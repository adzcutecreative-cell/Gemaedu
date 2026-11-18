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

/* ---------- Helpers ---------- */
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const store = {
  get(k)  { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } },
  set(k,v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch {/* noop */} }
};
const LETTERS = ['A', 'B', 'C', 'D', 'E'];

/* ---------- State ---------- */
const state = {
  jenjang: 'sd',
  subject: null,
  mode: 60,               // 20 | 60
  session: [],
  index: 0,
  answers: [],
  startedAt: 0,
  finishedAt: 0,
  timerId: null,
  elapsedSec: 0,
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

function startQuiz(subject) {
  const pool = bank(state.jenjang, subject);
  if (!pool.length) return;

  state.subject = subject;
  state.session = shuffle(pool).slice(0, Math.min(state.mode, pool.length));
  state.index = 0;
  state.answers = new Array(state.session.length).fill(null);
  state.startedAt = Date.now();
  state.finishedAt = 0;
  state.elapsedSec = 0;

  $('#quiz-subject').textContent = SUBJECTS[subject].name;
  showScreen('screen-quiz');
  startTimer();
  renderQuestion();
}

/* ---------- Timer ---------- */
function startTimer() {
  if (state.timerId) clearInterval(state.timerId);
  $('#quiz-timer').textContent = '00:00';
  $('#quiz-timer').classList.add('running');
  state.timerId = setInterval(() => {
    state.elapsedSec = Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000));
    const m = String(Math.floor(state.elapsedSec / 60)).padStart(2, '0');
    const s = String(state.elapsedSec % 60).padStart(2, '0');
    $('#quiz-timer').textContent = `${m}:${s}`;
  }, 1000);
}
function stopTimer() {
  if (state.timerId) clearInterval(state.timerId);
  state.timerId = null;
  $('#quiz-timer').classList.remove('running');
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
  });

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

/* ---------- Wiring ---------- */
function init() {
  state.mode = store.get(MODE_KEY) || 60;
  updateModeUI();
  updateJenjangUI();

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

  $('#btn-retry').addEventListener('click', () => {
    state.index = 0;
    state.answers = new Array(state.session.length).fill(null);
    state.startedAt = Date.now();
    state.elapsedSec = 0;
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

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {/* diabaikan */});
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
