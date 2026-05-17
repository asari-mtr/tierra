// ============================================================
// エントリポイント: 各モジュールを束ね、DOM イベントを配線してメインループを回す
// ============================================================
import {
  COLS, CELL, MEM_SIZE, ANCESTOR, SHRUNK_31, SHRUNK_24, PARASITE_14,
  HALL_MAX_ENTRIES, HUE_SHIFT_PER_SEC,
} from './constants.js';
import { owner, state } from './state.js';
import { applyHueShift } from './colors.js';
import { t, setLang } from './i18n.js';
import { init, tick } from './vm.js';
import { canvas, render } from './render.js';
import { updateUI, updateInspector, buildLegend } from './ui.js';
import { renderComparison, copyComparisonToClipboard } from './comparison.js';
import { parseGenomeInput, injectGenome, injectFresh } from './inject.js';
import { loadHall, saveHall, tryAddToHall, renderHall } from './hall.js';

// ============================================================
// 言語切替時に動的 UI を再構築するフック
// ============================================================
function onLangChange() {
  buildLegend();
  updateUI();
  updateInspector();
  renderHall();
  renderComparison();
  const btnPlay = document.getElementById('btn-play');
  if (btnPlay) btnPlay.textContent = t(state.running ? 'btn.pause' : 'btn.play');
  const speedVal = document.getElementById('val-speed');
  const speedSlider = document.getElementById('ctrl-speed');
  if (speedVal && speedSlider) speedVal.textContent = speedSlider.value + ' ' + t('unit.tick_per_frame');
}

// ============================================================
// コントロール配線
// ============================================================
document.getElementById('btn-play').addEventListener('click', () => {
  state.running = !state.running;
  document.getElementById('btn-play').textContent = t(state.running ? 'btn.pause' : 'btn.play');
});

document.getElementById('btn-step').addEventListener('click', () => {
  if (state.running) {
    state.running = false;
    document.getElementById('btn-play').textContent = t('btn.play');
  }
  tick(tryAddToHall);
  render();
  updateUI();
});

document.getElementById('btn-reset').addEventListener('click', () => {
  init();
});

document.getElementById('btn-clear').addEventListener('click', () => {
  init();
  state.mutations = 0;
});

const speedSlider = document.getElementById('ctrl-speed');
const speedVal = document.getElementById('val-speed');
speedSlider.addEventListener('input', e => {
  state.cyclesPerFrame = parseInt(e.target.value);
  speedVal.textContent = state.cyclesPerFrame + ' ' + t('unit.tick_per_frame');
});

const copySlider = document.getElementById('ctrl-copy');
const copyVal = document.getElementById('val-copy');
function updateCopyRate() {
  const v = parseInt(copySlider.value);
  state.copyErrorRate = v === 0 ? 0 : Math.pow(10, -5 + v / 50);
  copyVal.textContent = state.copyErrorRate === 0 ? '0' : state.copyErrorRate.toExponential(1);
}
copySlider.addEventListener('input', updateCopyRate);

const cosmicSlider = document.getElementById('ctrl-cosmic');
const cosmicVal = document.getElementById('val-cosmic');
function updateCosmicRate() {
  const v = parseInt(cosmicSlider.value);
  state.cosmicRate = v === 0 ? 0 : Math.pow(10, -7 + v / 50);
  cosmicVal.textContent = state.cosmicRate === 0 ? '0' : state.cosmicRate.toExponential(1);
}
cosmicSlider.addEventListener('input', updateCosmicRate);

// クリックで個体選択
canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const cx = (e.clientX - rect.left) * scaleX;
  const cy = (e.clientY - rect.top) * scaleY;
  const col = Math.floor(cx / CELL);
  const row = Math.floor(cy / CELL);
  const addr = row * COLS + col;
  if (addr < 0 || addr >= MEM_SIZE) return;
  const id = owner[addr];
  if (id === -1) { state.selectedCreature = null; updateInspector(); return; }
  state.selectedCreature = state.creatures.find(c => c.id === id) || null;
  updateInspector();
});

document.getElementById('btn-copy-genome').addEventListener('click', () => {
  const ta = document.getElementById('inspect-genome');
  if (!ta.value) return;
  ta.select();
  navigator.clipboard.writeText(ta.value).then(() => {
    const btn = document.getElementById('btn-copy-genome');
    const orig = btn.textContent;
    btn.textContent = t('btn.copied');
    setTimeout(() => btn.textContent = orig, 1200);
  }).catch(() => {
    document.execCommand && document.execCommand('copy');
  });
});

document.getElementById('btn-deselect').addEventListener('click', () => {
  state.selectedCreature = null;
  updateInspector();
  updateUI();
});

// ============================================================
// カスタムゲノム注入
// ============================================================
document.getElementById('btn-inject').addEventListener('click', () => {
  const ta = document.getElementById('custom-genome');
  const status = document.getElementById('inject-status');
  const bytes = parseGenomeInput(ta.value);
  if (!bytes) {
    status.textContent = t('inject.parse_fail');
    status.className = 'err';
    return;
  }
  const res = injectGenome(bytes);
  status.textContent = res.msg;
  status.className = res.ok ? 'ok' : 'err';
});

document.getElementById('btn-inject-fresh').addEventListener('click', () => {
  const ta = document.getElementById('custom-genome');
  const status = document.getElementById('inject-status');
  const bytes = parseGenomeInput(ta.value);
  if (!bytes) {
    status.textContent = t('inject.parse_fail');
    status.className = 'err';
    return;
  }
  const res = injectFresh(bytes);
  status.textContent = res.msg;
  status.className = res.ok ? 'ok' : 'err';
});

document.getElementById('btn-sample-ancestor').addEventListener('click', () => {
  document.getElementById('custom-genome').value = '[' + ANCESTOR.join(',') + ']';
});
document.getElementById('btn-sample-shrunk').addEventListener('click', () => {
  document.getElementById('custom-genome').value = '[' + SHRUNK_31.join(',') + ']';
});
document.getElementById('btn-sample-24').addEventListener('click', () => {
  document.getElementById('custom-genome').value = '[' + SHRUNK_24.join(',') + ']';
});
document.getElementById('btn-sample-parasite14').addEventListener('click', () => {
  document.getElementById('custom-genome').value = '[' + PARASITE_14.join(',') + ']';
});

// ============================================================
// 比較ビューのボタン
// ============================================================
document.getElementById('btn-clear-compare').addEventListener('click', () => {
  state.comparedGenomes.length = 0;
  renderComparison();
  updateInspector();
});

document.getElementById('btn-compare-export').addEventListener('click', () => {
  const text = copyComparisonToClipboard();
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('btn-compare-export');
    const orig = btn.textContent;
    btn.textContent = t('btn.copied');
    setTimeout(() => btn.textContent = orig, 1200);
  });
});

// ============================================================
// Hall of Fame コントロール
// ============================================================
document.getElementById('btn-hall-clear').addEventListener('click', () => {
  if (!confirm(t('hall.confirm_clear'))) return;
  state.hallOfFame = [];
  saveHall();
  renderHall();
});

document.getElementById('btn-hall-export').addEventListener('click', () => {
  const json = JSON.stringify(state.hallOfFame, null, 2);
  navigator.clipboard.writeText(json).then(() => {
    const btn = document.getElementById('btn-hall-export');
    const orig = btn.textContent;
    btn.textContent = t('btn.copied');
    setTimeout(() => btn.textContent = orig, 1200);
  });
});

document.getElementById('btn-hall-import').addEventListener('click', () => {
  const text = prompt(t('hall.prompt_import'));
  if (!text) return;
  try {
    const arr = JSON.parse(text);
    if (Array.isArray(arr)) {
      // マージ (重複は最新で更新)
      for (const h of arr) {
        if (!h.hashHex || !h.bytes) continue;
        const existing = state.hallOfFame.find(e => e.hashHex === h.hashHex && e.length === h.length);
        if (existing) {
          if (h.age > existing.age) Object.assign(existing, h);
        } else {
          state.hallOfFame.push(h);
        }
      }
      if (state.hallOfFame.length > HALL_MAX_ENTRIES) {
        state.hallOfFame.sort((a, b) => b.age - a.age);
        state.hallOfFame.length = HALL_MAX_ENTRIES;
      }
      saveHall();
      renderHall();
      alert(t('hall.import_ok', { n: state.hallOfFame.length }));
    } else {
      alert(t('hall.not_array'));
    }
  } catch (e) {
    alert(t('hall.parse_fail', { msg: e.message }));
  }
});

// ============================================================
// 起動
// ============================================================
init();
updateCopyRate();
updateCosmicRate();
buildLegend();
loadHall();
renderHall();

// i18n 初期化 (静的テキストの置換と言語スイッチャーのバインド)
setLang(state.lang, { onLangChange }); // 動的 UI も含めて一括更新

const langSwitch = document.getElementById('lang-switch');
if (langSwitch) {
  langSwitch.value = state.lang;
  langSwitch.addEventListener('change', e => setLang(e.target.value, { onLangChange }));
}

// ============================================================
// メインループ
// ============================================================
let lastUI = 0;
let lastHueT = 0;
function loop(t) {
  if (state.running) {
    for (let k = 0; k < state.cyclesPerFrame; k++) tick(tryAddToHall);
  }
  if (lastHueT === 0) lastHueT = t;
  const dt = (t - lastHueT) / 1000;
  lastHueT = t;
  state.hueShift = (state.hueShift + HUE_SHIFT_PER_SEC * dt) % 360;
  applyHueShift(state.hueShift);
  render();
  if (t - lastUI > 200) {
    updateUI();
    lastUI = t;
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
