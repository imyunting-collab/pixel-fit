import type { Phase, WorkoutRecord } from '../types';
import { totals } from './stats';

export interface BadgeContext {
  t: ReturnType<typeof totals>;
  level: number;
  phasesCleared: number;
}

export interface BadgeDef {
  id: string;
  name: string;
  zh: string;
  condition: string;
  icon: string; // 對應 PixelIcon 名稱
  color: string;
  check: (c: BadgeContext) => boolean;
  progress: (c: BadgeContext) => [number, number];
}

export const BADGES: BadgeDef[] = [
  {
    id: 'first-step', name: 'FIRST STEP', zh: '第一步', condition: '第一次完成運動', icon: 'shoe', color: '#9fdcc0',
    check: (c) => c.t.sessions >= 1, progress: (c) => [Math.min(c.t.sessions, 1), 1],
  },
  {
    id: 'runner', name: 'RUNNER', zh: '跑者', condition: '累積跑步 10 公里', icon: 'bolt', color: '#9cc4e4',
    check: (c) => c.t.runKm >= 10, progress: (c) => [Math.min(c.t.runKm, 10), 10],
  },
  {
    id: 'core-master', name: 'CORE MASTER', zh: '核心大師', condition: '完成 10 次核心訓練', icon: 'dumbbell', color: '#f6b8c6',
    check: (c) => c.t.core >= 10, progress: (c) => [Math.min(c.t.core, 10), 10],
  },
  {
    id: 'little-hero', name: 'LITTLE HERO', zh: '小小英雄', condition: '累積運動 10 天', icon: 'heart', color: '#f4a9b8',
    check: (c) => c.t.days >= 10, progress: (c) => [Math.min(c.t.days, 10), 10],
  },
  {
    id: 'level-up', name: 'LEVEL UP', zh: '升級達人', condition: '角色升至 5 級', icon: 'star', color: '#f6dd8a',
    check: (c) => c.level >= 5, progress: (c) => [Math.min(c.level, 5), 5],
  },
  {
    id: 'quest-clear', name: 'QUEST CLEAR', zh: '關卡通過', condition: '完成一個訓練階段', icon: 'flag', color: '#c9a083',
    check: (c) => c.phasesCleared >= 1, progress: (c) => [Math.min(c.phasesCleared, 1), 1],
  },
  {
    id: 'triple-week', name: 'GOOD WEEK', zh: '好棒的一週', condition: '同一週運動 3 天', icon: 'calendar', color: '#b8d8a8',
    check: (c) => c.t.bestWeekDays >= 3, progress: (c) => [Math.min(c.t.bestWeekDays, 3), 3],
  },
  {
    id: 'stretch-buddy', name: 'SOFT BODY', zh: '柔軟小夥伴', condition: '完成 5 次伸展與恢復', icon: 'leaf', color: '#cfe8c4',
    check: (c) => c.t.stretch >= 5, progress: (c) => [Math.min(c.t.stretch, 5), 5],
  },
  {
    id: 'hour-power', name: 'HOUR POWER', zh: '一小時能量', condition: '單次運動達 60 分鐘', icon: 'flame', color: '#f7c08a',
    check: (c) => c.t.longest >= 60, progress: (c) => [Math.min(c.t.longest, 60), 60],
  },
  {
    id: 'marathon', name: 'MARATHON', zh: '馬拉松之心', condition: '累積跑步 42.195 公里', icon: 'trophy', color: '#e8c35e',
    check: (c) => c.t.runKm >= 42.195, progress: (c) => [Math.min(c.t.runKm, 42.195), 42.195],
  },
];

export function badgeContext(records: WorkoutRecord[], phases: Phase[], level: number, today: string): BadgeContext {
  return {
    t: totals(records, today),
    level,
    phasesCleared: phases.filter((p) => p.status === 'completed').length,
  };
}

export function earnedBadgeIds(ctx: BadgeContext): string[] {
  return BADGES.filter((b) => b.check(ctx)).map((b) => b.id);
}
