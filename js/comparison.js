// ============================================================
// ゲノム比較ビュー
// ============================================================
import { OP_NAMES } from './constants.js';
import { genomes, state } from './state.js';
import { LABEL_COLORS } from './colors.js';
import { t, labelName } from './i18n.js';

// LCS (Longest Common Subsequence) を使って 2 シーケンスの編集スクリプトを作る。
// 戻り値は [{type: 'same'|'sub'|'del'|'ins', ai, bi}]
// 同じ rel 位置で a と b の両方が違うとき、del + ins を sub にまとめる(後処理)。
export function diffLCS(a, b) {
  const m = a.length, n = b.length;
  const dp = new Int32Array((m + 1) * (n + 1));
  const w = n + 1;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i * w + j] = dp[(i - 1) * w + (j - 1)] + 1;
      else dp[i * w + j] = Math.max(dp[(i - 1) * w + j], dp[i * w + (j - 1)]);
    }
  }
  // backtrack
  const ops = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      ops.push({ type: 'same', ai: i - 1, bi: j - 1 });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i * w + (j - 1)] >= dp[(i - 1) * w + j])) {
      ops.push({ type: 'ins', ai: -1, bi: j - 1 });
      j--;
    } else {
      ops.push({ type: 'del', ai: i - 1, bi: -1 });
      i--;
    }
  }
  ops.reverse();
  // 連続する del と ins を sub に統合 (1対1 の置換)
  const merged = [];
  for (let k = 0; k < ops.length; k++) {
    const o = ops[k];
    if (o.type === 'del' && k + 1 < ops.length && ops[k + 1].type === 'ins') {
      merged.push({ type: 'sub', ai: o.ai, bi: ops[k + 1].bi });
      k++;
    } else if (o.type === 'ins' && k + 1 < ops.length && ops[k + 1].type === 'del') {
      merged.push({ type: 'sub', ai: ops[k + 1].ai, bi: o.bi });
      k++;
    } else {
      merged.push(o);
    }
  }
  return merged;
}

function renderByteCell(g, idx, cls) {
  if (idx < 0) return `<span class="compare-byte empty">    ·     · ·</span>`;
  const b = g.bytes[idx];
  const opName = OP_NAMES[b] || ('?' + b);
  return `<span class="compare-byte ${cls}">${String(idx).padStart(3)} ${String(b).padStart(3)} ${opName}</span>`;
}

function colHeaderHtml(g) {
  return `<div class="compare-col-header" data-key="${g.key}" title="${t('tooltip.compare_col')}">
    <span style="color:${LABEL_COLORS[g.label]};font-weight:600;">${labelName(g.label)}</span>
    <span>len=${g.length}</span>
    <span style="color:#666;">g${g.gen}</span>
    <span style="color:#666;">#${g.hash.toString(16).slice(0, 4)}</span>
  </div>`;
}

export function showGenomeContent(g) {
  const ta = document.getElementById('inspect-genome');
  const lines = [];
  lines.push(t('genome.header_view'));
  lines.push(`# hash=${g.hash.toString(16)} len=${g.length} label=${g.label} (${labelName(g.label)}) gen=${g.gen}`);
  lines.push(t('genome.firstseen', { fs: g.firstSeen, ts: g.totalSeen, peak: g.peakCount, cur: g.count }));
  if (g.parentKey) {
    const p = genomes.get(g.parentKey);
    const info = p ? `len=${p.length} #${p.hash.toString(16).slice(0, 4)} (${labelName(p.label)})` : t('genome.parent_deleted');
    lines.push(t('genome.parent_some', { info }));
  } else {
    lines.push(t('genome.parent_none'));
  }
  lines.push('');
  lines.push('# rel  byte  op');
  for (let i = 0; i < g.bytes.length; i++) {
    const b = g.bytes[i];
    lines.push(`${String(i).padStart(4)}  ${String(b).padStart(3)}  ${OP_NAMES[b] || ('?' + b)}`);
  }
  lines.push('');
  lines.push('# raw bytes:');
  lines.push('[' + Array.from(g.bytes).join(',') + ']');
  ta.value = lines.join('\n');
}

export function renderComparison() {
  const panel = document.getElementById('comparison-panel');
  const content = document.getElementById('comparison-content');
  const items = state.comparedGenomes
    .map(k => genomes.get(k))
    .filter(g => g && g.bytes);
  if (items.length === 0) {
    panel.style.display = 'none';
    content.innerHTML = '';
    return;
  }
  panel.style.display = '';

  if (items.length === 2) {
    // 2 ゲノム比較: LCS でアラインメントして git diff 風表示
    const [A, B] = items;
    const ops = diffLCS(Array.from(A.bytes), Array.from(B.bytes));
    let stats = { same: 0, sub: 0, del: 0, ins: 0 };
    let col1 = colHeaderHtml(A);
    let col2 = colHeaderHtml(B);
    for (const o of ops) {
      stats[o.type]++;
      if (o.type === 'same') {
        col1 += renderByteCell(A, o.ai, 'same');
        col2 += renderByteCell(B, o.bi, 'same');
      } else if (o.type === 'sub') {
        col1 += renderByteCell(A, o.ai, 'sub');
        col2 += renderByteCell(B, o.bi, 'sub');
      } else if (o.type === 'del') {
        col1 += renderByteCell(A, o.ai, 'del');
        col2 += renderByteCell(null, -1, 'empty');
      } else { // ins
        col1 += renderByteCell(null, -1, 'empty');
        col2 += renderByteCell(B, o.bi, 'ins');
      }
    }
    const statsLine = `<div class="diff-stats">
      <span class="ds-same">${t('diff.same')} ${stats.same}</span>
      <span class="ds-sub">${t('diff.sub')} ${stats.sub}</span>
      <span class="ds-del">${t('diff.del')} ${stats.del}</span>
      <span class="ds-ins">${t('diff.ins')} ${stats.ins}</span>
    </div>`;
    content.innerHTML = statsLine +
      `<div class="compare-grid">
        <div class="compare-col">${col1}</div>
        <div class="compare-col">${col2}</div>
      </div>`;
  } else {
    // 1 または 3+ ゲノム: 既存の 1:1 表示
    const maxLen = Math.max(...items.map(g => g.length));
    const cols = items.map(g => {
      let html = colHeaderHtml(g);
      for (let i = 0; i < maxLen; i++) {
        if (i >= g.length) {
          html += `<span class="compare-byte missing">${String(i).padStart(3)}   ·  —</span>`;
          continue;
        }
        const b = g.bytes[i];
        let sameAcross = true;
        if (items.length > 1) {
          for (const g2 of items) {
            if (g2 === g) continue;
            if (i >= g2.length || g2.bytes[i] !== b) { sameAcross = false; break; }
          }
        }
        const cls = items.length === 1 ? '' : (sameAcross ? 'same' : 'diff');
        html += renderByteCell(g, i, cls);
      }
      return `<div class="compare-col">${html}</div>`;
    });
    content.innerHTML = `<div class="compare-grid">${cols.join('')}</div>`;
  }
  // 列ヘッダクリックで textarea 展開
  for (const h of content.querySelectorAll('.compare-col-header[data-key]')) {
    h.addEventListener('click', () => {
      const g = genomes.get(h.dataset.key);
      if (g && g.bytes) showGenomeContent(g);
    });
  }
}

// 比較対象のトグル (循環依存を避けるため updateInspector は呼ばず、配列更新と比較ビュー再描画のみ)
export function toggleCompare(key) {
  const i = state.comparedGenomes.indexOf(key);
  if (i >= 0) {
    state.comparedGenomes.splice(i, 1);
  } else {
    state.comparedGenomes.push(key);
    if (state.comparedGenomes.length > 6) state.comparedGenomes.shift();
  }
  renderComparison();
}

// 比較エクスポート (クリップボードへコピー)
export function copyComparisonToClipboard() {
  const items = state.comparedGenomes.map(k => genomes.get(k)).filter(g => g && g.bytes);
  if (items.length === 0) return;
  const lines = [];
  lines.push(t('compare.header'));
  lines.push('# ' + items.map(g => `len=${g.length} #${g.hash.toString(16).slice(0, 4)} ${labelName(g.label)}`).join('  |  '));
  lines.push('');
  if (items.length === 2) {
    const [A, B] = items;
    const ops = diffLCS(Array.from(A.bytes), Array.from(B.bytes));
    let st = { same: 0, sub: 0, del: 0, ins: 0 };
    for (const o of ops) st[o.type]++;
    lines.push(`# ${t('diff.same')} ${st.same}  ${t('diff.sub')} ${st.sub}  ${t('diff.del')} ${st.del}  ${t('diff.ins')} ${st.ins}`);
    lines.push('');
    const cellA = (i) => i < 0 ? '   .   .  .       ' : `${String(i).padStart(3)} ${String(A.bytes[i]).padStart(3)}  ${(OP_NAMES[A.bytes[i]] || '?').padEnd(8)}`;
    const cellB = (i) => i < 0 ? '   .   .  .       ' : `${String(i).padStart(3)} ${String(B.bytes[i]).padStart(3)}  ${(OP_NAMES[B.bytes[i]] || '?').padEnd(8)}`;
    const mark = { same: '   ', sub: ' ≠ ', del: ' < ', ins: ' > ' };
    for (const o of ops) {
      lines.push(`${cellA(o.ai)}${mark[o.type]}${cellB(o.bi)}`);
    }
  } else {
    const maxLen = Math.max(...items.map(g => g.length));
    for (let i = 0; i < maxLen; i++) {
      const row = items.map(g => {
        if (i >= g.length) return '         —      ';
        const b = g.bytes[i];
        return `${String(b).padStart(2)} ${(OP_NAMES[b] || '?').padEnd(8)}`;
      }).join(' | ');
      lines.push(`${String(i).padStart(3)}: ${row}`);
    }
  }
  return lines.join('\n');
}
