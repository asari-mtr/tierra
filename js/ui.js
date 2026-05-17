// ============================================================
// UI 更新 (統計 / 個体一覧 / 検査パネル / 凡例)
// ============================================================
import { OP, NUM_OPS, OP_NAMES, MEM_SIZE } from './constants.js';
import { mem, genomes, state } from './state.js';
import { LABEL_COLORS, OP_COLORS, legendRefs } from './colors.js';
import { genomeLineage } from './creatures.js';
import { memoryUsage } from './vm.js';
import { t, labelName } from './i18n.js';
import { toggleCompare, renderComparison, showGenomeContent } from './comparison.js';

export function updateUI() {
  document.getElementById('stat-cycle').textContent = state.cycle.toLocaleString();
  document.getElementById('stat-gen').textContent = state.generationMax;
  document.getElementById('stat-pop').textContent = state.creatures.length;
  document.getElementById('stat-births').textContent = state.totalBirths.toLocaleString();
  document.getElementById('stat-deaths').textContent = state.totalDeaths.toLocaleString();
  document.getElementById('stat-mut').textContent = state.mutations.toLocaleString();
  document.getElementById('stat-mem').textContent = (memoryUsage() * 100).toFixed(0) + '%';

  // ラベル別カウント
  let cSelf = 0, cPar = 0, cDeg = 0;
  for (const c of state.creatures) {
    if (c.label === 'self') cSelf++;
    else if (c.label === 'parasite') cPar++;
    else if (c.label === 'degenerate') cDeg++;
  }
  document.getElementById('stat-self').textContent = cSelf;
  document.getElementById('stat-parasite').textContent = cPar;
  document.getElementById('stat-degen').textContent = cDeg;
  // 停滞インジケータ
  const stagWrap = document.getElementById('stat-stagnation-wrap');
  if (state.stagnationCounter > 500 || state.stagnationKills > 0 || state.stagnationResets > 0) {
    stagWrap.style.display = '';
    document.getElementById('stat-stagnation').textContent = state.stagnationCounter;
    document.getElementById('stat-stag-kills').textContent = state.stagnationKills;
    document.getElementById('stat-stag-resets').textContent = state.stagnationResets;
  } else {
    stagWrap.style.display = 'none';
  }

  // genome 一覧 (ラベル別 top N)
  // genome のラベルは「その genome を持つ最新の個体のラベル」を採用
  const labelByKey = new Map();
  for (const c of state.creatures) {
    if (!labelByKey.has(c.genomeKey)) labelByKey.set(c.genomeKey, c.label);
  }
  const byLabel = { self: [], parasite: [], degenerate: [], unknown: [] };
  for (const g of genomes.values()) {
    if (g.count <= 0) continue;  // 絶滅した genome は一覧から除外 (系統樹用に保存はされている)
    const lab = labelByKey.get(g.key) || g.label || 'unknown';
    if (byLabel[lab]) byLabel[lab].push({ g, lab });
  }
  for (const key of Object.keys(byLabel)) {
    byLabel[key].sort((a, b) => b.g.count - a.g.count);
  }
  const LIMITS = { self: 8, parasite: 10, degenerate: 4, unknown: 2 };
  const list = document.getElementById('creature-list');
  const selKey = state.selectedCreature ? state.selectedCreature.genomeKey : null;
  const sections = [];
  for (const lab of ['self', 'parasite', 'degenerate', 'unknown']) {
    const items = byLabel[lab].slice(0, LIMITS[lab]);
    if (items.length === 0) continue;
    sections.push(`<div class="list-header" style="color:${LABEL_COLORS[lab]}">${labelName(lab)} (${byLabel[lab].length})</div>`);
    sections.push(items.map(({ g, lab: l }) => `
      <div class="creature-row${g.key === selKey ? ' selected' : ''}" data-key="${g.key}">
        <span class="cid" style="color:${g.color}">●</span>
        <span class="tag" style="color:${LABEL_COLORS[l]}">${labelName(l)}</span>
        <span>len=${g.length}</span>
        <span class="meta">×${g.count}</span>
        <span class="meta">g${g.gen}</span>
        <span class="meta">#${g.hash.toString(16).slice(0, 4)}</span>
      </div>`).join(''));
  }
  list.innerHTML = sections.join('');
  for (const row of list.querySelectorAll('.creature-row')) {
    row.addEventListener('click', () => {
      const key = row.dataset.key;
      const target = state.creatures.find(c => c.genomeKey === key);
      state.selectedCreature = target || null;
      updateInspector();
      updateUI();
    });
  }
  updateInspector();
}

export function genomeToText(c) {
  // 命令名のリスト + 数値配列
  const ops = [];
  for (let i = 0; i < c.region.size; i++) {
    const b = mem[(c.region.start + i) % MEM_SIZE];
    ops.push(OP_NAMES[b] || `?${b}`);
  }
  const bytes = [];
  for (let i = 0; i < c.region.size; i++) {
    bytes.push(mem[(c.region.start + i) % MEM_SIZE]);
  }
  const lines = [];
  const totalCyc = c.insideCycles + c.outsideCycles;
  const outsideRatio = totalCyc > 0 ? (c.outsideCycles / totalCyc * 100).toFixed(1) : '0.0';
  lines.push(`# id=${c.id} gen=${c.generation} len=${c.region.size} reg=${c.region.start}..${(c.region.start + c.region.size - 1) % MEM_SIZE}`);
  lines.push(`# label=${c.label} (${labelName(c.label)})  outside_ratio=${outsideRatio}% (${c.outsideCycles}/${totalCyc})`);
  lines.push(`# age=${c.age} errors=${c.errors} reproductions=${c.reproductions}`);
  lines.push(`# ip=${c.ip} (rel ${(c.ip - c.region.start + MEM_SIZE) % MEM_SIZE}) ax=${c.ax} bx=${c.bx} cx=${c.cx} dx=${c.dx}`);
  lines.push(`# stack=[${c.stack.join(', ')}]`);
  lines.push(`# hash=${c.genomeHash.toString(16)}`);
  lines.push('');
  lines.push('# rel  byte  op');
  for (let i = 0; i < ops.length; i++) {
    const marker = ((c.region.start + i) % MEM_SIZE === c.ip) ? ' ← IP' : '';
    lines.push(`${String(i).padStart(4)}  ${String(bytes[i]).padStart(3)}  ${ops[i]}${marker}`);
  }
  lines.push('');
  lines.push('# raw bytes:');
  lines.push('[' + bytes.join(',') + ']');
  return lines.join('\n');
}

export function updateInspector() {
  const panel = document.getElementById('inspect-panel');
  const info = document.getElementById('inspect-info');
  const ta = document.getElementById('inspect-genome');
  if (!state.selectedCreature || !state.creatures.includes(state.selectedCreature)) {
    panel.style.display = 'none';
    return;
  }
  panel.style.display = '';
  const c = state.selectedCreature;
  const ipRel = (c.ip - c.region.start + MEM_SIZE) % MEM_SIZE;
  const totalCyc = c.insideCycles + c.outsideCycles;
  const outsideRatio = totalCyc > 0 ? (c.outsideCycles / totalCyc * 100).toFixed(1) : '0.0';
  info.innerHTML = `
    <div><span class="k">${t('inspect.label')}</span> <span style="color:${LABEL_COLORS[c.label]};font-weight:bold;">${labelName(c.label)}</span>　<span class="k">${t('inspect.parasite_ratio')}</span> <span class="v">${outsideRatio}%</span> <span class="k">${t('inspect.outside_total', { out: c.outsideCycles, tot: totalCyc })}</span></div>
    <div><span class="k">id</span> <span class="v">${c.id}</span>　<span class="k">gen</span> <span class="v">${c.generation}</span>　<span class="k">len</span> <span class="v">${c.region.size}</span></div>
    <div><span class="k">region</span> <span class="v">${c.region.start}..${(c.region.start + c.region.size - 1) % MEM_SIZE}</span></div>
    <div><span class="k">ip</span> <span class="v">${c.ip}</span> <span class="k">(rel</span> <span class="v">${ipRel}</span><span class="k">)</span></div>
    <div><span class="k">ax</span> <span class="v">${c.ax}</span>　<span class="k">bx</span> <span class="v">${c.bx}</span>　<span class="k">cx</span> <span class="v">${c.cx}</span>　<span class="k">dx</span> <span class="v">${c.dx}</span></div>
    <div><span class="k">age</span> <span class="v">${c.age}</span>　<span class="k">err</span> <span class="v">${c.errors}</span>　<span class="k">repro</span> <span class="v">${c.reproductions}</span></div>
    <div><span class="k">daughter</span> <span class="v">${c.daughter ? c.daughter.start + '..' + (c.daughter.start + c.daughter.size - 1) : '—'}</span></div>
    <div><span class="k">parent</span> <span class="v">${c.parentId !== null ? '#' + c.parentId : '—'}</span></div>
  `;
  // 系統樹 (genome 単位)
  const chain = genomeLineage(c.genomeKey);
  if (chain.length > 0) {
    const lines = chain.map((g, i) => {
      const tag = (i === chain.length - 1 && !g.parentKey) ? t('inspect.ancestor_tag') : (i === 0 ? t('inspect.self_tag') : '');
      const cmpClass = state.comparedGenomes.includes(g.key) ? ' compared' : '';
      return `<div class="lineage-row${cmpClass}" data-key="${g.key}" title="${t('tooltip.lineage_row')}">
        <span class="meta">${i === 0 ? '▸' : ' '}</span>
        <span style="color:${LABEL_COLORS[g.label]};font-weight:600;">${labelName(g.label)}</span>
        <span class="meta">len=${g.length}</span>
        <span class="meta">g${g.gen}</span>
        <span class="meta">#${g.hash.toString(16).slice(0, 4)}</span>
        <span class="meta">×${g.count}</span>
        <span class="meta">${tag}</span>
      </div>`;
    }).join('');
    info.innerHTML += `<div class="lineage"><div class="lineage-title">${t('inspect.lineage_title', { n: chain.length })}</div>${lines}</div>`;
  }
  ta.value = genomeToText(c);
  // 系統行: クリックで比較追加/削除、Shift+クリックで textarea に展開
  for (const row of info.querySelectorAll('.lineage-row[data-key]')) {
    row.addEventListener('click', (e) => {
      const key = row.dataset.key;
      if (e.shiftKey) {
        const g = genomes.get(key);
        if (g && g.bytes) showGenomeContent(g);
      } else {
        toggleCompare(key);
        updateInspector();
      }
    });
  }
}

export function buildLegend() {
  const legend = document.getElementById('legend');
  const groups = [
    ['NOP0', 'NOP1', 'ZERO', 'OR1', 'SHL'],
    ['INC_A', 'INC_B', 'INC_C', 'DEC_C', 'IFZ', 'IFNZ', 'SUB_BA'],
    ['MOV_AB', 'PUSH_A', 'POP_A'],
    ['JMP_F', 'JMP_B', 'CALL', 'RET'],
    ['ADR_F', 'ADR_B', 'MAL', 'DIVIDE'],
  ];
  const flat = groups.flat();
  legend.innerHTML = flat.map(name => {
    const code = OP[name];
    return `<div class="legend-item" data-op="${code}">
      <div class="legend-swatch" style="background:${OP_COLORS[code]}"></div>
      <span>${name}</span>
    </div>`;
  }).join('');
  legendRefs.swatches = new Array(NUM_OPS);
  legend.querySelectorAll('.legend-item').forEach(el => {
    const code = parseInt(el.dataset.op, 10);
    legendRefs.swatches[code] = el.querySelector('.legend-swatch');
  });
}
