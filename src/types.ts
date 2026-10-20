export type ExerciseType = 'run' | 'core' | 'cardio' | 'sculpt' | 'stretch' | 'custom';

export const EXERCISE_TYPES: ExerciseType[] = ['run', 'core', 'cardio', 'sculpt', 'stretch', 'custom'];

export const TYPE_LABEL: Record<ExerciseType, string> = {
  run: '跑步',
  core: '核心訓練',
  cardio: '心肺訓練',
  sculpt: '體態雕塑',
  stretch: '伸展與恢復',
  custom: '自訂運動',
};

/** 每種運動類型會顯示的選填欄位 */
export const TYPE_FIELDS: Record<ExerciseType, { distance: boolean; sets: boolean; weight: boolean }> = {
  run: { distance: true, sets: false, weight: false },
  core: { distance: false, sets: true, weight: true },
  cardio: { distance: true, sets: true, weight: false },
  sculpt: { distance: false, sets: true, weight: true },
  stretch: { distance: false, sets: false, weight: false },
  custom: { distance: true, sets: true, weight: true },
};

export const BODY_STATES = ['精神飽滿', '狀態不錯', '普通', '有點疲累', '肌肉痠痛', '身體不適'] as const;
export const MOODS = ['😆', '😊', '🙂', '😐', '😮‍💨', '😣'] as const;

export interface WorkoutRecord {
  id: string;
  /** YYYY-MM-DD（本地日期） */
  date: string;
  type: ExerciseType;
  name: string;
  /** 分鐘 */
  duration: number;
  /** 公里 */
  distance?: number;
  sets?: number;
  reps?: number;
  /** 公斤 */
  weight?: number;
  body: string;
  mood: string;
  note: string;
  createdAt: number;
  updatedAt: number;
}

export interface DayPlan {
  rest: boolean;
  types: ExerciseType[];
  note: string;
}

/** index 0 = 星期日 … 6 = 星期六（與 Date.getDay() 相同） */
export type WeeklySchedule = DayPlan[];

export type PhaseStatus = 'active' | 'paused' | 'completed';

export interface Phase {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  goal: string;
  items: string[];
  sessionGoal: string;
  weekly: WeeklySchedule;
  status: PhaseStatus;
  pausedAt?: string;
  completedAt?: string;
  review: string;
  createdAt: number;
  updatedAt: number;
}

export type MotionPref = 'auto' | 'on' | 'off';

export interface Settings {
  heroName: string;
  palette: string;
  /** 帽子欄位：等級獎勵或商店買的帽子 */
  accessory: string;
  outfit: string;
  scene: string;
  /** 目前帶在身邊的寵物 */
  pet: string;
  motion: MotionPref;
  sound: boolean;
}

export interface Progress {
  /** 已顯示過升級慶祝的最高等級，避免重新整理後重複慶祝 */
  celebratedLevel: number;
  /** 徽章 id → 第一次解鎖的時間戳記；同一徽章只會提示一次 */
  seenBadges: Record<string, number>;
}

export interface BackupFile {
  app: 'pixel-fit';
  schema: 1;
  exportedAt: string;
  records: WorkoutRecord[];
  phases: Phase[];
  settings?: Partial<Settings>;
  progress?: Partial<Progress>;
  shop?: { owned?: Record<string, { price: number; at: number }> };
  pet?: Record<string, unknown>;
}
