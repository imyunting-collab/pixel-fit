import { EXERCISE_TYPES, type BackupFile, type DayPlan, type ExerciseType, type Phase, type WorkoutRecord } from '../types';
import { isValidISO } from './dates';
import type { PetState } from './shop';

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  data?: {
    records: WorkoutRecord[];
    phases: Phase[];
    settings?: BackupFile['settings'];
    progress?: BackupFile['progress'];
    shop?: { owned: Record<string, { price: number; at: number }> };
    pet?: PetState;
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const optNum = (v: unknown) => v === undefined || v === null || (typeof v === 'number' && Number.isFinite(v) && v >= 0);
const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);

function cleanRecord(raw: unknown, i: number, errors: string[]): WorkoutRecord | null {
  const where = `運動紀錄第 ${i + 1} 筆`;
  if (!isObj(raw)) return errors.push(`${where}：格式不是物件`), null;
  if (typeof raw.id !== 'string' || !raw.id) return errors.push(`${where}：缺少 id`), null;
  if (!isValidISO(raw.date)) return errors.push(`${where}：日期格式錯誤`), null;
  if (!EXERCISE_TYPES.includes(raw.type as ExerciseType)) return errors.push(`${where}：未知的運動類型`), null;
  if (typeof raw.duration !== 'number' || !(raw.duration > 0) || raw.duration > 1440)
    return errors.push(`${where}：運動時間不正確`), null;
  if (!optNum(raw.distance) || !optNum(raw.sets) || !optNum(raw.reps) || !optNum(raw.weight))
    return errors.push(`${where}：數值欄位不正確`), null;
  const num = (v: unknown) => (typeof v === 'number' ? v : undefined);
  return {
    id: raw.id,
    date: raw.date,
    type: raw.type as ExerciseType,
    name: str(raw.name).slice(0, 60) || '運動',
    duration: raw.duration,
    distance: num(raw.distance),
    sets: num(raw.sets),
    reps: num(raw.reps),
    weight: num(raw.weight),
    body: str(raw.body),
    mood: str(raw.mood),
    note: str(raw.note).slice(0, 1000),
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
  };
}

function cleanPhase(raw: unknown, i: number, errors: string[]): Phase | null {
  const where = `訓練階段第 ${i + 1} 筆`;
  if (!isObj(raw)) return errors.push(`${where}：格式不是物件`), null;
  if (typeof raw.id !== 'string' || !raw.id) return errors.push(`${where}：缺少 id`), null;
  if (!isValidISO(raw.startDate) || !isValidISO(raw.endDate) || raw.startDate > raw.endDate)
    return errors.push(`${where}：開始／結束日期不正確`), null;
  if (!Array.isArray(raw.weekly) || raw.weekly.length !== 7) return errors.push(`${where}：每週安排格式錯誤`), null;
  const weekly: DayPlan[] = raw.weekly.map((d) => {
    const o = isObj(d) ? d : {};
    return {
      rest: o.rest === true,
      types: Array.isArray(o.types) ? (o.types.filter((t) => EXERCISE_TYPES.includes(t as ExerciseType)) as ExerciseType[]) : [],
      note: str(o.note),
    };
  });
  const status = raw.status === 'paused' || raw.status === 'completed' ? raw.status : 'active';
  return {
    id: raw.id,
    name: str(raw.name).slice(0, 40) || '未命名階段',
    startDate: raw.startDate,
    endDate: raw.endDate,
    goal: str(raw.goal),
    items: Array.isArray(raw.items) ? raw.items.filter((x): x is string => typeof x === 'string') : [],
    sessionGoal: str(raw.sessionGoal),
    weekly,
    status,
    pausedAt: isValidISO(raw.pausedAt) ? raw.pausedAt : undefined,
    completedAt: isValidISO(raw.completedAt) ? raw.completedAt : undefined,
    review: str(raw.review),
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
  };
}

export function validateBackup(json: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObj(json)) return { ok: false, errors: ['檔案內容不是有效的備份格式'] };
  if (json.app !== 'pixel-fit') return { ok: false, errors: ['這不是 PIXEL FIT 的備份檔'] };
  if (json.schema !== 1) return { ok: false, errors: ['不支援的備份版本'] };
  if (!Array.isArray(json.records) || !Array.isArray(json.phases))
    return { ok: false, errors: ['備份檔缺少運動紀錄或訓練階段資料'] };
  const records = json.records.map((r, i) => cleanRecord(r, i, errors));
  const phases = json.phases.map((p, i) => cleanPhase(p, i, errors));
  if (errors.length) return { ok: false, errors: errors.slice(0, 8).concat(errors.length > 8 ? [`…另有 ${errors.length - 8} 個問題`] : []) };
  return {
    ok: true,
    errors: [],
    data: {
      records: records as WorkoutRecord[],
      phases: phases as Phase[],
      settings: isObj(json.settings) ? (json.settings as BackupFile['settings']) : undefined,
      progress: isObj(json.progress) ? (json.progress as BackupFile['progress']) : undefined,
      shop: cleanShop(json.shop),
      pet: cleanPet(json.pet),
    },
  };
}

/** 判斷兩筆紀錄是不是「同一次運動」（不同 id 但內容一樣也視為重複） */
export function recordSignature(r: WorkoutRecord): string {
  return [r.date, r.type, r.name.trim(), r.duration, r.distance ?? '', r.sets ?? '', r.reps ?? '', r.weight ?? ''].join('|');
}

export interface MergePlan<T> {
  add: T[];
  update: T[];
  skipped: number;
}

export function planRecordMerge(existing: WorkoutRecord[], incoming: WorkoutRecord[]): MergePlan<WorkoutRecord> {
  const byId = new Map(existing.map((r) => [r.id, r]));
  const sigs = new Set(existing.map(recordSignature));
  const add: WorkoutRecord[] = [];
  const update: WorkoutRecord[] = [];
  let skipped = 0;
  for (const r of incoming) {
    const cur = byId.get(r.id);
    if (cur) {
      if (r.updatedAt > cur.updatedAt) update.push(r);
      else skipped++;
      continue;
    }
    const sig = recordSignature(r);
    if (sigs.has(sig)) {
      skipped++;
      continue;
    }
    sigs.add(sig);
    byId.set(r.id, r);
    add.push(r);
  }
  return { add, update, skipped };
}

export function planPhaseMerge(existing: Phase[], incoming: Phase[]): MergePlan<Phase> {
  const byId = new Map(existing.map((p) => [p.id, p]));
  const add: Phase[] = [];
  const update: Phase[] = [];
  let skipped = 0;
  for (const p of incoming) {
    const cur = byId.get(p.id);
    if (!cur) {
      add.push(p);
      byId.set(p.id, p);
    } else if (p.updatedAt > cur.updatedAt) update.push(p);
    else skipped++;
  }
  return { add, update, skipped };
}

const n0 = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);

function cleanShop(v: unknown): { owned: Record<string, { price: number; at: number }> } | undefined {
  if (!isObj(v) || !isObj(v.owned)) return undefined;
  const owned: Record<string, { price: number; at: number }> = {};
  for (const [k, x] of Object.entries(v.owned)) if (isObj(x)) owned[k] = { price: n0(x.price), at: n0(x.at) };
  return { owned };
}

function cleanPet(v: unknown): PetState | undefined {
  if (!isObj(v)) return undefined;
  return {
    name: str(v.name).slice(0, 10),
    lastFed: n0(v.lastFed),
    lastPlayed: n0(v.lastPlayed),
    lastPetted: n0(v.lastPetted),
    snacksUsed: Math.floor(n0(v.snacksUsed)),
    affection: Math.floor(n0(v.affection)),
  };
}
