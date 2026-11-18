/**
 * 闹钟排程引擎（纯函数，不依赖任何平台 API，便于测试和跨平台复用）
 *
 * iOS 最多只允许同时挂 64 个本地通知，所以不能把“每个工作日”这类规则一次性全部注册，
 * 而是每次计算出所有闹钟最近的 N 次触发时间，合并后只注册最早的 N 个（滚动窗口）。
 * App 每次启动 / 回到前台 / 修改闹钟时都会重新计算。
 */

import type { Alarm } from '../types/alarm';
import { usesCnCalendar } from '../types/alarm';
import type { CnCalendar } from './cn-calendar';
import { addDays, combineDateTime, diffDays, toDateKey, weekdayOf, yearOf, type DateKey } from './date-utils';

/** 单个闹钟向后搜索的最大天数 */
export const DEFAULT_HORIZON_DAYS = 400;

export interface Occurrence {
  alarmId: string;
  date: Date;
}

/** 某一天是否会响（不考虑具体时刻） */
export function occursOn(alarm: Alarm, key: DateKey, cal: CnCalendar): boolean {
  const { rule } = alarm;
  if (rule.kind === 'once') return key === rule.date;
  if (alarm.startDate && key < alarm.startDate) return false;
  if (alarm.endDate && key > alarm.endDate) return false;

  switch (rule.kind) {
    case 'daily':
      return true;
    case 'weekly':
      return rule.days.includes(weekdayOf(key));
    case 'cn-workday':
      return cal.isWorkday(key);
    case 'cn-offday':
      return !cal.isWorkday(key);
    case 'interval': {
      const diff = diffDays(rule.anchorDate, key);
      return diff >= 0 && diff % rule.everyDays === 0;
    }
  }
}

/**
 * 计算 from 之后（不含 from 时刻）的触发时间，按时间升序
 */
export function getOccurrences(
  alarm: Alarm,
  from: Date,
  cal: CnCalendar,
  opts: { maxCount?: number; horizonDays?: number } = {},
): Date[] {
  const maxCount = opts.maxCount ?? 64;
  const horizonDays = opts.horizonDays ?? DEFAULT_HORIZON_DAYS;
  const result: Date[] = [];
  if (maxCount <= 0) return result;

  if (alarm.rule.kind === 'once') {
    const at = combineDateTime(alarm.rule.date, alarm.time);
    return at > from ? [at] : [];
  }

  const today = toDateKey(from);
  // 搜索窗口从“生效开始日”与“今天”中较晚者算起，所以很久以后才生效的闹钟也能找到
  let key = alarm.startDate && alarm.startDate > today ? alarm.startDate : today;
  if (alarm.rule.kind === 'interval' && alarm.rule.anchorDate > key) key = alarm.rule.anchorDate;
  const lastKey = addDays(key, horizonDays);

  for (; key <= lastKey; key = addDays(key, 1)) {
    if (alarm.endDate && key > alarm.endDate) break;
    if (!occursOn(alarm, key, cal)) continue;
    const at = combineDateTime(key, alarm.time);
    if (at <= from) continue;
    result.push(at);
    if (result.length >= maxCount) break;
  }
  return result;
}

export function getNextOccurrence(alarm: Alarm, from: Date, cal: CnCalendar): Date | null {
  return getOccurrences(alarm, from, cal, { maxCount: 1 })[0] ?? null;
}

/** 闹钟以后再也不会响了（单次已过 / 时间段已结束） */
export function isExpired(alarm: Alarm, now: Date, cal: CnCalendar): boolean {
  return getNextOccurrence(alarm, now, cal) === null;
}

export interface SchedulePlan {
  /** 需要注册的通知，按时间升序 */
  items: Occurrence[];
  /** 还有更多触发因数量限制没注册 */
  truncated: boolean;
  /** 已注册的最后一次触发时间 */
  coverageEnd: Date | null;
  /** 提醒用户打开 App 以续排的时间（仅 truncated 时有） */
  refreshReminderAt: Date | null;
}

/**
 * 合并所有已启用闹钟，生成最早的 budget 个触发
 * @param budget 通知数量上限（含续排提醒占用的 1 个）
 */
export function planNotifications(
  alarms: Alarm[],
  now: Date,
  cal: CnCalendar,
  budget: number,
): SchedulePlan {
  const slots = Math.max(0, budget - 1); // 预留 1 个给续排提醒
  const all: Occurrence[] = [];
  for (const alarm of alarms) {
    if (!alarm.enabled) continue;
    // 每个闹钟多取 1 个，用来判断是否被截断
    for (const date of getOccurrences(alarm, now, cal, { maxCount: slots + 1 })) {
      all.push({ alarmId: alarm.id, date });
    }
  }
  all.sort((a, b) => a.date.getTime() - b.date.getTime());

  const items = all.slice(0, slots);
  const truncated = all.length > slots;
  const coverageEnd = items.length ? items[items.length - 1].date : null;

  let refreshReminderAt: Date | null = null;
  if (truncated && items.length) {
    // 在窗口用掉约 3/4 时提醒，留出余量
    const pivot = items[Math.min(items.length - 1, Math.floor(items.length * 0.75))].date;
    refreshReminderAt = new Date(pivot.getTime() + 60 * 1000);
  }

  return { items, truncated, coverageEnd, refreshReminderAt };
}

/**
 * 依赖节假日数据、但相关年份未配置的年份列表（用于提示用户补数据）
 */
export function findUncoveredYears(alarm: Alarm, now: Date, cal: CnCalendar, lookaheadDays = 60): number[] {
  if (!alarm.enabled || !usesCnCalendar(alarm.rule)) return [];
  const today = toDateKey(now);
  const start = alarm.startDate && alarm.startDate > today ? alarm.startDate : today;
  let end = addDays(start, lookaheadDays);
  if (alarm.endDate && alarm.endDate < end) end = alarm.endDate;
  if (end < start) return [];
  const years: number[] = [];
  for (let y = yearOf(start); y <= yearOf(end); y++) {
    if (!cal.isYearCovered(y)) years.push(y);
  }
  return years;
}
