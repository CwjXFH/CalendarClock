import { describe, it, expect } from 'vitest';
import type { Alarm, RepeatRule } from '../types/alarm';
import { createCnCalendar } from '../lib/cn-calendar';
import { toDateKey } from '../lib/date-utils';
import { findUncoveredYears, getNextOccurrence, getOccurrences, isExpired, planNotifications } from '../lib/schedule';
import { HOLIDAY_CONFIGS } from '../config/holidays';

const cal = createCnCalendar(HOLIDAY_CONFIGS);

function alarm(rule: RepeatRule, extra: Partial<Alarm> = {}): Alarm {
  return {
    id: extra.id ?? 'a',
    time: '07:00',
    label: '',
    enabled: true,
    rule,
    soundId: 'default',
    soundName: '系统默认铃声',
    createdAt: '',
    updatedAt: '',
    ...extra,
  };
}

const keys = (dates: Date[]) => dates.map(toDateKey);

describe('getOccurrences', () => {
  it('单次：未来日期（很久以后）', () => {
    const now = new Date(2026, 10, 18, 12, 0);
    const a = alarm({ kind: 'once', date: '2027-08-01' });
    expect(keys(getOccurrences(a, now, cal))).toEqual(['2027-08-01']);
  });

  it('单次：已过去则没有', () => {
    const now = new Date(2026, 10, 18, 7, 0); // 恰好 07:00 视为已过
    expect(getOccurrences(alarm({ kind: 'once', date: '2026-11-18' }), now, cal)).toEqual([]);
  });

  it('当天时刻已过则从明天开始', () => {
    const now = new Date(2026, 10, 18, 8, 0);
    expect(keys(getOccurrences(alarm({ kind: 'daily' }), now, cal, { maxCount: 2 }))).toEqual([
      '2026-11-19',
      '2026-11-20',
    ]);
  });

  it('法定工作日：跳过春节、包含调休周六', () => {
    const now = new Date(2026, 1, 12, 8, 0); // 2026-02-12 周四 08:00
    const a = alarm({ kind: 'cn-workday' });
    expect(keys(getOccurrences(a, now, cal, { maxCount: 4 }))).toEqual([
      '2026-02-13', // 周五
      '2026-02-14', // 周六调休上班
      '2026-02-24', // 春节后第一天（15～23 放假）
      '2026-02-25',
    ]);
  });

  it('法定休息日：包含节假日、跳过调休日', () => {
    const now = new Date(2026, 8, 18, 8, 0); // 2026-09-18 周五
    const a = alarm({ kind: 'cn-offday' });
    expect(keys(getOccurrences(a, now, cal, { maxCount: 5 }))).toEqual([
      '2026-09-19', // 周六
      // 09-20 周日调休上班，不响
      '2026-09-25', // 中秋
      '2026-09-26',
      '2026-09-27',
      '2026-10-01', // 国庆
    ]);
  });

  it('未来时间段：只在区间内响', () => {
    const now = new Date(2026, 10, 18, 12, 0);
    const a = alarm({ kind: 'weekly', days: [1, 3] }, { startDate: '2026-12-01', endDate: '2026-12-10' });
    expect(keys(getOccurrences(a, now, cal))).toEqual(['2026-12-02', '2026-12-07', '2026-12-09']);
  });

  it('很久以后才开始的时间段也能找到（超过搜索窗口）', () => {
    const now = new Date(2026, 10, 18, 12, 0);
    const a = alarm({ kind: 'daily' }, { startDate: '2028-06-01', endDate: '2028-06-02' });
    expect(keys(getOccurrences(a, now, cal))).toEqual(['2028-06-01', '2028-06-02']);
  });

  it('每隔 N 天，从锚点日起算', () => {
    const now = new Date(2026, 10, 18, 12, 0);
    const a = alarm({ kind: 'interval', everyDays: 3, anchorDate: '2026-11-17' });
    expect(keys(getOccurrences(a, now, cal, { maxCount: 3 }))).toEqual(['2026-11-20', '2026-11-23', '2026-11-26']);
    const future = alarm({ kind: 'interval', everyDays: 2, anchorDate: '2026-12-25' });
    expect(keys(getOccurrences(future, now, cal, { maxCount: 2 }))).toEqual(['2026-12-25', '2026-12-27']);
  });

  it('跨月跨年日期计算正确', () => {
    const now = new Date(2026, 11, 30, 12, 0);
    expect(keys(getOccurrences(alarm({ kind: 'daily' }), now, cal, { maxCount: 3 }))).toEqual([
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
    ]);
  });
});

describe('isExpired', () => {
  const now = new Date(2026, 10, 18, 12, 0);
  it('时间段已结束', () => {
    expect(isExpired(alarm({ kind: 'daily' }, { endDate: '2026-11-17' }), now, cal)).toBe(true);
    expect(isExpired(alarm({ kind: 'daily' }, { endDate: '2026-11-19' }), now, cal)).toBe(false);
  });
});

describe('planNotifications', () => {
  const now = new Date(2026, 10, 18, 12, 0);

  it('合并多个闹钟并按时间排序，遵守数量上限', () => {
    const a = alarm({ kind: 'daily' }, { id: 'a', time: '07:00' });
    const b = alarm({ kind: 'daily' }, { id: 'b', time: '22:00' });
    const plan = planNotifications([a, b], now, cal, 5);
    expect(plan.items).toHaveLength(4); // 预留 1 个给续排提醒
    expect(plan.items.map((i) => i.alarmId)).toEqual(['b', 'a', 'b', 'a']);
    expect(plan.truncated).toBe(true);
    expect(plan.refreshReminderAt).not.toBeNull();
    expect(plan.coverageEnd).toEqual(plan.items[3].date);
  });

  it('不截断时不需要续排提醒；关闭的闹钟不参与', () => {
    const a = alarm({ kind: 'once', date: '2026-12-01' }, { id: 'a' });
    const off = alarm({ kind: 'daily' }, { id: 'off', enabled: false });
    const plan = planNotifications([a, off], now, cal, 60);
    expect(plan.items).toHaveLength(1);
    expect(plan.truncated).toBe(false);
    expect(plan.refreshReminderAt).toBeNull();
  });
});

describe('findUncoveredYears', () => {
  it('依赖节假日的闹钟进入未配置年份时提示', () => {
    const now = new Date(2026, 10, 18, 12, 0);
    const years = HOLIDAY_CONFIGS.map((c) => c.year);
    const nextUnconfigured = Math.max(...years) + 1;
    const a = alarm({ kind: 'cn-workday' });
    const result = findUncoveredYears(a, now, cal, 365 * 3);
    expect(result).toContain(nextUnconfigured);
    expect(findUncoveredYears(alarm({ kind: 'daily' }), now, cal, 365 * 3)).toEqual([]);
  });

  it('getNextOccurrence 简单校验', () => {
    const now = new Date(2026, 10, 18, 12, 0);
    expect(toDateKey(getNextOccurrence(alarm({ kind: 'cn-workday' }), now, cal)!)).toBe('2026-11-19');
  });
});
