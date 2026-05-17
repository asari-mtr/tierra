// ============================================================
// 描画 (canvas)
// ============================================================
import { COLS, ROWS, CELL, MEM_SIZE } from './constants.js';
import { mem, owner, state } from './state.js';
import { OP_RGB } from './colors.js';

export const canvas = document.getElementById('soup');
export const ctx = canvas.getContext('2d');
canvas.width = COLS * CELL;
canvas.height = ROWS * CELL;
canvas.style.maxWidth = (COLS * CELL) + 'px';

const offscreen = document.createElement('canvas');
offscreen.width = COLS;
offscreen.height = ROWS;
const offctx = offscreen.getContext('2d');
const imgData = offctx.createImageData(COLS, ROWS);

export function render() {
  // メモリ → ピクセル
  const data = imgData.data;
  for (let i = 0; i < MEM_SIZE; i++) {
    const op = mem[i];
    const own = owner[i];
    let [r, g, b] = OP_RGB[op];
    // 所有なしの領域は暗く
    if (own === -1) {
      r = Math.floor(r * 0.35);
      g = Math.floor(g * 0.35);
      b = Math.floor(b * 0.35);
    }
    const o = i * 4;
    data[o] = r;
    data[o + 1] = g;
    data[o + 2] = b;
    data[o + 3] = 255;
  }
  offctx.putImageData(imgData, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);

  // 個体のIP位置を強調
  for (const c of state.creatures) {
    const ip = c.ip;
    const x = (ip % COLS) * CELL;
    const y = Math.floor(ip / COLS) * CELL;
    ctx.fillStyle = c === state.selectedCreature ? '#fff' : 'rgba(255,255,255,0.55)';
    ctx.fillRect(x, y, CELL, CELL);
  }

  // 選択個体の領域を縁取り
  if (state.selectedCreature && state.creatures.includes(state.selectedCreature)) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    drawRegionOutline(state.selectedCreature.region.start, state.selectedCreature.region.size);
    if (state.selectedCreature.daughter) {
      ctx.strokeStyle = '#22c55e';
      drawRegionOutline(state.selectedCreature.daughter.start, state.selectedCreature.daughter.size);
    }
  }
}

function drawRegionOutline(start, size) {
  for (let i = 0; i < size; i++) {
    const idx = (start + i) % MEM_SIZE;
    const x = (idx % COLS) * CELL;
    const y = Math.floor(idx / COLS) * CELL;
    if (i === 0 || i === size - 1) ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
  }
  const sx = (start % COLS) * CELL;
  const sy = Math.floor(start / COLS) * CELL;
  ctx.strokeRect(sx - 0.5, sy - 0.5, CELL + 1, CELL + 1);
  const ex = ((start + size - 1) % COLS) * CELL;
  const ey = Math.floor((start + size - 1) / COLS) * CELL;
  ctx.strokeRect(ex - 0.5, ey - 0.5, CELL + 1, CELL + 1);
}
