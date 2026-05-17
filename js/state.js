// ============================================================
// 共有状態 (シミュレーションのミュータブル状態)
// ============================================================
import { MEM_SIZE } from './constants.js';

// メモリ系 (定数参照、中身は書き換わる)
export const mem = new Uint8Array(MEM_SIZE);    // メモリ(命令格納)
export const owner = new Int32Array(MEM_SIZE);  // 各バイトの所有者ID (-1: 空き)
export const genomes = new Map();               // genomeハッシュ → genome 情報

// スカラ/参照のミュータブル変数は state オブジェクトに集約
export const state = {
  creatures: [],
  nextId: 1,
  cycle: 0,
  totalBirths: 0,
  totalDeaths: 0,
  mutations: 0,
  generationMax: 0,
  running: true,
  copyErrorRate: 2e-4,
  cosmicRate: 1e-5,
  cyclesPerFrame: 20,
  selectedCreature: null,

  // 停滞検出
  stagnationCounter: 0,
  lastTotalBirths: 0,
  stagnationKills: 0,
  stagnationResets: 0,

  // 殿堂入り
  hallOfFame: [],

  // 比較対象 genome の key 一覧 (挿入順)
  comparedGenomes: [],

  // 色相シフト (0..360)
  hueShift: 0,

  // 言語 ('ja' | 'en')
  lang: 'en',
};
