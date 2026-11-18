/* =========================================================
   GemEdu — Application Logic
   Mobile-first practice engine
   ========================================================= */

'use strict';

/* ---------- Configuration ---------- */
const SUBJECTS = [
  { id: 'math', name: 'Matematika',       emoji: '➗' },
  { id: 'bin',  name: 'Bahasa Indonesia', emoji: '📖' },
  { id: 'ipa',  name: 'IPA',              emoji: '🔬' },
  { id: 'ips',  name: 'IPS',              emoji: '🗺️' },
  { id: 'ing',  name: 'Bahasa Inggris',   emoji: '🗣️' },
];
const JENJANG_NAMES = { sd: 'SD', smp: 'SMP', sma: 'SMA' };
const QUESTIONS_PER_SESSION = 15;        // questions per quiz run
const STORAGE_KEY = 'gemedu:v1';

/* ---------- Helpers ---------- */
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const store = {
  get(k)  { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } },
  set(k,v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch {/* noop */} }
};

/* ---------- State ---------- */
const state = {
  jenjang: null,
  subject: null,
  session: [],
  index: 0,
  answers: [],
  startedAt: 0,
  finishedAt: 0,
  timerId: null,
  elapsedSec: 0,
};

/* ---------- Screen management ---------- */
function showScreen(id) {
  $$('.screen').forEach(s => {
    s.hidden = s.id !== id;
    s.classList.toggle('active', s.id === id);
  });
  window.scrollTo({ top: 0, behavior: 'instant' });
}

/* ---------- Home rendering ---------- */
function renderSubjects() {
  const grid = $('.subject-grid');
  grid.innerHTML = '';
  for (const s of SUBJECTS) {
    const btn = document.createElement('button');
    btn.className = 'subject-btn';
    btn.setAttribute('role', 'option');
    btn.dataset.subject = s.id;
    btn.innerHTML = `<span class="subject-emoji" aria-hidden="true">${s.emoji}</span>
      <span class="subject-name">${s.name}<small class="subject-meta"></small></span>`;
    btn.addEventListener('click', () => startQuiz(s.id));
    grid.appendChild(btn);
  }
}

function updateJenjangUI() {
  $$('.jenjang-btn').forEach(b => {
    const active = b.dataset.jenjang === state.jenjang;
    b.classList.toggle('active', active);
    b.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  // Update subject meta counts
  if (state.jenjang) {
    $$('.subject-btn').forEach(btn => {
      const s = btn.dataset.subject;
      const pool = QUESTIONS.filter(q => q.j === state.jenjang && q.p === s);
      btn.querySelector('.subject-meta').textContent = pool.length > 0 ? pool.length + ' soal' : 'segera';
      btn.disabled = pool.length === 0;
      btn.style.opacity = pool.length === 0 ? '.4' : '1';
    });
  }
}

/* ---------- Start quiz ---------- */
function startQuiz(subject) {
  if (!state.jenjang) {
    // Default jenjang = SD if none chosen
    state.jenjang = 'sd';
    $$('.jenjang-btn')[0].classList.add('active');
  }
  const pool = QUESTIONS.filter(q => q.j === state.jenjang && q.p === subject);
  if (pool.length === 0) return;

  // Shuffle & pick
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  state.subject = subject;
  state.session = shuffled.slice(0, Math.min(QUESTIONS_PER_SESSION, shuffled.length));
  state.index = 0;
  state.answers = new Array(state.session.length).fill(null);
  state.startedAt = Date.now();
  state.elapsedSec = 0;
  state.finishedAt = 0;

  const subjName = SUBJECTS.find(s => s.id === subject).name;
  $('#quiz-subject').textContent = subjName;

  showScreen('screen-quiz');
  startTimer();
  renderQuestion();
}

/* ---------- Timer ---------- */
function startTimer() {
  if (state.timerId) clearInterval(state.timerId);
  state.timerId = setInterval(() => {
    state.elapsedSec = Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000));
    const m = String(Math.floor(state.elapsedSec / 60)).padStart(2, '0');
    const s = String(state.elapsedSec % 60).padStart(2, '0');
    $('#quiz-timer').textContent = `${m}:${s}`;
    $('#quiz-timer').classList.toggle('running', s % 2 === 0);
  }, 1000);
}
function stopTimer() { if (state.timerId) clearInterval(state.timerId); state.timerId = null; }

/* ---------- Render question ---------- */
function renderQuestion() {
  const q = state.session[state.index];
  if (!q) return finishQuiz();

  $('#question-jenjang').textContent = `${JENJANG_NAMES[q.j]} · Kelas ${state.jenjang === 'sd' ? '6' : state.jenjang === 'smp' ? '9' : '12'} · Soal ${state.index + 1}`;
  $('#question-text').textContent = q.t;
  $('#quiz-counter').textContent = `Soal ${state.index + 1} / ${state.session.length}`;

  const box = $('#options');
  box.innerHTML = '';
  const letters = ['A', 'B', 'C', 'D'];
  q.o.forEach((opt, i) => {
    const label = document.createElement('button');
    label.className = 'option';
    label.type = 'button';
    label.setAttribute('role', 'radio');
    label.setAttribute('aria-checked', state.answers[state.index] === i ? 'true' : 'false');
    label.innerHTML = `<span class="option-prefix">${letters[i]}</span><span class="option-text">${opt}</span>`;
    label.addEventListener('click', () => {
      state.answers[state.index] = i;
      box.querySelectorAll('.option').forEach((o, idx) => o.setAttribute('aria-checked', idx === i ? 'true' : 'false'));
    });
    box.appendChild(label);
  });

  // Progress
  const pct = ((state.index + 1) / state.session.length) * 100;
  $('#quiz-progress-bar').style.width = pct + '%';

  // Buttons
  $('#btn-prev').disabled = state.index === 0;
  $('#btn-prev').style.opacity = state.index === 0 ? '.4' : '1';
  $('#btn-next').textContent = state.index === state.session.length - 1 ? 'Selesai & Nilai ✓' : 'Selanjutnya →';
}

/* ---------- Finish quiz & score ---------- */
function finishQuiz() {
  stopTimer();
  state.finishedAt = Date.now();

  let correct = 0, wrong = 0, empty = 0;
  const detail = [];
  state.session.forEach((q, i) => {
    const ans = state.answers[i];
    if (ans === null || ans === undefined) { empty++; detail.push({ q, i, status: 'unanswered', user: null }); }
    else if (ans === q.k) { correct++; detail.push({ q, i, status: 'correct', user: ans }); }
    else { wrong++; detail.push({ q, i, status: 'wrong', user: ans }); }
  });

  const total = state.session.length;
  const pct = Math.round((correct / total) * 100);

  // Verdict
  let verdict = 'Ayo, fokus lagi ya.';
  if (pct >= 90) verdict = 'Luar biasa — kamu sudah sangat siap!';
  else if (pct >= 75) verdict = 'Bagus! Sedikit lagi menuju sempurna.';
  else if (pct >= 60) verdict = 'Cukup. Coba ulangi dan tingkatkan.';

  $('#result-percent').textContent = pct + '%';
  $('#result-verdict').textContent = verdict;
  $('#result-ring').style.setProperty('--pct', pct);

  $('#stat-correct').textContent = correct;
  $('#stat-wrong').textContent   = wrong;
  $('#stat-empty').textContent   = empty;
  const mm = Math.floor(state.elapsedSec / 60), ss = state.elapsedSec % 60;
  $('#stat-time').textContent = `${mm}:${String(ss).padStart(2,'0')}`;

  // Detail list
  const list = $('#result-answers');
  list.innerHTML = '';
  const letters = ['A','B','C','D'];
  state.session.forEach((q, i) => {
    const ans = state.answers[i];
    const status = ans == null ? 'unanswered' : (ans === q.k ? 'correct' : 'wrong');
    const div = document.createElement('div');
    div.className = 'ans-item ' + status;
    div.innerHTML = `<span class="ans-q">${i + 1}. ${q.t}</span>
      <span class="ans-detail">
        ${ans == null ? 'Tidak dijawab.' : 'Jawaban kamu: ' + letters[ans] + '. ' + q.o[ans] + ' · Kunci: ' + letters[q.k] + '. ' + q.o[q.k]}
      </span>`;
    list.appendChild(div);
  });

  // Store result
  store.set(STORAGE_KEY + ':last', {
    jenjang: state.jenjang, subject: state.subject, pct, correct, wrong, empty,
    elapsedSec: state.elapsedSec, finishedAt: state.finishedAt,
  });

  showScreen('screen-result');
}

/* ---------- Google Sheets: save via Apps Script Web App ---------- */
/* Tempel Web app URL dari google-apps-script.gs di sini (lihat README). */
const SHEETS_ENDPOINT = '';

const SHEETS_ENDPOINT_KEY = STORAGE_KEY + ':sheets-endpoint';
function getSheetsEndpoint() {
  return SHEETS_ENDPOINT || store.get(SHEETS_ENDPOINT_KEY) || '';
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

/* ---------- CSV export ---------- */
function downloadCSV() {
  const rows = [
    ['Nama','Kelas','Jenjang','Mapel','Total Soal','Benar','Salah','Kosong','Nilai (%)','Waktu (dtk)','Waktu Selesai']
  ];
  const name = $('#input-name').value.trim() || 'Siswa';
  const klass = $('#input-kelas').value.trim() || JENJANG_NAMES[state.jenjang];
  rows.push([name, klass, JENJANG_NAMES[state.jenjang], $('#quiz-subject').textContent,
    state.session.length,
    state.session.filter((q,i) => state.answers[i] === q.k).length,
    state.session.filter((q,i) => state.answers[i] !== null && state.answers[i] !== q.k).length,
    state.session.filter((q,i) => state.answers[i] == null).length,
    Math.round((state.session.filter((q,i) => state.answers[i] === q.k).length / state.session.length) * 100),
    state.elapsedSec,
    new Date(state.finishedAt).toLocaleString('id-ID')]);
  const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g,'""') + '"').join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `GemEdu_${name.replace(/\s+/g,'_')}_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------- Wiring ---------- */
function init() {
  renderSubjects();

  // Jenjang default: SD (kelas 6) supaya jumlah soal langsung kelihatan
  state.jenjang = 'sd';
  updateJenjangUI();

  // Jenjang picker
  $$('.jenjang-btn').forEach(btn => btn.addEventListener('click', () => {
    state.jenjang = btn.dataset.jenjang;
    updateJenjangUI();
  }));

  // Back button
  $('#btn-back').addEventListener('click', () => {
    stopTimer();
    showScreen('screen-home');
  });

  // Quiz navigation
  $('#btn-prev').addEventListener('click', () => {
    if (state.index > 0) { state.index--; renderQuestion(); }
  });
  $('#btn-next').addEventListener('click', () => {
    if (state.index < state.session.length - 1) { state.index++; renderQuestion(); }
    else finishQuiz();
  });

  // Result actions
  $('#btn-retry').addEventListener('click', () => { state.index = 0; state.answers = new Array(state.session.length).fill(null); state.startedAt = Date.now(); startTimer(); showScreen('screen-quiz'); renderQuestion(); });
  $('#btn-home').addEventListener('click', () => showScreen('screen-home'));

  // Sheets form
  $('#form-sheets').addEventListener('submit', async e => {
    e.preventDefault();
    $('#sheets-status').textContent = 'Menyimpan…';
    $('#sheets-status').className = 'sheets-status';
    const payload = {
      timestamp: Date.now(),
      name: $('#input-name').value.trim(),
      class: $('#input-kelas').value.trim(),
      jenjang: JENJANG_NAMES[state.jenjang],
      subject: $('#quiz-subject').textContent,
      total: state.session.length,
      correct: state.session.filter((q,i) => state.answers[i] === q.k).length,
      wrong: state.session.filter((q,i) => state.answers[i] !== null && state.answers[i] !== q.k).length,
      empty: state.session.filter((q,i) => state.answers[i] == null).length,
      pct: Math.round((state.session.filter((q,i) => state.answers[i] === q.k).length / state.session.length) * 100),
      elapsedSec: state.elapsedSec,
    };
    await saveToSheets(payload);
  });
  $('#btn-download-csv').addEventListener('click', downloadCSV);

  // Service worker: bisa dibuka offline & "Add to Home Screen"
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {/* diabaikan */});
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
