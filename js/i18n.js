// ============================================================
// i18n (ja / en)
// ============================================================
import { LANG_KEY } from './constants.js';
import { state } from './state.js';

const I18N = {
  ja: {
    'title': 'Gene Soup — Tierra風人工生命シミュレーター',
    'header.subtitle': 'Tierra風 人工生命シミュレーター — 機械語で書かれた自己複製プログラムを進化させる',
    'stats.cycle': 'サイクル',
    'stats.gen': '世代',
    'stats.pop': '個体数',
    'stats.births': '累計誕生',
    'stats.deaths': '累計死亡',
    'stats.mut': '突然変異',
    'stats.mem': 'メモリ使用',
    'stats.self': '自立',
    'stats.parasite': '寄生',
    'stats.degen': '縮退',
    'stats.stagnation': '停滞',
    'stats.stag_kills': '淘汰',
    'stats.stag_resets': '注入',
    'panel.control': '制御',
    'panel.hall': '殿堂入り',
    'panel.inject': 'カスタムゲノム注入',
    'panel.legend': '命令カラー',
    'panel.about': 'このシミュレーションについて',
    'panel.creatures': '個体一覧 (genome別 / クリックで検査)',
    'panel.inspect': '選択中の個体',
    'panel.compare': 'ゲノム比較 (差分は赤強調)',
    'btn.pause': '⏸ 一時停止',
    'btn.play': '▶ 再生',
    'btn.step': '⏭ 1ステップ',
    'btn.reset': '🔄 再起動',
    'btn.clear': '🗑 全リセット',
    'btn.inject': '▶ 注入',
    'btn.inject_fresh': '🗑 クリア&単独投入',
    'btn.sample_ancestor': '祖先(61)',
    'btn.sample_shrunk': '31バイト',
    'btn.sample_24': '24バイト',
    'btn.sample_parasite14': '寄生(14)',
    'btn.copy_genome': '📋 ゲノムをコピー',
    'btn.deselect': '解除',
    'btn.compare_export': '📋 比較をコピー',
    'btn.compare_clear': 'クリア',
    'btn.hall_export': '📤 出力',
    'btn.hall_import': '📥 入力',
    'btn.hall_clear': '🗑 全消去',
    'btn.copied': '✓ コピー済み',
    'tooltip.hall_export': 'JSON でエクスポート',
    'tooltip.hall_import': 'JSON をインポート',
    'tooltip.hall_clear': '全削除',
    'tooltip.lineage_row': 'クリックで比較対象に追加/解除 · Shift+クリックで textarea に展開',
    'tooltip.compare_col': 'クリックで textarea に展開',
    'tooltip.hall_inject': '現在のシミュレーションに注入',
    'tooltip.hall_show': 'textarea に展開',
    'tooltip.hall_del': '削除',
    'label.speed': '速度',
    'label.copy_rate': 'コピー誤り率',
    'label.cosmic_rate': '放射線率',
    'label.lang': '言語',
    'unit.tick_per_frame': 'tick/f',
    'inject.placeholder': '例: [1,26,0,13,25,0,1,...] か NOP1,ADR_B,NOP0,...',
    'help.intro': 'Thomas Rayが1990年代に作った<b>Tierra</b>を簡略化したものです。',
    'help.cpu': '32種の命令(機械語)からなる仮想CPUがあり、メモリ上の自己複製プログラムが時分割実行されます。',
    'help.ancestor': '<b>初代の祖先</b>は61バイトで、自分のコードを探し、メモリを確保し、コピーして分裂します。',
    'help.mutation': 'コピー時のビット反転と放射線(ランダム位置のビット反転)で遺伝子が変化し、自然選択(メモリが満杯になると死神 Reaper が古い・エラー多発個体を殺す)で進化します。',
    'help.slicer': '<b>Slicer</b>: 各個体の1ティック実行サイクル数はゲノム長に比例配分されます (Ray のオリジナル準拠)。短い個体ほど実行が遅くなり、コードあたりの効率が公平化されます。これにより縮退寄生体 (1〜5バイト) が一方的に勝つことがなくなり、Ray の論文と同じく ~40〜80バイトの<b>寄生体 (parasite)</b>が観察できます。寄生体は自前のコピーループを欠き、テンプレート検索で他個体のコピー機構を借用して増えます。',
    'help.click': '個体一覧やメモリ上の点をクリックするとゲノムの中身をテキストで確認できます。系統行をクリックで比較対象に追加/解除。',
    'help.compare_hint': '系統リストの行をクリックして比較対象に追加/解除。列ヘッダをクリックで該当 genome を textarea に展開。',
    'footer.text': 'Gene Soup · Tierra (Thomas Ray, 1991) にインスパイア · クリックで個体検査',
    'hall.empty': 'まだ記録なし。<br>条件: lifespan ≥ 300 tick / 繁殖 ≥ 5 / len ≤ 55<br>(壁時計ベースでコード長に依存しない指標)',
    'lab.self': '自立',
    'lab.parasite': '寄生',
    'lab.degenerate': '縮退',
    'lab.unknown': '?',
    'diff.same': '同',
    'diff.sub': '置',
    'diff.del': '削',
    'diff.ins': '挿',
    'inspect.label': '分類',
    'inspect.parasite_ratio': '寄生率',
    'inspect.outside_total': '(領域外 {out} / 全 {tot})',
    'inspect.lineage_title': '系統 ({n}世代 - 子→親 / クリックで比較に追加)',
    'inspect.ancestor_tag': '← 祖先',
    'inspect.self_tag': '← この個体',
    'genome.header_view': '# === genome 単位の表示 (実個体ではなく系統の祖) ===',
    'genome.firstseen': '# 初出 cycle={fs}  累積出現={ts}  ピーク数={peak}  現在数={cur}',
    'genome.parent_some': '# 親 genome: {info}',
    'genome.parent_deleted': '(削除済み)',
    'genome.parent_none': '# 親 genome: なし (系統の祖)',
    'inject.parse_fail': '解析失敗: 数字列 (0〜31) か OP 名で書いてください',
    'inject.too_short': 'ゲノム長が短すぎ ({len} < {min})',
    'inject.too_long': 'ゲノム長が長すぎ ({len} > {max})',
    'inject.no_space': '空き領域が見つかりません(メモリ満杯)',
    'inject.success': '注入成功: id={id} len={len} label={label} @{start}',
    'inject.fresh_done': 'クリアして投入: id={id} len={len} label={label} @{start}',
    'inject.out_of_range': 'ゲノム長が範囲外 ({min}..{max})',
    'compare.header': '# ゲノム比較',
    'hall.import_ok': 'インポート完了: {n} 件',
    'hall.not_array': 'JSON が配列ではありません',
    'hall.parse_fail': 'JSON 解析失敗: {msg}',
    'hall.confirm_clear': '殿堂入りを全削除しますか?',
    'hall.prompt_import': '殿堂入り JSON を貼り付け:',
  },
  en: {
    'title': 'Gene Soup — Tierra-style Artificial Life Simulator',
    'header.subtitle': 'Tierra-style artificial life simulator — evolve self-replicating programs written in machine code',
    'stats.cycle': 'cycle',
    'stats.gen': 'gen',
    'stats.pop': 'pop',
    'stats.births': 'births',
    'stats.deaths': 'deaths',
    'stats.mut': 'mutations',
    'stats.mem': 'mem',
    'stats.self': 'self',
    'stats.parasite': 'parasite',
    'stats.degen': 'degen',
    'stats.stagnation': 'stagnation',
    'stats.stag_kills': 'culled',
    'stats.stag_resets': 'injected',
    'panel.control': 'Controls',
    'panel.hall': 'Hall of Fame',
    'panel.inject': 'Inject Custom Genome',
    'panel.legend': 'Instruction Colors',
    'panel.about': 'About this simulation',
    'panel.creatures': 'Creatures (by genome / click to inspect)',
    'panel.inspect': 'Selected creature',
    'panel.compare': 'Genome comparison (diffs highlighted in red)',
    'btn.pause': '⏸ Pause',
    'btn.play': '▶ Play',
    'btn.step': '⏭ Step',
    'btn.reset': '🔄 Restart',
    'btn.clear': '🗑 Full reset',
    'btn.inject': '▶ Inject',
    'btn.inject_fresh': '🗑 Clear & inject solo',
    'btn.sample_ancestor': 'Ancestor (61)',
    'btn.sample_shrunk': '31 bytes',
    'btn.sample_24': '24 bytes',
    'btn.sample_parasite14': 'Parasite (14)',
    'btn.copy_genome': '📋 Copy genome',
    'btn.deselect': 'Deselect',
    'btn.compare_export': '📋 Copy comparison',
    'btn.compare_clear': 'Clear',
    'btn.hall_export': '📤 Export',
    'btn.hall_import': '📥 Import',
    'btn.hall_clear': '🗑 Clear all',
    'btn.copied': '✓ Copied',
    'tooltip.hall_export': 'Export as JSON',
    'tooltip.hall_import': 'Import from JSON',
    'tooltip.hall_clear': 'Delete all',
    'tooltip.lineage_row': 'Click to toggle in comparison · Shift-click to load into textarea',
    'tooltip.compare_col': 'Click to load into textarea',
    'tooltip.hall_inject': 'Inject into current simulation',
    'tooltip.hall_show': 'Load into textarea',
    'tooltip.hall_del': 'Delete',
    'label.speed': 'Speed',
    'label.copy_rate': 'Copy error rate',
    'label.cosmic_rate': 'Cosmic ray rate',
    'label.lang': 'Lang',
    'unit.tick_per_frame': 'tick/f',
    'inject.placeholder': 'e.g. [1,26,0,13,25,0,1,...] or NOP1,ADR_B,NOP0,...',
    'help.intro': 'A simplified version of <b>Tierra</b>, created by Thomas Ray in the early 1990s.',
    'help.cpu': 'A virtual CPU with 32 machine-code instructions runs self-replicating programs in shared memory using time-slicing.',
    'help.ancestor': 'The <b>original ancestor</b> is 61 bytes long: it finds its own code, allocates memory, copies itself, and divides.',
    'help.mutation': 'Bit flips during copying and cosmic rays (random bit flips in memory) drive genetic change; natural selection (the Reaper kills old and error-prone creatures when memory fills up) drives evolution.',
    'help.slicer': '<b>Slicer</b>: each creature\'s cycle budget per tick is proportional to its genome length (faithful to Ray\'s original). Shorter creatures execute proportionally slower, equalizing efficiency per byte. This prevents tiny degenerate parasites (1–5 bytes) from dominating, and lets ~40–80 byte <b>parasites</b> emerge — they lack their own copy loop and steal the host\'s copy machinery via template matching.',
    'help.click': 'Click a creature in the list or a point on the memory canvas to view the genome as text. Click a lineage row to add/remove it from the comparison.',
    'help.compare_hint': 'Click a row in the lineage list to add/remove it from comparison. Click a column header to load that genome into the textarea.',
    'footer.text': 'Gene Soup · Inspired by Tierra (Thomas Ray, 1991) · Click creatures to inspect',
    'hall.empty': 'No entries yet.<br>Criteria: lifespan ≥ 300 ticks / reproductions ≥ 5 / len ≤ 55<br>(wall-clock based, code-length independent)',
    'lab.self': 'self',
    'lab.parasite': 'parasite',
    'lab.degenerate': 'degen',
    'lab.unknown': '?',
    'diff.same': '=',
    'diff.sub': '~',
    'diff.del': '-',
    'diff.ins': '+',
    'inspect.label': 'class',
    'inspect.parasite_ratio': 'parasitism',
    'inspect.outside_total': '(outside {out} / total {tot})',
    'inspect.lineage_title': 'Lineage ({n} gens - child→parent / click to add to comparison)',
    'inspect.ancestor_tag': '← ancestor',
    'inspect.self_tag': '← this one',
    'genome.header_view': '# === genome view (ancestral form, not a live creature) ===',
    'genome.firstseen': '# first_seen cycle={fs}  total_seen={ts}  peak={peak}  current={cur}',
    'genome.parent_some': '# parent genome: {info}',
    'genome.parent_deleted': '(deleted)',
    'genome.parent_none': '# parent genome: none (lineage root)',
    'inject.parse_fail': 'parse failed: write digits (0–31) or OP names',
    'inject.too_short': 'genome too short ({len} < {min})',
    'inject.too_long': 'genome too long ({len} > {max})',
    'inject.no_space': 'no free region (memory full)',
    'inject.success': 'inject ok: id={id} len={len} label={label} @{start}',
    'inject.fresh_done': 'cleared and injected: id={id} len={len} label={label} @{start}',
    'inject.out_of_range': 'genome length out of range ({min}..{max})',
    'compare.header': '# genome comparison',
    'hall.import_ok': 'imported: {n} entries',
    'hall.not_array': 'JSON is not an array',
    'hall.parse_fail': 'JSON parse failed: {msg}',
    'hall.confirm_clear': 'Delete all Hall of Fame entries?',
    'hall.prompt_import': 'Paste Hall of Fame JSON:',
  },
};

// 初期言語を localStorage から取得
try {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved === 'ja' || saved === 'en') state.lang = saved;
} catch (e) { /* ignore */ }

export function t(key, params) {
  let s = (I18N[state.lang] && I18N[state.lang][key]) || I18N.ja[key] || key;
  if (params) {
    for (const k of Object.keys(params)) {
      s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), params[k]);
    }
  }
  return s;
}

export function labelName(lab) {
  const key = 'lab.' + lab;
  const v = (I18N[state.lang] && I18N[state.lang][key]) || I18N.ja[key];
  return v || '?';
}

export function applyStaticI18n() {
  document.documentElement.lang = state.lang;
  document.title = t('title');
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  document.querySelectorAll('[data-i18n-attr]').forEach(el => {
    const pairs = el.dataset.i18nAttr.split(',');
    for (const p of pairs) {
      const [attr, key] = p.split(':').map(x => x.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    }
  });
}

// setLang は動的 UI を再描画するためのフックを受け取る
export function setLang(next, hooks = {}) {
  if (next !== 'ja' && next !== 'en') return;
  state.lang = next;
  try { localStorage.setItem(LANG_KEY, state.lang); } catch (e) { /* ignore */ }
  applyStaticI18n();
  if (hooks.onLangChange) hooks.onLangChange();
}
