// ============================================================
// 個体ライフサイクル: 生成・分類・系統管理
// ============================================================
import { OP, MEM_SIZE } from './constants.js';
import { mem, owner, genomes, state } from './state.js';
import { hslColor } from './colors.js';

export function newCreature(start, size, gen, parent) {
  const c = {
    id: state.nextId++,
    ip: start,
    ax: 0, bx: 0, cx: 0, dx: 0,
    stack: [],
    skipNext: false,
    region: { start, size },
    daughter: null,         // { start, size } | null
    age: 0,
    birthCycle: state.cycle,   // 壁時計 tick
    errors: 0,
    reproductions: 0,
    generation: gen,
    genomeHash: 0,
    color: hslColor(gen),
    // 動的計測: ip が領域内/領域外にいた step 数
    insideCycles: 0,
    outsideCycles: 0,
    // 静的分類 (newCreature 時にゲノムから決定)
    label: 'unknown',
    // 親個体への参照 (系統樹)
    parentId: parent ? parent.id : null,
    parentGenomeKey: parent ? parent.genomeKey : null,
  };
  // 所有権を更新
  for (let i = 0; i < size; i++) {
    owner[(start + i) % MEM_SIZE] = c.id;
  }
  c.genomeHash = hashRegion(start, size);
  c.label = classifyGenome(start, size);
  registerGenome(c, parent);
  if (gen > state.generationMax) state.generationMax = gen;
  return c;
}

// 静的命令プロファイル分類
// - self     : MAL + MOV_AB + DIVIDE すべて持つ (祖先タイプ)
// - parasite : DIVIDE はあるが MAL か MOV_AB が欠落 (借用型)
// - degenerate : DIVIDE すらない
export function classifyGenome(start, size) {
  let hasMal = false, hasMov = false, hasDivide = false;
  for (let i = 0; i < size; i++) {
    const b = mem[(start + i) % MEM_SIZE];
    if (b === OP.MAL) hasMal = true;
    else if (b === OP.MOV_AB) hasMov = true;
    else if (b === OP.DIVIDE) hasDivide = true;
  }
  if (!hasDivide) return 'degenerate';
  if (hasMal && hasMov) return 'self';
  return 'parasite';
}

export function hashRegion(start, size) {
  // 簡易ハッシュ (FNV-1a)
  let h = 2166136261 >>> 0;
  for (let i = 0; i < size; i++) {
    h ^= mem[(start + i) % MEM_SIZE];
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

export function registerGenome(c, parent) {
  const key = `${c.genomeHash}:${c.region.size}`;
  let g = genomes.get(key);
  if (!g) {
    // 初出時にバイト列のスナップショットを保存(genome が絶滅しても中身が見られるように)
    const bytes = new Uint8Array(c.region.size);
    for (let i = 0; i < c.region.size; i++) {
      bytes[i] = mem[(c.region.start + i) % MEM_SIZE];
    }
    g = {
      key,
      hash: c.genomeHash,
      length: c.region.size,
      count: 0,
      firstSeen: state.cycle,
      color: c.color,
      gen: c.generation,
      label: c.label,
      parentKey: parent ? parent.genomeKey : null,
      peakCount: 0,
      totalSeen: 0,
      bytes,
    };
    genomes.set(key, g);
  }
  g.count++;
  g.totalSeen++;
  if (g.count > g.peakCount) g.peakCount = g.count;
  c.genomeKey = key;
}

export function unregisterGenome(c) {
  const g = genomes.get(c.genomeKey);
  if (g) {
    g.count--;
    // 系統樹の連鎖を保つため、count=0 でも genome 自体は削除しない
  }
}

// genome の系統チェーン (現在 → 親 → 祖父 → ... → 祖先) を返す
export function genomeLineage(key, maxDepth = 30) {
  const chain = [];
  const seen = new Set();
  let k = key;
  while (k && !seen.has(k) && chain.length < maxDepth) {
    seen.add(k);
    const g = genomes.get(k);
    if (!g) break;
    chain.push(g);
    k = g.parentKey;
  }
  return chain;
}
