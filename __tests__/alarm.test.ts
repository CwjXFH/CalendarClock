import { describe, it, expect } from 'vitest';

import { createDefaultAlarm, describePeriod, describeRule, nextDateForTime, parseRule } from '../types/alarm';

describe('describeRule', () => {
  const today = '2026-11-18';
  it('once 同年省略年份，跨年显示年份', () => {
    expect(describeRule({ kind: 'once', date: '2026-12-01' }, today)).toBe('12月1日');
    expect(describeRule({ kind: 'once', date: '2027-03-05' }, today)).toBe('2027年3月5日');
  });
  it('weekly 常用组合', () => {
    expect(describeRule({ kind: 'weekly', days: [0, 1, 2, 3, 4, 5, 6] })).toBe('每天');
    expect(describeRule({ kind: 'weekly', days: [1, 2, 3, 4, 5] })).toBe('每周一至周五');
    expect(describeRule({ kind: 'weekly', days: [6, 0] })).toBe('每周末');
    expect(describeRule({ kind: 'weekly', days: [0, 1, 3] })).toBe('周一、周三、周日');
  });
  it('法定工作日 / 休息日 / 间隔', () => {
    expect(describeRule({ kind: 'cn-workday' })).toBe('法定工作日');
    expect(describeRule({ kind: 'cn-offday' })).toBe('法定休息日');
    expect(describeRule({ kind: 'interval', everyDays: 3, anchorDate: today })).toBe('每3天');
  });
});

describe('describePeriod', () => {
  const today = '2026-11-18';
  it('各种组合', () => {
    const rule = { kind: 'cn-workday' } as const;
    expect(describePeriod({ rule }, today)).toBeNull();
    expect(describePeriod({ rule, startDate: '2026-12-01', endDate: '2027-01-31' }, today)).toBe(
      '12月1日 至 2027年1月31日',
    );
    expect(describePeriod({ rule, startDate: '2026-12-01' }, today)).toBe('12月1日 起');
    expect(describePeriod({ rule, endDate: '2026-12-31' }, today)).toBe('至 12月31日');
    expect(describePeriod({ rule: { kind: 'once', date: today }, startDate: today }, today)).toBeNull();
  });
});

describe('nextDateForTime / createDefaultAlarm', () => {
  it('今天还没到就是今天，否则明天', () => {
    const now = new Date(2026, 10, 18, 7, 30);
    expect(nextDateForTime('08:00', now)).toBe('2026-11-18');
    expect(nextDateForTime('07:30', now)).toBe('2026-11-19');
    expect(nextDateForTime('06:00', now)).toBe('2026-11-19');
  });
  it('默认闹钟是下一个整点的单次闹钟', () => {
    const a = createDefaultAlarm(new Date(2026, 10, 18, 23, 20));
    expect(a.time).toBe('00:00');
    expect(a.rule).toEqual({ kind: 'once', date: '2026-11-19' });
    expect(a.enabled).toBe(true);
  });
});

describe('parseRule', () => {
  it('解析合法规则', () => {
    expect(parseRule('{"kind":"cn-workday"}')).toEqual({ kind: 'cn-workday' });
    expect(parseRule({ kind: 'weekly', days: [3, 1, 3, 9] })).toEqual({ kind: 'weekly', days: [1, 3] });
    expect(parseRule({ kind: 'once', date: '2027-02-01', extra: 1 })).toEqual({ kind: 'once', date: '2027-02-01' });
    expect(parseRule({ kind: 'interval', everyDays: 2, anchorDate: '2026-11-18' })).toEqual({
      kind: 'interval',
      everyDays: 2,
      anchorDate: '2026-11-18',
    });
  });
  it('非法规则返回 null', () => {
    expect(parseRule('not json')).toBeNull();
    expect(parseRule({ kind: 'weekly', days: [] })).toBeNull();
    expect(parseRule({ kind: 'once', date: '2026-02-30' })).toBeNull();
    expect(parseRule({ kind: 'interval', everyDays: 0, anchorDate: '2026-11-18' })).toBeNull();
    expect(parseRule({ kind: 'unknown' })).toBeNull();
    expect(parseRule(null)).toBeNull();
  });
});
