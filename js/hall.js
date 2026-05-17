// ============================================================
// 殿堂入り (Hall of Fame)
// ============================================================
import {
  HALL_KEY, HALL_LIFESPAN_THRESHOLD, HALL_REPRO_THRESHOLD, HALL_MAX_LEN, HALL_MAX_ENTRIES,
  MEM_SIZE,
} from './constants.js';
import { mem, state } from './state.js';
import { LABEL_COLORS } from './colors.js';
import { t, labelName } from './i18n.js';
import { injectGenome } from './inject.js';

export function loadHall() {
  try {
    const s = localStorage.getItem(HALL_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) state.hallOfFame = parsed;
    }
  } catch (e) {
    state.hallOfFame = [];
  }
}

export function saveHall() {
  try { localStorage.setItem(HALL_KEY, JSON.stringify(state.hallOfFame)); } catch (e) { /* ignore */ }
}

export function tryAddToHall(c) {
  const lifespan = state.cycle - c.birthCycle;
  if (lifespan < HALL_LIFESPAN_THRESHOLD) return;
  if (c.reproductions < HALL_REPRO_THRESHOLD) return;
  if (c.region.size > HALL_MAX_LEN) return;  // 祖先サイズ近辺は除外
  const bytes = new Array(c.region.size);
  for (let i = 0; i < c.region.size; i++) {
    bytes[i] = mem[(c.region.start + i) % MEM_SIZE];
  }
  const hashHex = c.genomeHash.toString(16);
  // 同じ hash & length は更新
  const existing = state.hallOfFame.find(h => h.hashHex === hashHex && h.length === c.region.size);
  if (existing) {
    if (lifespan > existing.lifespan || c.reproductions > existing.reproductions) {
      existing.lifespan = Math.max(existing.lifespan, lifespan);
      existing.age = Math.max(existing.age || 0, c.age);
      existing.reproductions = Math.max(existing.reproductions, c.reproductions);
      existing.savedAt = Date.now();
      saveHall();
    }
    return;
  }
  state.hallOfFame.push({
    hashHex,
    length: c.region.size,
    label: c.label,
    gen: c.generation,
    age: c.age,
    lifespan,
    reproductions: c.reproductions,
    bytes,
    savedAt: Date.now(),
  });
  // 上限を超えたら lifespan*repro の低いものから削除
  if (state.hallOfFame.length > HALL_MAX_ENTRIES) {
    state.hallOfFame.sort((a, b) => (b.lifespan * b.reproductions) - (a.lifespan * a.reproductions));
    state.hallOfFame.length = HALL_MAX_ENTRIES;
  }
  saveHall();
  renderHall();
}

export function renderHall() {
  const list = document.getElementById('hall-list');
  if (!list) return;
  const countEl = document.getElementById('hall-count');
  if (countEl) countEl.textContent = state.hallOfFame.length;
  if (state.hallOfFame.length === 0) {
    list.innerHTML = `<div class="help" style="padding:6px;">${t('hall.empty')}</div>`;
    return;
  }
  // lifespan × reproductions のスコア順 (進化的成功度)
  const sorted = [...state.hallOfFame].sort((a, b) => ((b.lifespan || 0) * b.reproductions) - ((a.lifespan || 0) * a.reproductions));
  list.innerHTML = sorted.map(h => `
    <div class="hall-row" data-idx="${state.hallOfFame.indexOf(h)}">
      <span style="color:${LABEL_COLORS[h.label] || '#999'};font-weight:600;">${labelName(h.label) || '?'}</span>
      <span>len=${h.length}</span>
      <span class="meta">life=${h.lifespan || h.age}</span>
      <span class="meta">×${h.reproductions}</span>
      <span class="meta">g${h.gen}</span>
      <span class="meta">#${h.hashHex.slice(0, 4)}</span>
      <span class="hall-actions">
        <button class="hall-inject" title="${t('tooltip.hall_inject')}" data-idx="${state.hallOfFame.indexOf(h)}">▶</button>
        <button class="hall-show" title="${t('tooltip.hall_show')}" data-idx="${state.hallOfFame.indexOf(h)}">📋</button>
        <button class="hall-del danger" title="${t('tooltip.hall_del')}" data-idx="${state.hallOfFame.indexOf(h)}">×</button>
      </span>
    </div>`).join('');
  // イベント
  for (const btn of list.querySelectorAll('.hall-inject')) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const h = state.hallOfFame[parseInt(btn.dataset.idx)];
      if (!h) return;
      const res = injectGenome(h.bytes);
      const status = document.getElementById('inject-status');
      if (status) {
        status.textContent = res.msg;
        status.className = res.ok ? 'ok' : 'err';
      }
    });
  }
  for (const btn of list.querySelectorAll('.hall-show')) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const h = state.hallOfFame[parseInt(btn.dataset.idx)];
      if (!h) return;
      document.getElementById('custom-genome').value = '[' + h.bytes.join(',') + ']';
    });
  }
  for (const btn of list.querySelectorAll('.hall-del')) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.idx);
      state.hallOfFame.splice(idx, 1);
      saveHall();
      renderHall();
    });
  }
}
