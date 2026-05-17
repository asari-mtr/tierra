// ============================================================
// VM コア: テンプレート探索 / メモリ確保 / 個体実行 / Reaper / 放射線 / tick
// ============================================================
import {
  OP, MEM_SIZE, MAX_STACK, MAX_TEMPLATE, MAX_SEARCH,
  SLICE_PER_BYTE, SLICE_MIN, REAPER_THRESHOLD, MIN_DAUGHTER, MAX_DAUGHTER, MAX_CREATURES,
  ERROR_DEATH_THRESHOLD, ERROR_DEATH_RATIO, ERROR_DEATH_MIN_AGE,
  STAGNATION_STARVE, STAGNATION_STARVE_INTERVAL, STAGNATION_RESET,
  ANCESTOR, NUM_OPS,
} from './constants.js';
import { mem, owner, genomes, state } from './state.js';
import { newCreature, unregisterGenome } from './creatures.js';

// ============================================================
// 個体検査ユーティリティ
// ============================================================
export function inRegion(c, addr) {
  const a = (addr % MEM_SIZE + MEM_SIZE) % MEM_SIZE;
  if (isInRange(a, c.region.start, c.region.size)) return true;
  if (c.daughter && isInRange(a, c.daughter.start, c.daughter.size)) return true;
  return false;
}

export function isInRange(addr, start, size) {
  const end = (start + size) % MEM_SIZE;
  if (end > start) return addr >= start && addr < end;
  return addr >= start || addr < end;
}

// ============================================================
// テンプレート操作
// ============================================================
export function readTemplate(start) {
  const tmpl = [];
  for (let i = 0; i < MAX_TEMPLATE; i++) {
    const b = mem[(start + i) % MEM_SIZE];
    if (b !== OP.NOP0 && b !== OP.NOP1) break;
    tmpl.push(b);
  }
  return tmpl;
}

// dir = +1 (前方) または -1 (後方)
// from から探索開始, 補数テンプレートを検索, 一致開始アドレスを返す
export function findComplement(from, dir, tmpl) {
  if (tmpl.length === 0) return -1;
  const tlen = tmpl.length;
  for (let d = 0; d < MAX_SEARCH; d++) {
    const i = ((from + dir * d) % MEM_SIZE + MEM_SIZE) % MEM_SIZE;
    let match = true;
    for (let j = 0; j < tlen; j++) {
      const b = mem[(i + j) % MEM_SIZE];
      // 補数: 0 ↔ 1
      if (b !== (1 - tmpl[j])) { match = false; break; }
    }
    if (match) return i;
  }
  return -1;
}

// ============================================================
// メモリ確保 (空き領域探索)
// ============================================================
export function findFreeRegion(size) {
  if (size <= 0 || size > MAX_DAUGHTER) return -1;
  // ランダムな開始点から線形探索
  const seed = Math.floor(Math.random() * MEM_SIZE);
  let run = 0;
  let runStart = -1;
  for (let i = 0; i < MEM_SIZE; i++) {
    const idx = (seed + i) % MEM_SIZE;
    if (owner[idx] === -1) {
      if (run === 0) runStart = idx;
      run++;
      if (run >= size && (runStart + size) <= MEM_SIZE) {
        // 線形ブロックを優先 (ラップしない)
        return runStart;
      }
    } else {
      run = 0;
      runStart = -1;
    }
  }
  return -1;
}

export function markRegion(start, size, id) {
  for (let i = 0; i < size; i++) {
    owner[(start + i) % MEM_SIZE] = id;
  }
}

export function freeRegion(start, size, id) {
  for (let i = 0; i < size; i++) {
    const idx = (start + i) % MEM_SIZE;
    if (owner[idx] === id) owner[idx] = -1;
  }
}

// ============================================================
// 個体実行
// ============================================================
function stackPush(c, v) {
  if (c.stack.length >= MAX_STACK) c.stack.shift();
  c.stack.push(v);
}

function stackPop(c) {
  if (c.stack.length === 0) { c.errors++; return 0; }
  return c.stack.pop();
}

function step(c) {
  // 動的計測: ip が自領域内にいるか領域外にいるかを記録
  if (isInRange(c.ip, c.region.start, c.region.size)) c.insideCycles++;
  else c.outsideCycles++;
  if (c.skipNext) {
    c.skipNext = false;
    c.ip = (c.ip + 1) % MEM_SIZE;
    return;
  }
  const op = mem[c.ip];
  let advance = true;
  switch (op) {
    case OP.NOP0: case OP.NOP1:
    case OP.NOP_X1: case OP.NOP_X2: case OP.NOP_X3:
      break;
    case OP.ZERO: c.cx = 0; break;
    case OP.OR1: c.cx = c.cx | 1; break;
    case OP.SHL: c.cx = (c.cx << 1) & 0xFFFFFF; break;
    case OP.INC_A: c.ax = (c.ax + 1) % MEM_SIZE; break;
    case OP.INC_B: c.bx = (c.bx + 1) % MEM_SIZE; break;
    case OP.INC_C: c.cx = (c.cx + 1) | 0; break;
    case OP.DEC_C: c.cx = (c.cx - 1) | 0; break;
    case OP.IFZ: c.skipNext = (c.cx !== 0); break;
    case OP.IFNZ: c.skipNext = (c.cx === 0); break;
    case OP.SUB_BA: c.cx = (c.bx - c.ax) | 0; break;
    case OP.MOV_AB: {
      const dst = (c.bx % MEM_SIZE + MEM_SIZE) % MEM_SIZE;
      const src = (c.ax % MEM_SIZE + MEM_SIZE) % MEM_SIZE;
      if (inRegion(c, dst)) {
        let v = mem[src];
        if (Math.random() < state.copyErrorRate) {
          v ^= 1 << Math.floor(Math.random() * 5);
          v = v & 0x1F;
          state.mutations++;
        }
        mem[dst] = v;
      } else {
        c.errors++;
      }
      break;
    }
    case OP.PUSH_A: stackPush(c, c.ax); break;
    case OP.PUSH_B: stackPush(c, c.bx); break;
    case OP.PUSH_C: stackPush(c, c.cx); break;
    case OP.PUSH_D: stackPush(c, c.dx); break;
    case OP.POP_A: c.ax = stackPop(c); break;
    case OP.POP_B: c.bx = stackPop(c); break;
    case OP.POP_C: c.cx = stackPop(c); break;
    case OP.POP_D: c.dx = stackPop(c); break;
    case OP.JMP_F: case OP.JMP_B: {
      const tmpl = readTemplate((c.ip + 1) % MEM_SIZE);
      if (tmpl.length === 0) {
        c.ip = (c.ip + 1) % MEM_SIZE;
        advance = false;
        break;
      }
      const after = (c.ip + 1 + tmpl.length) % MEM_SIZE;
      const dir = (op === OP.JMP_F) ? 1 : -1;
      // 前方検索: テンプレートの直後から / 後方検索: JMP命令の直前から
      const searchFrom = (dir === 1) ? after : ((c.ip - 1 + MEM_SIZE) % MEM_SIZE);
      const match = findComplement(searchFrom, dir, tmpl);
      if (match >= 0) {
        c.ip = (match + tmpl.length) % MEM_SIZE;
      } else {
        c.ip = after;
        c.errors++;
      }
      advance = false;
      break;
    }
    case OP.CALL: {
      const tmpl = readTemplate((c.ip + 1) % MEM_SIZE);
      const after = (c.ip + 1 + tmpl.length) % MEM_SIZE;
      stackPush(c, after);
      if (tmpl.length === 0) { c.ip = after; advance = false; break; }
      const match = findComplement(after, 1, tmpl);
      if (match >= 0) c.ip = (match + tmpl.length) % MEM_SIZE;
      else { c.ip = after; c.errors++; }
      advance = false;
      break;
    }
    case OP.RET: {
      const ret = stackPop(c);
      c.ip = ((ret | 0) % MEM_SIZE + MEM_SIZE) % MEM_SIZE;
      advance = false;
      break;
    }
    case OP.ADR_F: case OP.ADR_B: {
      const tmpl = readTemplate((c.ip + 1) % MEM_SIZE);
      const after = (c.ip + 1 + tmpl.length) % MEM_SIZE;
      if (tmpl.length === 0) { c.ip = after; advance = false; break; }
      const dir = (op === OP.ADR_F) ? 1 : -1;
      const searchFrom = (dir === 1) ? after : ((c.ip - 1 + MEM_SIZE) % MEM_SIZE);
      const match = findComplement(searchFrom, dir, tmpl);
      if (match >= 0) c.ax = match;
      else c.errors++;
      c.ip = after;
      advance = false;
      break;
    }
    case OP.MAL: {
      const size = c.cx | 0;
      // 最小・最大サイズ制約 (極端に短い縮退寄生体を防ぐ)
      if (size < MIN_DAUGHTER || size > MAX_DAUGHTER) { c.errors++; break; }
      // 以前の確保を解放
      if (c.daughter) {
        freeRegion(c.daughter.start, c.daughter.size, c.id);
        c.daughter = null;
      }
      const start = findFreeRegion(size);
      if (start < 0) { c.errors++; break; }
      c.daughter = { start, size };
      c.dx = start;
      markRegion(start, size, c.id);
      break;
    }
    case OP.DIVIDE: {
      if (!c.daughter) { c.errors++; break; }
      const d = c.daughter;
      c.daughter = null;
      // 生存能力チェック: 娘のコードに少なくとも 1 個の DIVIDE 命令が必要。
      // これがないと「自前で繁殖する手段」が無いので、永遠にホストを乗っ取り続ける
      // 縮退寄生体 (例: 全 NOP1 の個体) が大量発生してしまう。
      let hasDivide = false;
      for (let i = 0; i < d.size; i++) {
        if (mem[(d.start + i) % MEM_SIZE] === OP.DIVIDE) { hasDivide = true; break; }
      }
      if (!hasDivide) {
        freeRegion(d.start, d.size, c.id);
        c.errors++;
        break;
      }
      if (state.creatures.length < MAX_CREATURES) {
        const child = newCreature(d.start, d.size, c.generation + 1, c);
        state.creatures.push(child);
        state.totalBirths++;
        c.reproductions++;
      } else {
        // 個体数上限: 領域を解放
        freeRegion(d.start, d.size, c.id);
      }
      break;
    }
    default: c.errors++; break;
  }
  if (advance) c.ip = (c.ip + 1) % MEM_SIZE;
  c.age++;
}

// ============================================================
// 死神 (Reaper)
// ============================================================
export function memoryUsage() {
  let used = 0;
  for (let i = 0; i < MEM_SIZE; i++) if (owner[i] !== -1) used++;
  return used / MEM_SIZE;
}

function reaperScore(c) {
  // エラー多発 & 老齢 ほど死にやすい。
  // Ray のオリジナル: エラー1回で reaper queue を上に押し上げる仕組みに近づける。
  const errPenalty = c.errors * 30;
  const ageMinusRepro = Math.max(0, c.age - c.reproductions * 250);
  return errPenalty + ageMinusRepro;
}

export function killCreature(c) {
  freeRegion(c.region.start, c.region.size, c.id);
  if (c.daughter) freeRegion(c.daughter.start, c.daughter.size, c.id);
  unregisterGenome(c);
  state.totalDeaths++;
  if (state.selectedCreature === c) state.selectedCreature = null;
}

function runReaper() {
  const usage = memoryUsage();
  if (usage < REAPER_THRESHOLD) return;
  // メモリ圧迫度に応じて間引き量を増減
  const pressure = (usage - REAPER_THRESHOLD) / (1 - REAPER_THRESHOLD);
  const cullRatio = Math.max(0.001, Math.min(0.05, pressure * 0.05));
  const target = Math.max(1, Math.floor(state.creatures.length * cullRatio));
  const sorted = [...state.creatures].sort((a, b) => reaperScore(b) - reaperScore(a));
  for (let i = 0; i < target && i < sorted.length; i++) {
    killCreature(sorted[i]);
  }
  const killed = sorted.slice(0, target);
  state.creatures = state.creatures.filter(c => !killed.includes(c));
}

// ============================================================
// 放射線 (cosmic ray)
// ============================================================
function cosmicRays() {
  const expected = MEM_SIZE * state.cosmicRate;
  let count = Math.floor(expected) + (Math.random() < (expected - Math.floor(expected)) ? 1 : 0);
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * MEM_SIZE);
    mem[idx] = (mem[idx] ^ (1 << Math.floor(Math.random() * 5))) & 0x1F;
    state.mutations++;
  }
}

// ============================================================
// 初期化
// ============================================================
export function init() {
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

  // ランダムノイズを薄く撒く
  for (let i = 0; i < MEM_SIZE; i++) {
    mem[i] = Math.floor(Math.random() * NUM_OPS);
  }

  // 祖先を中央に配置
  const start = Math.floor((MEM_SIZE - ANCESTOR.length) / 2);
  for (let i = 0; i < ANCESTOR.length; i++) {
    mem[start + i] = ANCESTOR[i];
  }
  const c = newCreature(start, ANCESTOR.length, 0, null);
  state.creatures.push(c);
  state.totalBirths++;
}

// ============================================================
// メインループ (1 tick)
// onPostStep: 各個体の step ループ完了後に呼ばれるフック (殿堂入りチェック用)
// ============================================================
export function tick(onPostStep) {
  if (state.creatures.length === 0) {
    // 全滅したら祖先を再投入
    const start = findFreeRegion(ANCESTOR.length);
    if (start >= 0) {
      for (let i = 0; i < ANCESTOR.length; i++) mem[start + i] = ANCESTOR[i];
      const c = newCreature(start, ANCESTOR.length, 0, null);
      state.creatures.push(c);
      state.totalBirths++;
    }
    return;
  }
  // ランダム順実行 (公平性)
  const order = state.creatures.slice();
  for (let k = order.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1));
    [order[k], order[j]] = [order[j], order[k]];
  }
  for (const c of order) {
    // Slicer: 実行サイクル数をゲノム長に比例配分。
    const slice = Math.max(SLICE_MIN, c.region.size * SLICE_PER_BYTE);
    for (let s = 0; s < slice; s++) {
      step(c);
    }
  }
  cosmicRays();
  // 殿堂入りチェック (main.js から渡されたフック)
  if (onPostStep) {
    for (const c of state.creatures) onPostStep(c);
  }
  // 機能不全死: 極端なゾンビだけ淘汰
  const dead = [];
  for (const c of state.creatures) {
    if (c.errors > ERROR_DEATH_THRESHOLD) { dead.push(c); continue; }
    if (c.age > ERROR_DEATH_MIN_AGE && c.errors > c.age * ERROR_DEATH_RATIO && c.reproductions === 0) {
      dead.push(c);
    }
  }
  for (const c of dead) killCreature(c);
  if (dead.length > 0) state.creatures = state.creatures.filter(c => !dead.includes(c));
  runReaper();
  // 個体数調整 (オーバーフロー防止)
  if (state.creatures.length > MAX_CREATURES) {
    const sorted = [...state.creatures].sort((a, b) => reaperScore(b) - reaperScore(a));
    const cull = state.creatures.length - MAX_CREATURES;
    for (let i = 0; i < cull; i++) killCreature(sorted[i]);
    state.creatures = state.creatures.filter(c => sorted.slice(0, cull).indexOf(c) < 0);
  }
  // 停滞検出: 一定時間出産が無ければ飢餓淘汰 → さらに続けば祖先注入
  if (state.totalBirths > state.lastTotalBirths) {
    state.stagnationCounter = 0;
    state.lastTotalBirths = state.totalBirths;
  } else {
    state.stagnationCounter++;
  }
  if (state.stagnationCounter >= STAGNATION_RESET) {
    // 完全停滞: 祖先を注入
    const start = findFreeRegion(ANCESTOR.length);
    if (start >= 0) {
      for (let i = 0; i < ANCESTOR.length; i++) mem[start + i] = ANCESTOR[i];
      const c = newCreature(start, ANCESTOR.length, 0, null);
      state.creatures.push(c);
      state.totalBirths++;
      state.stagnationResets++;
    }
    state.stagnationCounter = 0;
  } else if (state.stagnationCounter >= STAGNATION_STARVE &&
             (state.stagnationCounter - STAGNATION_STARVE) % STAGNATION_STARVE_INTERVAL === 0) {
    // 飢餓淘汰: 一番繁殖していない最古の個体を1人ずつ間引く
    if (state.creatures.length > 1) {
      let worst = state.creatures[0];
      let worstScore = -Infinity;
      for (const c of state.creatures) {
        const s = c.age - c.reproductions * 2000;
        if (s > worstScore) { worstScore = s; worst = c; }
      }
      killCreature(worst);
      state.creatures = state.creatures.filter(c => c !== worst);
      state.stagnationKills++;
    }
  }
  state.cycle++;
}
