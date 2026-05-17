// ============================================================
// VM 命令セット (32命令)
// ============================================================
export const OP = {
  NOP0:     0,  // テンプレート用
  NOP1:     1,  // テンプレート用
  ZERO:     2,  // cx = 0
  OR1:      3,  // cx |= 1
  SHL:      4,  // cx <<= 1
  INC_A:    5,  // ax++
  INC_B:    6,  // bx++
  INC_C:    7,  // cx++
  DEC_C:    8,  // cx--
  IFZ:      9,  // if (cx == 0) execute next else skip
  IFNZ:    10,  // if (cx != 0) execute next else skip
  SUB_BA:  11,  // cx = bx - ax
  MOV_AB:  12,  // mem[bx] = mem[ax]
  PUSH_A:  13,
  PUSH_B:  14,
  PUSH_C:  15,
  PUSH_D:  16,
  POP_A:   17,
  POP_B:   18,
  POP_C:   19,
  POP_D:   20,
  JMP_F:   21,  // テンプレートを前方検索してジャンプ
  JMP_B:   22,  // 後方検索
  CALL:    23,  // push ip, jmp
  RET:     24,
  ADR_F:   25,  // ax = テンプレート位置(前方)
  ADR_B:   26,  // ax = テンプレート位置(後方)
  MAL:     27,  // cx バイトを確保, dx = 開始位置
  DIVIDE:  28,  // 確保領域を新個体として分離
  NOP_X1:  29,  // 予備 NOP
  NOP_X2:  30,
  NOP_X3:  31,
};
export const NUM_OPS = 32;
export const OP_NAMES = Object.fromEntries(Object.entries(OP).map(([k, v]) => [v, k]));

// ============================================================
// 設定
// ============================================================
export const COLS = 144;                        // 24の倍数
export const ROWS = 128;                        // 64 → 128 (プール倍化)
export const MEM_SIZE = COLS * ROWS;            // 18432バイト
export const CELL = 5;                          // 描画セルサイズ
export const MAX_STACK = 10;
export const MAX_TEMPLATE = 10;
export const MAX_SEARCH = 600;                  // テンプレート検索距離
// CPU時間配分 (Slicer): 各個体の1ティック実行サイクル数 = ゲノム長 × SLICE_PER_BYTE
// Ray のオリジナル Tierra と同じ。短い個体ほど実行が遅くなり、
// 「自前のコピーループを持たない縮退寄生体」が一方的に得をすることを防ぐ。
export const SLICE_PER_BYTE = 1;
export const SLICE_MIN = 1;
export const REAPER_THRESHOLD = 0.65;           // メモリ使用率がこれを超えたら死神発動
export const MIN_DAUGHTER = 12;                 // MAL の最小確保サイズ
export const MAX_DAUGHTER = 800;                // MAL の最大確保サイズ
export const MAX_CREATURES = 400;
// 機能不全死: 極端なゾンビだけ即死させる
export const ERROR_DEATH_THRESHOLD = 10000;
export const ERROR_DEATH_RATIO = 0.9;
export const ERROR_DEATH_MIN_AGE = 500;

// 停滞検出
export const STAGNATION_STARVE = 3000;          // 出産無し N cycle で飢餓淘汰開始
export const STAGNATION_STARVE_INTERVAL = 400;
export const STAGNATION_RESET = 10000;          // 完全停滞: 祖先注入

// 殿堂入り (Hall of Fame)
export const HALL_KEY = 'gene-soup-hall-of-fame-v1';
export const HALL_LIFESPAN_THRESHOLD = 300;     // 壁時計 tick
export const HALL_REPRO_THRESHOLD = 5;
export const HALL_MAX_LEN = 55;
export const HALL_MAX_ENTRIES = 50;

// 言語設定
export const LANG_KEY = 'gene-soup-lang';

// 色相回転
export const HUE_SHIFT_PER_SEC = 6; // 1秒あたりの色相回転量(deg)

// ============================================================
// 祖先 (Ancestor) - 61バイトの自己複製プログラム
// ============================================================
export const ANCESTOR = [
  // 0-3: 開始テンプレート 1110
  OP.NOP1, OP.NOP1, OP.NOP1, OP.NOP0,
  // 4-8: ADR_B 0001 → ax = 自分の開始位置
  OP.ADR_B, OP.NOP0, OP.NOP0, OP.NOP0, OP.NOP1,
  // 9: 保存
  OP.PUSH_A,
  // 10-14: ADR_F 0010 → ax = 終了テンプレートの位置
  OP.ADR_F, OP.NOP0, OP.NOP0, OP.NOP1, OP.NOP0,
  // 15-17: スタック整理 bx = end, ax = start
  OP.PUSH_A, OP.POP_B, OP.POP_A,
  // 18: cx = bx - ax
  OP.SUB_BA,
  // 19-22: cx += 4 (終了テンプレートの分の長さ加算)
  OP.INC_C, OP.INC_C, OP.INC_C, OP.INC_C,
  // 23: MAL → dx = 確保した娘領域の開始
  OP.MAL,
  // 24-25: bx = dx
  OP.PUSH_D, OP.POP_B,
  // 26-29: ループ先頭テンプレート 0101
  OP.NOP0, OP.NOP1, OP.NOP0, OP.NOP1,
  // 30-33: コピー本体 mem[bx]=mem[ax]; ax++; bx++; cx--
  OP.MOV_AB, OP.INC_A, OP.INC_B, OP.DEC_C,
  // 34: cx==0なら次を実行(脱出)
  OP.IFZ,
  // 35-39: JMP_F 0100 → 脱出マーカー(補数 1011)へ
  OP.JMP_F, OP.NOP0, OP.NOP1, OP.NOP0, OP.NOP0,
  // 40-44: JMP_B 1010 → ループ先頭(補数 0101)へ
  OP.JMP_B, OP.NOP1, OP.NOP0, OP.NOP1, OP.NOP0,
  // 45: 区切り(非NOP)
  OP.ZERO,
  // 46-49: ループ脱出マーカー 1011
  OP.NOP1, OP.NOP0, OP.NOP1, OP.NOP1,
  // 50: 分裂
  OP.DIVIDE,
  // 51-55: JMP_B 0001 → 自分の開始へ戻り再生産
  OP.JMP_B, OP.NOP0, OP.NOP0, OP.NOP0, OP.NOP1,
  // 56: 区切り(非NOP)
  OP.ZERO,
  // 57-60: 終了テンプレート 1101
  OP.NOP1, OP.NOP1, OP.NOP0, OP.NOP1,
];

// 自然進化で出現したサンプル個体
export const SHRUNK_31 = [1,26,0,13,25,0,1,13,18,17,11,7,7,7,27,16,18,1,12,5,6,8,9,21,0,22,0,2,1,0,28];
// 24バイト版: 自然進化で出現した最小級の自立体 (INC_C × 2 が連続)
export const SHRUNK_24 = [1,26,0,13,25,1,13,18,17,11,7,7,27,16,18,1,12,5,6,8,10,22,0,28];
// 14バイト寄生体: 自前で MAL も持たない超ミニマル寄生体 (host 依存)
export const PARASITE_14 = [0,1,1,26,1,13,25,0,9,0,21,1,0,28];
