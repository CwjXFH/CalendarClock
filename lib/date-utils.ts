/**
 * 本地日期工具（全部按设备本地时区计算，避免 toISOString 的 UTC 偏移问题）
 * DateKey 统一使用 YYYY-MM-DD 字符串
 */

export type DateKey = string;

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const pad2 = (n: number) => String(n).padStart(2, '0');

export function toDateKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function isValidDateKey(key: unknown): key is DateKey {
  if (typeof key !== 'string') return false;
  const m = DATE_KEY_RE.exec(key);
  if (!m) return false;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return toDateKey(d) === key;
}

/** 解析为本地 0 点 */
export function parseDateKey(key: DateKey): Date {
  const m = DATE_KEY_RE.exec(key);
  if (!m) throw new Error(`Invalid date key: ${key}`);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function addDays(key: DateKey, n: number): DateKey {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
}

/** b - a 的天数差（按日历日计） */
export function diffDays(a: DateKey, b: DateKey): number {
  const da = parseDateKey(a);
  const db = parseDateKey(b);
  // 使用 UTC 计算避免夏令时造成的 23/25 小时
  const ua = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
  const ub = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
  return Math.round((ub - ua) / 86400000);
}

/** 0=周日 ... 6=周六 */
export function weekdayOf(key: DateKey): number {
  return parseDateKey(key).getDay();
}

export function yearOf(key: DateKey): number {
  return Number(key.slice(0, 4));
}

export function isValidTime(time: unknown): time is string {
  return typeof time === 'string' && TIME_RE.test(time);
}

export function parseTime(time: string): { hour: number; minute: number } {
  const m = TIME_RE.exec(time);
  if (!m) throw new Error(`Invalid time: ${time}`);
  return { hour: Number(m[1]), minute: Number(m[2]) };
}

export function formatTimeOfDate(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** 日期 + 时刻 → 本地 Date */
export function combineDateTime(key: DateKey, time: string): Date {
  const d = parseDateKey(key);
  const { hour, minute } = parseTime(time);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/** 例：11月19日 周四 */
export function formatMonthDayWeek(key: DateKey): string {
  const d = parseDateKey(key);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAY_NAMES[d.getDay()]}`;
}

/** 例：2026年11月19日 */
export function formatFullDate(key: DateKey): string {
  const d = parseDateKey(key);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 列表里的简短日期：同年省略年份 */
export function formatShortDate(key: DateKey, today: DateKey = toDateKey(new Date())): string {
  const d = parseDateKey(key);
  if (yearOf(key) === yearOf(today)) return `${d.getMonth() + 1}月${d.getDate()}日`;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}
