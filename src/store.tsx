import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { db, uid } from './db';
import { addDays, startOfWeek, todayISO } from './logic/dates';
import { computeExp, levelFromExp } from './logic/game';
import { BADGES, badgeContext, earnedBadgeIds } from './logic/badges';
import { planPhaseMerge, planRecordMerge, validateBackup } from './logic/backup';
import { setSoundEnabled, sfx } from './sfx';
import { CARE_COOLDOWN, DEFAULT_PET, SHOP_ITEMS, earnedCoins, earnedSnacks, spentCoins, type PetState, type ShopState } from './logic/shop';
import type { BackupFile, DayPlan, ExerciseType, Phase, Progress, Settings, WorkoutRecord } from './types';

export type Tab = 'home' | 'checkin' | 'plan' | 'calendar' | 'profile';
export const TABS: Tab[] = ['home', 'checkin', 'plan', 'calendar', 'profile'];

export interface CheckInPreset {
  date?: string;
  type?: ExerciseType;
  nonce: number;
}

export type Celebration =
  | { kind: 'level'; level: number }
  | { kind: 'badge'; id: string };

export interface Toast {
  id: number;
  text: string;
  tone: 'ok' | 'err' | 'info';
}

const DEFAULT_SETTINGS: Settings = { heroName: '小像素', palette: 'mint', accessory: 'none', outfit: 'none', scene: 'none', pet: 'chick', motion: 'auto', sound: false };
const DEFAULT_SHOP: ShopState = { owned: {} };
const DEFAULT_PROGRESS: Progress = { celebratedLevel: 1, seenBadges: {} };

function rest(note = '休息日'): DayPlan {
  return { rest: true, types: [], note };
}
function train(types: ExerciseType[], note = ''): DayPlan {
  return { rest: false, types, note };
}

/** 第一次開啟時建立的範例階段（可自由修改或刪除） */
function samplePhases(today: string): Phase[] {
  const start = startOfWeek(today);
  const mk = (i: number, name: string, goal: string, items: string[], sessionGoal: string, weekly: DayPlan[]): Phase => ({
    id: uid(),
    name,
    startDate: addDays(start, i * 28),
    endDate: addDays(start, i * 28 + 27),
    goal,
    items,
    sessionGoal,
    weekly,
    status: 'active',
    review: '',
    createdAt: Date.now() + i,
    updatedAt: Date.now() + i,
  });
  // weekly index：0=日 1=一 … 6=六
  return [
    mk(0, '第一階段：降體脂', '養成規律運動習慣，每週至少運動 4 天', ['慢跑', '快走', '跳繩', '伸展'], '每次 30 分鐘以上', [
      rest(), train(['run']), train(['core']), train(['cardio']), rest(), train(['run']), train(['stretch']),
    ]),
    mk(1, '第二階段：心肺訓練', '提升心肺耐力，連續跑 5 公里', ['間歇跑', '登階', '開合跳'], '心率維持在中強度 20 分鐘', [
      rest(), train(['run']), train(['cardio']), train(['core']), train(['run']), rest(), train(['cardio', 'stretch']),
    ]),
    mk(2, '第三階段：核心強化', '穩定核心，棒式撐到 2 分鐘', ['棒式', '死蟲式', '登山者', '橋式'], '核心動作 4 組', [
      rest(), train(['core']), train(['run']), train(['core']), rest(), train(['core', 'cardio']), train(['stretch']),
    ]),
    mk(3, '第四階段：體態雕塑', '線條更緊實、體態更挺拔', ['深蹲', '臀推', '划船', '肩推'], '每個動作 3 組 × 12 下', [
      rest(), train(['sculpt']), train(['cardio']), train(['sculpt']), rest(), train(['sculpt', 'core']), train(['stretch']),
    ]),
  ];
}

function useStoreValue() {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<WorkoutRecord[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [progress, setProgress] = useState<Progress>(DEFAULT_PROGRESS);
  const [lastBackupAt, setLastBackupAt] = useState<number | null>(null);
  const [shop, setShop] = useState<ShopState>(DEFAULT_SHOP);
  const [pet, setPet] = useState<PetState>(DEFAULT_PET);
  const [today, setToday] = useState(todayISO());
  const [now, setNow] = useState(Date.now());
  const [tab, setTabState] = useState<Tab>(() => {
    const h = location.hash.replace('#', '') as Tab;
    return TABS.includes(h) ? h : 'home';
  });
  const [preset, setPreset] = useState<CheckInPreset>({ nonce: 0 });
  const [profileView, setProfileView] = useState<'hero' | 'shop' | 'pet'>('hero');
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  // ---------- 載入 ----------
  useEffect(() => {
    (async () => {
      try {
        const [r, p, s, pr, lb, seeded, sh, pt] = await Promise.all([
          db.allRecords(),
          db.allPhases(),
          db.getMeta<Settings>('settings'),
          db.getMeta<Progress>('progress'),
          db.getMeta<number>('lastBackupAt'),
          db.getMeta<boolean>('seeded'),
          db.getMeta<ShopState>('shop'),
          db.getMeta<PetState>('pet'),
        ]);
        let ph = p;
        if (!seeded && p.length === 0) {
          ph = samplePhases(todayISO());
          await db.bulkWrite([], ph, [{ key: 'seeded', value: true }]);
        }
        setRecords(r);
        setPhases(ph);
        setSettings({ ...DEFAULT_SETTINGS, ...(s || {}) });
        setProgress({ ...DEFAULT_PROGRESS, ...(pr || {}) });
        setLastBackupAt(lb ?? null);
        setShop({ owned: { ...(sh?.owned || {}) } });
        setPet({ ...DEFAULT_PET, ...(pt || {}) });
        setLoaded(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  // 跨日時更新「今天」
  useEffect(() => {
    const tick = () => {
      setToday(todayISO());
      setNow(Date.now());
    };
    const iv = setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(iv);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);

  // 分頁與網址 hash 同步（支援返回鍵）
  useEffect(() => {
    const onHash = () => {
      const h = location.hash.replace('#', '') as Tab;
      if (TABS.includes(h)) setTabState(h);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const setTab = useCallback((t: Tab) => {
    if (location.hash !== '#' + t) location.hash = t;
    setTabState(t);
    window.scrollTo({ top: 0 });
  }, []);

  const goCheckIn = useCallback(
    (p: { date?: string; type?: ExerciseType } = {}) => {
      setPreset((old) => ({ ...p, nonce: old.nonce + 1 }));
      setTab('checkin');
    },
    [setTab],
  );

  const openProfile = useCallback(
    (v: 'hero' | 'shop' | 'pet') => {
      setProfileView(v);
      setTab('profile');
    },
    [setTab],
  );

  // ---------- 動畫 / 音效設定 ----------
  useEffect(() => {
    setSoundEnabled(settings.sound);
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const apply = () => {
      const off = settings.motion === 'off' || (settings.motion === 'auto' && !!mq?.matches);
      document.documentElement.dataset.motion = off ? 'off' : 'on';
    };
    apply();
    mq?.addEventListener?.('change', apply);
    return () => mq?.removeEventListener?.('change', apply);
  }, [settings.motion, settings.sound]);

  // ---------- 衍生資料 ----------
  const exp = useMemo(() => computeExp(records, phases, today), [records, phases, today]);
  const level = useMemo(() => levelFromExp(exp.total), [exp.total]);
  const badgeCtx = useMemo(() => badgeContext(records, phases, level.level, today), [records, phases, level.level, today]);
  const earned = useMemo(() => earnedBadgeIds(badgeCtx), [badgeCtx]);
  const coinsEarned = useMemo(() => earnedCoins(records, phases, earned.length, today), [records, phases, earned.length, today]);
  const coins = coinsEarned - spentCoins(shop);
  const snacks = Math.max(0, earnedSnacks(records, phases, today) - pet.snacksUsed);
  const petHatched = exp.total - exp.phaseBonus > 0;

  // ---------- 升級 / 徽章提示（每個只提示一次，持久保存） ----------
  useEffect(() => {
    if (!loaded) return;
    const queue: Celebration[] = [];
    let next = progress;
    if (level.level > progress.celebratedLevel) {
      queue.push({ kind: 'level', level: level.level });
      next = { ...next, celebratedLevel: level.level };
    }
    const fresh = earned.filter((id) => !(id in progress.seenBadges));
    if (fresh.length) {
      const seen = { ...next.seenBadges };
      const now = Date.now();
      fresh.forEach((id, i) => (seen[id] = now + i));
      next = { ...next, seenBadges: seen };
      fresh.forEach((id) => queue.push({ kind: 'badge', id }));
    }
    if (next !== progress) {
      setProgress(next);
      void db.setMeta('progress', next);
      setCelebrations((c) => [...c, ...queue]);
    }
  }, [loaded, level.level, earned, progress]);

  const toast = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  const dismissCelebration = useCallback(() => setCelebrations((c) => c.slice(1)), []);

  // ---------- 運動紀錄 ----------
  const saveRecord = useCallback(
    async (input: Omit<WorkoutRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
      const now = Date.now();
      const existing = input.id ? records.find((r) => r.id === input.id) : undefined;
      const rec: WorkoutRecord = {
        ...input,
        id: existing?.id ?? uid(),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      await db.putRecord(rec);
      const nextRecords = existing ? records.map((r) => (r.id === rec.id ? rec : r)) : [...records, rec];
      const before = exp.total;
      const after = computeExp(nextRecords, phases, today).total;
      setRecords(nextRecords);
      return { record: rec, gained: after - before, isNew: !existing };
    },
    [records, phases, exp.total, today],
  );

  const deleteRecord = useCallback(
    async (id: string) => {
      await db.deleteRecord(id);
      setRecords((rs) => rs.filter((r) => r.id !== id));
    },
    [],
  );

  // ---------- 訓練階段 ----------
  const savePhase = useCallback(async (p: Phase) => {
    const next = { ...p, updatedAt: Date.now() };
    await db.putPhase(next);
    setPhases((ps) => (ps.some((x) => x.id === p.id) ? ps.map((x) => (x.id === p.id ? next : x)) : [...ps, next]));
    return next;
  }, []);

  const deletePhase = useCallback(async (id: string) => {
    await db.deletePhase(id);
    setPhases((ps) => ps.filter((p) => p.id !== id));
  }, []);

  // ---------- 設定 ----------
  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const next = { ...settings, ...patch };
      setSettings(next);
      await db.setMeta('settings', next);
    },
    [settings],
  );

  // ---------- 商店 ----------
  const buyItem = useCallback(
    async (id: string) => {
      const item = SHOP_ITEMS.find((i) => i.id === id);
      if (!item) throw new Error('找不到這個商品');
      if (shop.owned[id]) return false;
      if (coins < item.price) throw new Error(`金幣不夠，還差 ${item.price - coins} 枚`);
      const next: ShopState = { owned: { ...shop.owned, [id]: { price: item.price, at: Date.now() } } };
      await db.setMeta('shop', next);
      setShop(next);
      return true;
    },
    [shop, coins],
  );

  // ---------- 寵物 ----------
  const savePet = useCallback(async (next: PetState) => {
    setPet(next);
    await db.setMeta('pet', next);
  }, []);

  /** 回傳這次互動有沒有增加親密度（同一種互動 30 分鐘內只算一次） */
  const petAct = useCallback(
    async (kind: 'feed' | 'play' | 'pet') => {
      const t = Date.now();
      const key = kind === 'feed' ? 'lastFed' : kind === 'play' ? 'lastPlayed' : 'lastPetted';
      if (kind === 'feed' && snacks <= 0) throw new Error('沒有點心了，運動一天可以拿到 2 份');
      const gain = t - pet[key] >= CARE_COOLDOWN ? 1 : 0;
      const next: PetState = {
        ...pet,
        [key]: t,
        snacksUsed: pet.snacksUsed + (kind === 'feed' ? 1 : 0),
        affection: pet.affection + gain,
      };
      setNow(t);
      await savePet(next);
      return gain > 0;
    },
    [pet, snacks, savePet],
  );

  const renamePet = useCallback(async (name: string) => savePet({ ...pet, name: name.slice(0, 10) }), [pet, savePet]);

  // ---------- 備份 ----------
  const buildBackup = useCallback((): BackupFile => {
    return {
      app: 'pixel-fit',
      schema: 1,
      exportedAt: new Date().toISOString(),
      records,
      phases,
      settings,
      progress,
      shop,
      pet: { ...pet },
    };
  }, [records, phases, settings, progress, shop, pet]);

  const markBackedUp = useCallback(async () => {
    const t = Date.now();
    setLastBackupAt(t);
    await db.setMeta('lastBackupAt', t);
  }, []);

  const previewImport = useCallback(
    (json: unknown) => {
      const v = validateBackup(json);
      if (!v.ok || !v.data) return { ok: false as const, errors: v.errors };
      const rp = planRecordMerge(records, v.data.records);
      const pp = planPhaseMerge(phases, v.data.phases);
      return { ok: true as const, data: v.data, rp, pp };
    },
    [records, phases],
  );

  const applyImport = useCallback(
    async (json: unknown) => {
      const pv = previewImport(json);
      if (!pv.ok) throw new Error(pv.errors.join('\n'));
      const { rp, pp, data } = pv;
      const nextRecords = [...records];
      for (const r of rp.update) nextRecords[nextRecords.findIndex((x) => x.id === r.id)] = r;
      nextRecords.push(...rp.add);
      const nextPhases = [...phases];
      for (const p of pp.update) nextPhases[nextPhases.findIndex((x) => x.id === p.id)] = p;
      nextPhases.push(...pp.add);
      // 匯入後直接把目前已達成的等級 / 徽章標記為已提示，避免一次跳出一堆視窗
      const lv = levelFromExp(computeExp(nextRecords, nextPhases, today).total).level;
      const ids = earnedBadgeIds(badgeContext(nextRecords, nextPhases, lv, today));
      const seen = { ...progress.seenBadges, ...(data.progress?.seenBadges || {}) };
      const now = Date.now();
      ids.forEach((id) => {
        if (!(id in seen)) seen[id] = now;
      });
      for (const k of Object.keys(seen)) if (!BADGES.some((b) => b.id === k)) delete seen[k];
      const nextProgress: Progress = { celebratedLevel: Math.max(progress.celebratedLevel, lv), seenBadges: seen };
      const nextSettings: Settings = { ...settings, ...(data.settings || {}) };
      // 已購買的商品取聯集；寵物狀態取較新的那一份
      const owned = { ...shop.owned };
      for (const [k, v] of Object.entries(data.shop?.owned || {})) if (!owned[k] && SHOP_ITEMS.some((i) => i.id === k)) owned[k] = v;
      const nextShop: ShopState = { owned };
      const ip = data.pet;
      const nextPet: PetState =
        ip && ip.affection > pet.affection ? { ...DEFAULT_PET, ...ip } : { ...pet, snacksUsed: Math.max(pet.snacksUsed, ip?.snacksUsed || 0) };
      await db.bulkWrite([...rp.add, ...rp.update], [...pp.add, ...pp.update], [
        { key: 'progress', value: nextProgress },
        { key: 'settings', value: nextSettings },
        { key: 'seeded', value: true },
        { key: 'shop', value: nextShop },
        { key: 'pet', value: nextPet },
      ]);
      setShop(nextShop);
      setPet(nextPet);
      setProgress(nextProgress);
      setSettings(nextSettings);
      setRecords(nextRecords);
      setPhases(nextPhases);
      return { addedRecords: rp.add.length, updatedRecords: rp.update.length, skippedRecords: rp.skipped, addedPhases: pp.add.length, updatedPhases: pp.update.length };
    },
    [previewImport, records, phases, progress, settings, today, shop, pet],
  );

  const clearAll = useCallback(async () => {
    await db.clearAll();
    await db.setMeta('seeded', true); // 清除後不再自動建立範例
    setRecords([]);
    setPhases([]);
    setSettings(DEFAULT_SETTINGS);
    setProgress(DEFAULT_PROGRESS);
    setLastBackupAt(null);
    setShop(DEFAULT_SHOP);
    setPet(DEFAULT_PET);
    setCelebrations([]);
  }, []);

  const restoreSamples = useCallback(async () => {
    const ph = samplePhases(today);
    await db.bulkWrite([], ph);
    setPhases((ps) => [...ps, ...ph]);
  }, [today]);

  return {
    loaded, error, records, phases, settings, progress, lastBackupAt, today, now,
    shop, coins, coinsEarned, buyItem, pet, snacks, petHatched, petAct, renamePet,
    tab, setTab, preset, goCheckIn, profileView, setProfileView, openProfile,
    exp, level, badgeCtx, earned,
    celebrations, dismissCelebration, toasts, toast,
    saveRecord, deleteRecord, savePhase, deletePhase, updateSettings,
    buildBackup, markBackedUp, previewImport, applyImport, clearAll, restoreSamples,
    sfx,
  };
}

export type Store = ReturnType<typeof useStoreValue>;
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const v = useStoreValue();
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error('StoreProvider missing');
  return v;
}
