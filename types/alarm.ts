/**
 * 闹钟数据类型定义
 */

import {
  addDays,
  combineDateTime,
  formatShortDate,
  isValidDateKey,
  toDateKey,
  WEEKDAY_NAMES,
  type DateKey,
} from '../lib/date-utils';

/** 重复规则 */
export type RepeatRule =
  /** 仅一次，指定日期（可以是很久以后的某天） */
  | { kind: 'once'; date: DateKey }
  /** 每天 */
  | { kind: 'daily' }
  /** 每周的某几天，0=周日 ... 6=周六 */
  | { kind: 'weekly'; days: number[] }
  /** 中国法定工作日：周一至周五 + 调休上班日 − 法定节假日 */
  | { kind: 'cn-workday' }
  /** 中国法定休息日：周末 + 法定节假日 − 调休上班日 */
  | { kind: 'cn-offday' }
  /** 每 N 天，从 anchorDate 起算 */
  | { kind: 'interval'; everyDays: number; anchorDate: DateKey };

export type RepeatKind = RepeatRule['kind'];

export interface Alarm {
  id: string;
  /** HH:mm */
  time: string;
  label: string;
  enabled: boolean;
  rule: RepeatRule;
  /** 生效开始日期（含），不填表示立即生效。对 once 无意义 */
  startDate?: DateKey;
  /** 生效结束日期（含），不填表示一直有效。对 once 无意义 */
  endDate?: DateKey;
  soundId: string;
  soundName: string;
  createdAt: string;
  updatedAt: string;
}

export type AlarmInput = Omit<Alarm, 'id' | 'createdAt' | 'updatedAt'>;

export interface Sound {
  id: string;
  name: string;
  uri: string;
  isCustom: boolean;
}

export const DEFAULT_SOUND = { soundId: 'default', soundName: '系统默认铃声' } as const;

export const REPEAT_KIND_LABELS: Record<RepeatKind, string> = {
  once: '仅一次',
  daily: '每天',
  weekly: '每周',
  'cn-workday': '法定工作日',
  'cn-offday': '法定休息日',
  interval: '每隔几天',
};

/** 规则是否依赖节假日数据 */
export function usesCnCalendar(rule: RepeatRule): boolean {
  return rule.kind === 'cn-workday' || rule.kind === 'cn-offday';
}

export function describeRule(rule: RepeatRule, today: DateKey = toDateKey(new Date())): string {
  switch (rule.kind) {
    case 'once':
      return formatShortDate(rule.date, today);
    case 'daily':
      return '每天';
    case 'weekly': {
      const days = [...rule.days].sort((a, b) => a - b);
      if (days.length === 7) return '每天';
      if (days.length === 5 && days.every((d) => d >= 1 && d <= 5)) return '每周一至周五';
      if (days.length === 2 && days[0] === 0 && days[1] === 6) return '每周末';
      // 周一排在前面，周日放最后
      const ordered = [...days.filter((d) => d !== 0), ...days.filter((d) => d === 0)];
      return ordered.map((d) => WEEKDAY_NAMES[d]).join('、');
    }
    case 'cn-workday':
      return '法定工作日';
    case 'cn-offday':
      return '法定休息日';
    case 'interval':
      return rule.everyDays === 1 ? '每天' : `每${rule.everyDays}天`;
  }
}

export function describePeriod(alarm: Pick<Alarm, 'rule' | 'startDate' | 'endDate'>, today: DateKey = toDateKey(new Date())): string | null {
  if (alarm.rule.kind === 'once') return null;
  const { startDate, endDate } = alarm;
  if (startDate && endDate) return `${formatShortDate(startDate, today)} 至 ${formatShortDate(endDate, today)}`;
  if (startDate) return `${formatShortDate(startDate, today)} 起`;
  if (endDate) return `至 ${formatShortDate(endDate, today)}`;
  return null;
}

/** 下一个“该时刻”所在的日期：今天还没到就是今天，否则明天 */
export function nextDateForTime(time: string, now: Date = new Date()): DateKey {
  const today = toDateKey(now);
  return combineDateTime(today, time) > now ? today : addDays(today, 1);
}

export function createDefaultAlarm(now: Date = new Date()): AlarmInput {
  const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
  const time = `${String(nextHour.getHours()).padStart(2, '0')}:00`;
  return {
    time,
    label: '',
    enabled: true,
    rule: { kind: 'once', date: nextDateForTime(time, now) },
    ...DEFAULT_SOUND,
  };
}

/* ---------------- 规则解析（数据库中以 JSON 存储） ---------------- */

/** 解析并校验规则；非法返回 null */
export function parseRule(value: unknown): RepeatRule | null {
  let raw: unknown = value;
  if (typeof value === 'string') {
    try {
      raw = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!raw || typeof raw !== 'object' || !('kind' in raw)) return null;
  return sanitizeRule(raw as RepeatRule);
}

function sanitizeRule(rule: RepeatRule): RepeatRule | null {
  switch (rule.kind) {
    case 'once':
      return isValidDateKey(rule.date) ? { kind: 'once', date: rule.date } : null;
    case 'daily':
    case 'cn-workday':
    case 'cn-offday':
      return { kind: rule.kind };
    case 'weekly': {
      const days = Array.isArray(rule.days)
        ? [...new Set(rule.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort()
        : [];
      return days.length ? { kind: 'weekly', days } : null;
    }
    case 'interval':
      return Number.isInteger(rule.everyDays) && rule.everyDays >= 1 && isValidDateKey(rule.anchorDate)
        ? { kind: 'interval', everyDays: rule.everyDays, anchorDate: rule.anchorDate }
        : null;
    default:
      return null;
  }
}
