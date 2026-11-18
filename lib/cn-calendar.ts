/**
 * 中国法定工作日/休息日判断
 * 数据来源：本地 SQLite（首次启动从 config/holidays/*.json 导入，可在“设置”中维护）
 */

import type { HolidayYearConfig } from '../config/holidays';
import { addDays, diffDays, isValidDateKey, weekdayOf, yearOf, type DateKey } from './date-utils';

export type DayKind =
  | 'holiday' // 法定节假日（放假）
  | 'adjusted-workday' // 调休上班
  | 'workday' // 普通工作日
  | 'weekend'; // 普通周末

export interface DayInfo {
  kind: DayKind;
  /** 节日 / 调休名称 */
  name?: string;
  /** 该年份是否有配置数据；false 时结果仅按周一至周五推算 */
  covered: boolean;
}

export interface CnCalendar {
  getDayInfo(key: DateKey): DayInfo;
  /** 是否需要上班（含调休上班日） */
  isWorkday(key: DateKey): boolean;
  isYearCovered(year: number): boolean;
  coveredYears: number[];
  configs: HolidayYearConfig[];
}

/**
 * 解析外部输入（导入的 JSON）为节假日配置，并做完整校验
 * 支持单个年份对象或数组
 */
export function parseHolidayConfigs(text: string): { configs: HolidayYearConfig[]; errors: string[] } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { configs: [], errors: ['不是合法的 JSON'] };
  }
  const items = Array.isArray(raw) ? raw : [raw];
  const configs: HolidayYearConfig[] = [];
  const errors: string[] = [];
  items.forEach((item, i) => {
    const where = `第 ${i + 1} 项`;
    if (!item || typeof item !== 'object') {
      errors.push(`${where} 不是对象`);
      return;
    }
    const o = item as Record<string, unknown>;
    if (!Number.isInteger(o.year)) {
      errors.push(`${where} 缺少 year`);
      return;
    }
    if (!Array.isArray(o.holidays) || (o.workdays !== undefined && !Array.isArray(o.workdays))) {
      errors.push(`${where} holidays / workdays 必须是数组`);
      return;
    }
    const cfg: HolidayYearConfig = {
      year: o.year as number,
      ...(typeof o.source === 'string' && o.source ? { source: o.source } : {}),
      holidays: (o.holidays as Record<string, unknown>[]).map((h) => ({
        name: String(h?.name ?? ''),
        start: String(h?.start ?? ''),
        end: String(h?.end ?? h?.start ?? ''),
      })),
      workdays: ((o.workdays ?? []) as Record<string, unknown>[]).map((w) =>
        typeof w?.name === 'string' && w.name ? { date: String(w?.date ?? ''), name: w.name } : { date: String(w?.date ?? '') },
      ),
    };
    const errs = validateHolidayConfig(cfg);
    if (errs.length) errors.push(...errs);
    else configs.push(cfg);
  });
  const years = configs.map((c) => c.year);
  if (new Set(years).size !== years.length) errors.push('同一年份出现了多次');
  return { configs: errors.length ? [] : configs, errors };
}

export function validateHolidayConfig(cfg: HolidayYearConfig): string[] {
  const errors: string[] = [];
  const prefix = `[${cfg.year}]`;
  if (!Number.isInteger(cfg.year)) errors.push(`${prefix} year 必须是整数`);

  const holidayDates = new Set<DateKey>();
  for (const h of cfg.holidays ?? []) {
    if (!h.name) errors.push(`${prefix} 节假日缺少 name`);
    if (!isValidDateKey(h.start) || !isValidDateKey(h.end)) {
      errors.push(`${prefix} ${h.name} 日期格式错误（应为 YYYY-MM-DD）`);
      continue;
    }
    if (diffDays(h.start, h.end) < 0) errors.push(`${prefix} ${h.name} 结束日期早于开始日期`);
    if (diffDays(h.start, h.end) > 15) errors.push(`${prefix} ${h.name} 假期超过 15 天，请检查`);
    for (let k = h.start; diffDays(k, h.end) >= 0; k = addDays(k, 1)) {
      // 跨年假期（如元旦从上一年 12 月开始）允许出现在相邻年份
      if (Math.abs(yearOf(k) - cfg.year) > 1) errors.push(`${prefix} ${h.name} 日期 ${k} 与年份不符`);
      if (holidayDates.has(k)) errors.push(`${prefix} 日期 ${k} 重复配置`);
      holidayDates.add(k);
    }
  }

  for (const w of cfg.workdays ?? []) {
    if (!isValidDateKey(w.date)) {
      errors.push(`${prefix} 调休日 ${w.date} 格式错误`);
      continue;
    }
    if (Math.abs(yearOf(w.date) - cfg.year) > 1) errors.push(`${prefix} 调休日 ${w.date} 与年份不符`);
    const wd = weekdayOf(w.date);
    if (wd !== 0 && wd !== 6) errors.push(`${prefix} 调休日 ${w.date} 不是周末，请检查`);
    if (holidayDates.has(w.date)) errors.push(`${prefix} ${w.date} 同时是假期和调休日`);
  }
  return errors;
}

export function createCnCalendar(configs: HolidayYearConfig[]): CnCalendar {
  const holidays = new Map<DateKey, string>();
  const workdays = new Map<DateKey, string>();
  const years = new Set<number>();

  for (const cfg of configs) {
    years.add(cfg.year);
    for (const h of cfg.holidays) {
      if (!isValidDateKey(h.start) || !isValidDateKey(h.end)) continue;
      for (let k = h.start; diffDays(k, h.end) >= 0; k = addDays(k, 1)) {
        holidays.set(k, h.name);
      }
    }
    for (const w of cfg.workdays) {
      if (isValidDateKey(w.date)) workdays.set(w.date, w.name ?? '调休上班');
    }
  }

  const getDayInfo = (key: DateKey): DayInfo => {
    // 跨年假期的日期归属以日期本身所在年份是否配置为准；
    // 但只要有任一配置显式写了这天，就视为已覆盖
    const covered = years.has(yearOf(key)) || holidays.has(key) || workdays.has(key);
    const holidayName = holidays.get(key);
    if (holidayName) return { kind: 'holiday', name: holidayName, covered };
    const workdayName = workdays.get(key);
    if (workdayName) return { kind: 'adjusted-workday', name: workdayName, covered };
    const wd = weekdayOf(key);
    return { kind: wd === 0 || wd === 6 ? 'weekend' : 'workday', covered };
  };

  return {
    getDayInfo,
    isWorkday: (key) => {
      const kind = getDayInfo(key).kind;
      return kind === 'workday' || kind === 'adjusted-workday';
    },
    isYearCovered: (year) => years.has(year),
    coveredYears: [...years].sort((a, b) => a - b),
    configs,
  };
}

