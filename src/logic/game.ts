// 角色養成規則 —— 所有數值都「由真實紀錄即時計算」，不另外累加儲存，
// 所以重新整理、重複點擊、編輯或刪除紀錄都不會讓 EXP 重複發放或錯帳。
import type { Phase, WorkoutRecord } from '../types';

export const MIN_DURATION_FOR_EXP = 5; // 分鐘
export const DAILY_FIRST_BONUS = 5;
export const PHASE_CLEAR_BONUS = 50;

/** 單筆紀錄的基本 EXP（不含每日首次加成） */
export function baseExp(r: Pick<WorkoutRecord, 'duration'>): number {
  if (!(r.duration >= MIN_DURATION_FOR_EXP)) return 0;
  const capped = Math.min(r.duration, 120);
  return 10 + 2 * Math.floor(capped / 10);
}

export interface ExpBreakdown {
  total: number;
  /** 紀錄 id → 這筆紀錄帶來的 EXP（含每日首次加成） */
  perRecord: Map<string, number>;
  phaseBonus: number;
}

export function computeExp(records: WorkoutRecord[], phases: Phase[], today: string): ExpBreakdown {
  const perRecord = new Map<string, number>();
  // 每天第一筆「符合條件」的紀錄 +5（依建立時間決定，結果穩定）
  const firstOfDay = new Map<string, WorkoutRecord>();
  for (const r of records) {
    if (r.date > today || baseExp(r) === 0) continue;
    const cur = firstOfDay.get(r.date);
    if (!cur || r.createdAt < cur.createdAt || (r.createdAt === cur.createdAt && r.id < cur.id)) {
      firstOfDay.set(r.date, r);
    }
  }
  let total = 0;
  for (const r of records) {
    if (r.date > today) {
      perRecord.set(r.id, 0);
      continue;
    }
    let e = baseExp(r);
    if (e > 0 && firstOfDay.get(r.date)?.id === r.id) e += DAILY_FIRST_BONUS;
    perRecord.set(r.id, e);
    total += e;
  }
  const phaseBonus = phases.filter((p) => p.status === 'completed').length * PHASE_CLEAR_BONUS;
  total += phaseBonus;
  return { total, perRecord, phaseBonus };
}

/** 從 L 級升到 L+1 級需要的 EXP */
export function expToNext(level: number): number {
  return 40 + level * 20;
}

export interface LevelInfo {
  level: number;
  /** 本級已累積 */
  current: number;
  /** 本級需要 */
  need: number;
  total: number;
}

export function levelFromExp(total: number): LevelInfo {
  let level = 1;
  let rest = Math.max(0, total);
  while (rest >= expToNext(level) && level < 99) {
    rest -= expToNext(level);
    level++;
  }
  return { level, current: rest, need: expToNext(level), total };
}

export function totalExpForLevel(level: number): number {
  let sum = 0;
  for (let l = 1; l < level; l++) sum += expToNext(l);
  return sum;
}

// ---- 稱號 / 配色 / 裝飾（依等級解鎖） ----

export const TITLES: { level: number; name: string }[] = [
  { level: 1, name: '新手冒險者' },
  { level: 3, name: '晨光見習生' },
  { level: 5, name: '汗水騎士' },
  { level: 8, name: '核心守護者' },
  { level: 12, name: '像素英雄' },
  { level: 20, name: '傳說訓練師' },
];

export function titleFor(level: number): string {
  let t = TITLES[0].name;
  for (const x of TITLES) if (level >= x.level) t = x.name;
  return t;
}

export interface PaletteDef {
  id: string;
  name: string;
  level: number;
  body: string;
  light: string;
  shade: string;
  band: string;
}

export const PALETTES: PaletteDef[] = [
  { id: 'mint', name: '薄荷綠', level: 1, body: '#9fdcc0', light: '#d4f2e3', shade: '#6fb79a', band: '#f4a9b8' },
  { id: 'sakura', name: '櫻花粉', level: 3, body: '#f6b8c6', light: '#fde1e7', shade: '#d98b9e', band: '#8fc3a6' },
  { id: 'sky', name: '復古藍', level: 5, body: '#9cc4e4', light: '#d3e6f5', shade: '#6e9cc4', band: '#f6d77a' },
  { id: 'lemon', name: '檸檬黃', level: 8, body: '#f6dd8a', light: '#fdf1c6', shade: '#d5b65c', band: '#86b6d9' },
  { id: 'cocoa', name: '可可棕', level: 12, body: '#c9a083', light: '#e8d0be', shade: '#9c7459', band: '#9fdcc0' },
];

export interface AccessoryDef {
  id: string;
  name: string;
  level: number;
}

export const ACCESSORIES: AccessoryDef[] = [
  { id: 'none', name: '不戴', level: 1 },
  { id: 'sprout', name: '小嫩芽', level: 2 },
  { id: 'star', name: '星星髮夾', level: 4 },
  { id: 'cap', name: '運動帽', level: 6 },
  { id: 'crown', name: '冠軍皇冠', level: 10 },
];

export function unlocked<T extends { level: number }>(list: T[], level: number): T[] {
  return list.filter((x) => level >= x.level);
}

/** 下一個會解鎖的獎勵（顯示在角色頁） */
export function nextUnlock(level: number): string | null {
  const all = [
    ...TITLES.map((t) => ({ level: t.level, label: `稱號「${t.name}」` })),
    ...PALETTES.map((p) => ({ level: p.level, label: `配色「${p.name}」` })),
    ...ACCESSORIES.filter((a) => a.id !== 'none').map((a) => ({ level: a.level, label: `裝飾「${a.name}」` })),
  ]
    .filter((x) => x.level > level)
    .sort((a, b) => a.level - b.level);
  if (!all.length) return null;
  const lv = all[0].level;
  return `Lv.${lv} 解鎖 ` + all.filter((x) => x.level === lv).map((x) => x.label).join('、');
}
