// 金幣、商店與寵物 —— 和 EXP 一樣，「賺到的金幣」由真實紀錄即時計算，
// 只有「花掉的金幣」（買過什麼）會存起來，所以不會重複發放。
import type { Phase, WorkoutRecord } from '../types';
import { baseExp } from './game';

export const COIN_PER_BADGE = 20;
export const COIN_PER_PHASE = 30;

export function earnedCoins(records: WorkoutRecord[], phases: Phase[], badgeCount: number, today: string): number {
  let c = 0;
  for (const r of records) if (r.date <= today) c += Math.floor(baseExp(r) / 2);
  c += badgeCount * COIN_PER_BADGE;
  c += phases.filter((p) => p.status === 'completed').length * COIN_PER_PHASE;
  return c;
}

export type ShopSlot = 'hat' | 'outfit' | 'scene' | 'pet';

export interface ShopItem {
  id: string;
  slot: ShopSlot;
  name: string;
  price: number;
  desc: string;
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'bunny', slot: 'hat', name: '兔耳朵', price: 60, desc: '跳起來會一晃一晃' },
  { id: 'flower', slot: 'hat', name: '小花圈', price: 80, desc: '春天的味道' },
  { id: 'headphones', slot: 'hat', name: '運動耳機', price: 100, desc: '跑步要有 BGM' },
  { id: 'wizard', slot: 'hat', name: '魔法帽', price: 140, desc: '施展燃脂魔法' },
  { id: 'scarf', slot: 'outfit', name: '紅色圍巾', price: 50, desc: '晨跑不怕冷' },
  { id: 'bow', slot: 'outfit', name: '粉紅蝴蝶結', price: 60, desc: '可愛加倍' },
  { id: 'stripes', slot: 'outfit', name: '條紋運動衫', price: 90, desc: '復古藍白條紋' },
  { id: 'medal', slot: 'outfit', name: '金牌項鍊', price: 120, desc: '冠軍的證明' },
  { id: 'park', slot: 'scene', name: '晴天公園', price: 70, desc: '太陽和小樹' },
  { id: 'beach', slot: 'scene', name: '海邊沙灘', price: 100, desc: '海浪拍打的聲音' },
  { id: 'night', slot: 'scene', name: '星空夜跑', price: 120, desc: '滿天小星星' },
  { id: 'sakura', slot: 'scene', name: '櫻花步道', price: 150, desc: '花瓣飄落中' },
  { id: 'kitty', slot: 'pet', name: '三花貓', price: 150, desc: '喜歡蹭蹭' },
  { id: 'bunnypet', slot: 'pet', name: '小白兔', price: 180, desc: '跳得比妳還高' },
  { id: 'frog', slot: 'pet', name: '青蛙仔', price: 200, desc: '呱！一起深蹲' },
];

export const SLOT_LABEL: Record<ShopSlot, string> = { hat: '帽子', outfit: '服裝', scene: '背景', pet: '寵物' };

/** 免費、第一次運動後就會出現的寵物 */
export const STARTER_PET = 'chick';
export const PET_NAMES: Record<string, string> = { chick: '小雞', kitty: '三花貓', bunnypet: '小白兔', frog: '青蛙仔' };

export interface Purchase {
  price: number;
  at: number;
}

export interface ShopState {
  owned: Record<string, Purchase>;
}

export function spentCoins(shop: ShopState): number {
  return Object.values(shop.owned).reduce((s, p) => s + p.price, 0);
}

// ---------------- 寵物 ----------------

export interface PetState {
  name: string;
  lastFed: number;
  lastPlayed: number;
  lastPetted: number;
  snacksUsed: number;
  affection: number;
}

export const DEFAULT_PET: PetState = { name: '', lastFed: 0, lastPlayed: 0, lastPetted: 0, snacksUsed: 0, affection: 0 };

/** 每個運動日 2 份點心，完成階段再 5 份 */
export function earnedSnacks(records: WorkoutRecord[], phases: Phase[], today: string): number {
  const days = new Set(records.filter((r) => r.date <= today && baseExp(r) > 0).map((r) => r.date)).size;
  return days * 2 + phases.filter((p) => p.status === 'completed').length * 5;
}

const HOUR = 3600_000;
export const CARE_COOLDOWN = 30 * 60_000; // 同一種互動 30 分鐘內只加一次親密度
const MIN_STAT = 20; // 不會餓壞、不會死掉，最低只是想睡覺

/** 飽足度：餵食後 100，之後每小時 -3 */
export function fullness(p: PetState, now: number): number {
  if (!p.lastFed) return 60;
  return Math.round(Math.max(MIN_STAT, Math.min(100, 100 - ((now - p.lastFed) / HOUR) * 3)));
}

/** 開心度：玩耍後 100、摸摸 +15，之後每小時 -2 */
export function happiness(p: PetState, now: number): number {
  const fromPlay = p.lastPlayed ? 100 - ((now - p.lastPlayed) / HOUR) * 2 : 60;
  const fromPet = p.lastPetted ? 75 - ((now - p.lastPetted) / HOUR) * 2 : 0;
  return Math.round(Math.max(MIN_STAT, Math.min(100, Math.max(fromPlay, fromPet))));
}

export function affectionLevel(a: number): { level: number; current: number; need: number } {
  let level = 1;
  let rest = a;
  while (rest >= level * 5 && level < 10) {
    rest -= level * 5;
    level++;
  }
  return { level, current: rest, need: level * 5 };
}

export type PetMood = 'happy' | 'ok' | 'hungry' | 'sleepy';

export function petMood(p: PetState, now: number): PetMood {
  const f = fullness(p, now);
  const h = happiness(p, now);
  if (f <= 35) return 'hungry';
  if (h <= 35) return 'sleepy';
  if (f >= 70 && h >= 70) return 'happy';
  return 'ok';
}

export const PET_LINES: Record<PetMood, string[]> = {
  happy: ['今天好開心！', '再摸摸我～', '我們最棒了！'],
  ok: ['陪我玩一下嘛', '妳今天運動了嗎？', '啾啾～'],
  hungry: ['肚子咕嚕咕嚕…', '運動完可以換點心喔！'],
  sleepy: ['好想妳喔…', '有點無聊，陪我玩？'],
};
