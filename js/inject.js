// ============================================================
// カスタムゲノム注入
// ============================================================
import { OP, NUM_OPS, MIN_DAUGHTER, MAX_DAUGHTER, MEM_SIZE } from './constants.js';
import { mem, owner, genomes, state } from './state.js';
import { findFreeRegion } from './vm.js';
import { newCreature } from './creatures.js';
import { t, labelName } from './i18n.js';

export function parseGenomeInput(text) {
  text = text.trim();
  if (!text) return null;
  // JSON 配列形式: [1, 2, 3]
  if (text.startsWith('[')) {
    try {
      const arr = JSON.parse(text);
      if (Array.isArray(arr) && arr.every(x => Number.isInteger(x) && x >= 0 && x < NUM_OPS)) {
        return arr;
      }
    } catch (e) { /* fall through */ }
  }
  // 命令名 or 数字のカンマ/空白区切り (コメント行と末尾コメントを除去)
  const cleaned = text.split('\n').filter(l => !l.trim().startsWith('#')).join(' ');
  const parts = cleaned.split(/[\s,]+/).filter(s => s);
  const nums = [];
  for (const p of parts) {
    if (/^\d+$/.test(p)) {
      const n = parseInt(p, 10);
      if (n >= 0 && n < NUM_OPS) { nums.push(n); continue; }
      return null;
    }
    if (OP[p] !== undefined) { nums.push(OP[p]); continue; }
    return null;
  }
  return nums.length ? nums : null;
}

export function injectGenome(bytes) {
  if (!bytes || bytes.length < MIN_DAUGHTER) {
    return { ok: false, msg: t('inject.too_short', { len: bytes ? bytes.length : 0, min: MIN_DAUGHTER }) };
  }
  if (bytes.length > MAX_DAUGHTER) {
    return { ok: false, msg: t('inject.too_long', { len: bytes.length, max: MAX_DAUGHTER }) };
  }
  const start = findFreeRegion(bytes.length);
  if (start < 0) {
    return { ok: false, msg: t('inject.no_space') };
  }
  for (let i = 0; i < bytes.length; i++) mem[start + i] = bytes[i];
  const c = newCreature(start, bytes.length, 0, null);
  state.creatures.push(c);
  state.totalBirths++;
  return { ok: true, msg: t('inject.success', { id: c.id, len: bytes.length, label: labelName(c.label), start }) };
}

// 全リセット + 単独投入 (祖先を置かないクリーン起動)
export function injectFresh(bytes) {
  if (bytes.length < MIN_DAUGHTER || bytes.length > MAX_DAUGHTER) {
    return { ok: false, msg: t('inject.out_of_range', { min: MIN_DAUGHTER, max: MAX_DAUGHTER }) };
  }
  mem.fill(0);
  owner.fill(-1);
  state.creatures = [];
  state.nextId = 1;
  state.cycle = 0;
  state.totalBirths = 0;
  state.totalDeaths = 0;
  state.mutations = 0;
  state.generationMax = 0;
  genomes.clear();
  state.selectedCreature = null;
  state.stagnationCounter = 0;
  state.lastTotalBirths = 0;
  state.stagnationKills = 0;
  state.stagnationResets = 0;
  for (let i = 0; i < MEM_SIZE; i++) mem[i] = Math.floor(Math.random() * NUM_OPS);
  // 中央に投入
  const start = Math.floor((MEM_SIZE - bytes.length) / 2);
  for (let i = 0; i < bytes.length; i++) mem[start + i] = bytes[i];
  const c = newCreature(start, bytes.length, 0, null);
  state.creatures.push(c);
  state.totalBirths++;
  return { ok: true, msg: t('inject.fresh_done', { id: c.id, len: bytes.length, label: labelName(c.label), start }) };
}
