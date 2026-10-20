// 全部使用「本地日期字串 YYYY-MM-DD」，避免 UTC 時區造成跨日錯誤。

export function pad(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(now: Date = new Date()): string {
  return toISO(now);
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isValidISO(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = parseISO(s);
  return toISO(d) === s;
}

export function addDays(s: string, n: number): string {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function diffDays(a: string, b: string): number {
  // b - a（天）
  const ms = parseISO(b).getTime() - parseISO(a).getTime();
  return Math.round(ms / 86400000);
}

export function weekday(s: string): number {
  return parseISO(s).getDay();
}

/** 週一為一週的開始 */
export function startOfWeek(s: string): string {
  const wd = weekday(s);
  const offset = (wd + 6) % 7;
  return addDays(s, -offset);
}

export function weekDates(s: string): string[] {
  const start = startOfWeek(s);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  if (from > to) return out;
  let cur = from;
  while (cur <= to) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

export const WEEKDAY_LABEL = ['日', '一', '二', '三', '四', '五', '六'];

export function formatCN(s: string): string {
  const d = parseISO(s);
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}（${WEEKDAY_LABEL[d.getDay()]}）`;
}

export function formatShort(s: string): string {
  const d = parseISO(s);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function monthKey(s: string): string {
  return s.slice(0, 7);
}
