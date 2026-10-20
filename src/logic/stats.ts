import type { ExerciseType, Phase, WorkoutRecord } from '../types';
import { eachDay, monthKey, weekDates, weekday } from './dates';

/** 只計入今天（含）以前的紀錄 */
export function pastRecords(records: WorkoutRecord[], today: string): WorkoutRecord[] {
  return records.filter((r) => r.date <= today);
}

export function byDate(records: WorkoutRecord[]): Map<string, WorkoutRecord[]> {
  const m = new Map<string, WorkoutRecord[]>();
  for (const r of records) {
    const list = m.get(r.date);
    if (list) list.push(r);
    else m.set(r.date, [r]);
  }
  for (const list of m.values()) list.sort((a, b) => a.createdAt - b.createdAt);
  return m;
}

export function sumMinutes(records: WorkoutRecord[]): number {
  return records.reduce((s, r) => s + (r.duration || 0), 0);
}

export function distinctDays(records: WorkoutRecord[]): number {
  return new Set(records.map((r) => r.date)).size;
}

export function weekStats(records: WorkoutRecord[], today: string) {
  const days = weekDates(today);
  const inWeek = records.filter((r) => r.date >= days[0] && r.date <= days[6] && r.date <= today);
  const dateSet = new Set(inWeek.map((r) => r.date));
  return {
    days,
    activeDays: dateSet.size,
    minutes: sumMinutes(inWeek),
    activeSet: dateSet,
  };
}

export function monthStats(records: WorkoutRecord[], ym: string, today: string) {
  const list = records.filter((r) => monthKey(r.date) === ym && r.date <= today);
  return { activeDays: distinctDays(list), minutes: sumMinutes(list), count: list.length };
}

export function totals(records: WorkoutRecord[], today: string) {
  const past = pastRecords(records, today);
  const runKm = past.filter((r) => r.type === 'run').reduce((s, r) => s + (r.distance || 0), 0);
  const countBy = (t: ExerciseType) => past.filter((r) => r.type === t).length;
  return {
    sessions: past.length,
    days: distinctDays(past),
    minutes: sumMinutes(past),
    runKm: Math.round(runKm * 100) / 100,
    core: countBy('core'),
    stretch: countBy('stretch'),
    longest: past.reduce((m, r) => Math.max(m, r.duration || 0), 0),
    bestWeekDays: bestWeek(past),
  };
}

function bestWeek(records: WorkoutRecord[]): number {
  const weeks = new Map<string, Set<string>>();
  for (const r of records) {
    const k = weekDates(r.date)[0];
    if (!weeks.has(k)) weeks.set(k, new Set());
    weeks.get(k)!.add(r.date);
  }
  let best = 0;
  for (const s of weeks.values()) best = Math.max(best, s.size);
  return best;
}

// ---------------- 訓練階段 ----------------

export type PhaseState = 'upcoming' | 'active' | 'paused' | 'awaitingReview' | 'completed';

export const PHASE_STATE_LABEL: Record<PhaseState, string> = {
  upcoming: '尚未開始',
  active: '進行中',
  paused: '暫停中',
  awaitingReview: '已到期・待回顧',
  completed: '已完成',
};

/** 尚未到期的計畫一律不會被判為失敗；過期但未結束只會顯示「待回顧」 */
export function phaseState(p: Phase, today: string): PhaseState {
  if (p.status === 'completed') return 'completed';
  if (p.status === 'paused') return 'paused';
  if (today < p.startDate) return 'upcoming';
  if (today > p.endDate) return 'awaitingReview';
  return 'active';
}

export function activePhase(phases: Phase[], today: string): Phase | undefined {
  return phases
    .filter((p) => phaseState(p, today) === 'active')
    .sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : a.createdAt - b.createdAt))[0];
}

export function isTrainingDay(p: Phase, date: string): boolean {
  const d = p.weekly[weekday(date)];
  return !!d && !d.rest && d.types.length > 0;
}

export function isRestDay(p: Phase, date: string): boolean {
  const d = p.weekly[weekday(date)];
  return !!d && d.rest;
}

export function phaseProgress(p: Phase, records: WorkoutRecord[], today: string) {
  const all = eachDay(p.startDate, p.endDate);
  const scheduled = all.filter((d) => isTrainingDay(p, d));
  const dates = new Set(records.filter((r) => r.date >= p.startDate && r.date <= p.endDate && r.date <= today).map((r) => r.date));
  const done = scheduled.filter((d) => dates.has(d)).length;
  const elapsedScheduled = scheduled.filter((d) => d <= today).length;
  const inRange = records.filter((r) => r.date >= p.startDate && r.date <= p.endDate && r.date <= today);
  return {
    totalScheduled: scheduled.length,
    elapsedScheduled,
    done,
    percent: scheduled.length ? Math.round((done / scheduled.length) * 100) : 0,
    sessions: inRange.length,
    minutes: sumMinutes(inRange),
    activeDays: dates.size,
    totalDays: all.length,
  };
}

/** 今日任務：依目前階段當天安排的運動類型，檢查今天是否已有該類型紀錄 */
export function todayTasks(p: Phase | undefined, records: WorkoutRecord[], today: string) {
  if (!p) return { rest: false, tasks: [] as { type: ExerciseType; done: boolean }[], note: '', hasPlan: false };
  const d = p.weekly[weekday(today)];
  if (!d || d.rest) return { rest: true, tasks: [], note: d?.note || '', hasPlan: true };
  const todays = records.filter((r) => r.date === today);
  return {
    rest: false,
    note: d.note,
    hasPlan: true,
    tasks: d.types.map((t) => ({ type: t, done: todays.some((r) => r.type === t) })),
  };
}
