// ============================================================
// 色定義 (命令ごと) と色相シフト
// ============================================================
import { OP, NUM_OPS } from './constants.js';

export const OP_COLORS = new Array(NUM_OPS);
const colorMap = {
  [OP.NOP0]:    '#2a2a2a',
  [OP.NOP1]:    '#555',
  [OP.ZERO]:    '#3b82f6',
  [OP.OR1]:     '#60a5fa',
  [OP.SHL]:     '#93c5fd',
  [OP.INC_A]:   '#10b981',
  [OP.INC_B]:   '#34d399',
  [OP.INC_C]:   '#6ee7b7',
  [OP.DEC_C]:   '#f97316',
  [OP.IFZ]:     '#ef4444',
  [OP.IFNZ]:    '#dc2626',
  [OP.SUB_BA]:  '#a855f7',
  [OP.MOV_AB]:  '#eab308',
  [OP.PUSH_A]:  '#7c3aed',
  [OP.PUSH_B]:  '#8b5cf6',
  [OP.PUSH_C]:  '#a78bfa',
  [OP.PUSH_D]:  '#c4b5fd',
  [OP.POP_A]:   '#06b6d4',
  [OP.POP_B]:   '#22d3ee',
  [OP.POP_C]:   '#67e8f9',
  [OP.POP_D]:   '#a5f3fc',
  [OP.JMP_F]:   '#fb923c',
  [OP.JMP_B]:   '#f97316',
  [OP.CALL]:    '#d97706',
  [OP.RET]:     '#b45309',
  [OP.ADR_F]:   '#14b8a6',
  [OP.ADR_B]:   '#0d9488',
  [OP.MAL]:     '#ec4899',
  [OP.DIVIDE]:  '#22c55e',
  [OP.NOP_X1]:  '#666',
  [OP.NOP_X2]:  '#666',
  [OP.NOP_X3]:  '#666',
};
for (let i = 0; i < NUM_OPS; i++) OP_COLORS[i] = colorMap[i] || '#666';

// 描画用に色文字列を r/g/b に分解
export const OP_RGB = OP_COLORS.map(c => {
  const m = c.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [128, 128, 128];
});

// ベース値 (不変) と HSL 化キャッシュ。OP_RGB / OP_COLORS は色相シフトで上書きされる
export const OP_RGB_BASE = OP_RGB.map(rgb => rgb.slice());
export const OP_HSL_BASE = OP_RGB_BASE.map(([r, g, b]) => rgbToHsl(r, g, b));

// buildLegend 後に格納される DOM 参照 (色相シフトで一緒に更新するため)
export const legendRefs = { swatches: null };

export const LABEL_COLORS = {
  self:       '#22c55e',
  parasite:   '#ec4899',
  degenerate: '#6b7280',
  unknown:    '#999',
};

export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return [h, s, l];
}

export function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [
    Math.round(hue2rgb(h + 1 / 3) * 255),
    Math.round(hue2rgb(h)         * 255),
    Math.round(hue2rgb(h - 1 / 3) * 255),
  ];
}

export function toHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

export function applyHueShift(hueShift) {
  for (let i = 0; i < NUM_OPS; i++) {
    const [h, s, l] = OP_HSL_BASE[i];
    // 彩度がほぼ無い(灰色系)は回転しても意味がないのでスキップ
    if (s < 0.05) continue;
    const [r, g, b] = hslToRgb(h + hueShift, s, l);
    OP_RGB[i][0] = r;
    OP_RGB[i][1] = g;
    OP_RGB[i][2] = b;
    OP_COLORS[i] = toHex(r, g, b);
    if (legendRefs.swatches && legendRefs.swatches[i]) {
      legendRefs.swatches[i].style.background = OP_COLORS[i];
    }
  }
}

export function hslColor(gen) {
  const h = (gen * 47) % 360;
  return `hsl(${h}, 70%, 60%)`;
}
