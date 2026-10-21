'use strict';

// Tabla de records local (Top 5 + mejor combo + líneas máximas) en localStorage.
const Records = (() => {
  const KEY = 'tetris.records';
  const MAX = 5;
  const NAME_MAX = 12;

  const startScreen = document.getElementById('start-screen');
  const startBody = document.getElementById('start-records');
  const overBox = document.getElementById('records-over');
  const overBody = document.getElementById('records-over-body');
  const startStats = document.getElementById('start-stats');
  const overStats = document.getElementById('over-stats');

  let data = load();
  let combo = 0;
  let maxCombo = 0;
  let pending = null; // { entry, rank, input } mientras se espera el nombre

  const num = v => (typeof v === 'number' && isFinite(v) && v >= 0 ? Math.floor(v) : 0);

  function load() {
    const empty = { top: [], bestCombo: 0, maxLines: 0 };
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (!raw || typeof raw !== 'object') return empty;
      const top = Array.isArray(raw.top) ? raw.top : [];
      return {
        top: top
          .filter(e => e && typeof e === 'object')
          .map(e => ({
            name: String(e.name ?? '').slice(0, NAME_MAX) || 'Anónimo',
            score: num(e.score), lines: num(e.lines), level: num(e.level),
            combo: num(e.combo), date: typeof e.date === 'string' ? e.date : '',
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, MAX),
        bestCombo: num(raw.bestCombo),
        maxLines: num(raw.maxLines),
      };
    } catch (e) {
      return empty;
    }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }

  function cell(tr, text, cls) {
    const td = document.createElement('td');
    td.textContent = text;
    if (cls) td.className = cls;
    tr.appendChild(td);
    return td;
  }

  // highlight: índice a resaltar; input: { rank, el, entry } para la fila con campo de nombre.
  function renderTable(tbody, highlight, input) {
    tbody.textContent = '';
    const rows = data.top;
    if (!rows.length && !input) {
      const tr = document.createElement('tr');
      cell(tr, 'Sin records todavía', 'rec-empty').colSpan = 4;
      tbody.appendChild(tr);
      return;
    }
    const total = Math.min(MAX, rows.length + (input ? 1 : 0));
    let i = 0;
    for (let n = 0; n < total; n++) {
      const tr = document.createElement('tr');
      cell(tr, `${n + 1}.`, 'rec-rank');
      if (input && n === input.rank) {
        tr.className = 'rec-highlight';
        const td = document.createElement('td');
        td.appendChild(input.el);
        tr.appendChild(td);
        cell(tr, input.entry.score.toLocaleString(), 'rec-num');
        cell(tr, `${input.entry.lines} L`, 'rec-num');
      } else {
        const e = rows[i++];
        if (n === highlight) tr.className = 'rec-highlight';
        cell(tr, e.name);
        cell(tr, e.score.toLocaleString(), 'rec-num');
        cell(tr, `${e.lines} L`, 'rec-num');
      }
      tbody.appendChild(tr);
    }
  }

  function renderStats(el) {
    el.textContent = `Mejor combo: ${data.bestCombo} · Líneas máx: ${data.maxLines}`;
  }

  function renderStart() {
    renderTable(startBody);
    renderStats(startStats);
  }

  function qualifies(score) {
    return score > 0 && (data.top.length < MAX || score > data.top[data.top.length - 1].score);
  }

  function commit() {
    if (!pending) return;
    const p = pending;
    pending = null;
    p.entry.name = p.input.value.trim().slice(0, NAME_MAX) || 'Anónimo';
    data.top.splice(p.rank, 0, p.entry);
    data.top = data.top.slice(0, MAX);
    save();
    renderTable(overBody, p.rank);
    renderStart();
  }

  return {
    showStart() {
      renderStart();
      startScreen.classList.remove('hidden');
    },

    onInit() {
      commit(); // guarda con nombre por defecto si se reinicia sin confirmar
      combo = 0;
      maxCombo = 0;
      startScreen.classList.add('hidden');
      overBox.classList.add('hidden');
    },

    onLinesCleared() {
      combo++;
      if (combo > maxCombo) maxCombo = combo;
    },

    commitPending: commit,

    onLockNoClear() {
      combo = 0;
    },

    onGameOver(score, lines, level) {
      commit();
      let changed = false;
      if (maxCombo > data.bestCombo) { data.bestCombo = maxCombo; changed = true; }
      if (lines > data.maxLines) { data.maxLines = lines; changed = true; }
      if (changed) save();

      overBox.classList.remove('hidden');
      renderStats(overStats);
      overStats.textContent += ` · Combo partida: ${maxCombo}`;
      if (qualifies(score)) {
        const rank = data.top.filter(e => e.score >= score).length;
        const entry = { name: '', score, lines, level, combo: maxCombo, date: new Date().toISOString() };
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'rec-input';
        input.maxLength = NAME_MAX;
        input.placeholder = 'Tu nombre';
        input.setAttribute('aria-label', 'Nombre del jugador');
        input.addEventListener('keydown', e => {
          e.stopPropagation(); // no disparar controles del juego
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
        });
        pending = { entry, rank, input };
        renderTable(overBody, undefined, { rank, el: input, entry });
        // retraso: evita que teclas aún pulsadas (Space/flechas) caigan en el campo
        setTimeout(() => { if (pending && pending.input === input) input.focus(); }, 700);
      } else {
        renderTable(overBody);
      }
      renderStart();
    },

    reset() {
      if (!confirm('¿Borrar todos los records?')) return;
      data = { top: [], bestCombo: 0, maxLines: 0 };
      try { localStorage.removeItem(KEY); } catch (e) {}
      renderStart();
      if (pending) { // la puntuación de esta partida sigue esperando nombre
        pending.rank = 0;
        renderTable(overBody, undefined, { rank: 0, el: pending.input, entry: pending.entry });
      } else {
        renderTable(overBody);
      }
      renderStats(overStats);
    },
  };
})();

window.addEventListener('pagehide', () => Records.commitPending());

document.getElementById('play-btn').addEventListener('click', e => {
  e.currentTarget.blur();
  init();
});

document.querySelectorAll('.records-reset').forEach(btn => {
  btn.addEventListener('click', () => {
    Records.reset();
    btn.blur();
  });
});
