import { describe, it, expect } from 'vitest';
import { HOLIDAY_CONFIGS } from '../config/holidays';
import { createCnCalendar, parseHolidayConfigs, validateHolidayConfig } from '../lib/cn-calendar';

const cnCalendar = createCnCalendar(HOLIDAY_CONFIGS);

describe('节假日配置文件', () => {
  it.each(HOLIDAY_CONFIGS.map((c) => [c.year, c] as const))('%i 年配置合法', (_year, cfg) => {
    expect(validateHolidayConfig(cfg)).toEqual([]);
  });

  it('年份不重复', () => {
    const years = HOLIDAY_CONFIGS.map((c) => c.year);
    expect(new Set(years).size).toBe(years.length);
  });

  it('能发现常见填写错误', () => {
    const errors = validateHolidayConfig({
      year: 2030,
      holidays: [
        { name: 'A', start: '2030-01-05', end: '2030-01-01' },
        { name: 'B', start: '2030-13-01', end: '2030-13-02' },
      ],
      workdays: [{ date: '2030-01-02' }], // 周三，不是周末
    });
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe('cnCalendar（2026 年）', () => {
  it('春节放假', () => {
    expect(cnCalendar.getDayInfo('2026-02-16')).toMatchObject({ kind: 'holiday', name: '春节', covered: true });
    expect(cnCalendar.isWorkday('2026-02-23')).toBe(false); // 周一但放假
  });
  it('调休上班', () => {
    expect(cnCalendar.getDayInfo('2026-02-14').kind).toBe('adjusted-workday'); // 周六
    expect(cnCalendar.isWorkday('2026-02-28')).toBe(true);
    expect(cnCalendar.isWorkday('2026-01-04')).toBe(true); // 周日
  });
  it('普通日子', () => {
    expect(cnCalendar.getDayInfo('2026-11-18').kind).toBe('workday'); // 周三
    expect(cnCalendar.getDayInfo('2026-11-21').kind).toBe('weekend'); // 周六
  });
  it('未配置年份按周一至周五推算并标记 covered=false', () => {
    const cal = createCnCalendar([]);
    expect(cal.getDayInfo('2026-02-16')).toEqual({ kind: 'workday', covered: false });
    expect(cal.isYearCovered(2026)).toBe(false);
  });
});

describe('parseHolidayConfigs（导入）', () => {
  it('单个对象与数组', () => {
    const one = JSON.stringify(HOLIDAY_CONFIGS[0]);
    expect(parseHolidayConfigs(one)).toEqual({ configs: [HOLIDAY_CONFIGS[0]], errors: [] });
    expect(parseHolidayConfigs(JSON.stringify(HOLIDAY_CONFIGS)).configs).toEqual(HOLIDAY_CONFIGS);
  });
  it('end 省略时等于 start，workdays 可省略', () => {
    const r = parseHolidayConfigs('{"year":2030,"holidays":[{"name":"元旦","start":"2030-01-01"}]}');
    expect(r.errors).toEqual([]);
    expect(r.configs[0]).toEqual({
      year: 2030,
      holidays: [{ name: '元旦', start: '2030-01-01', end: '2030-01-01' }],
      workdays: [],
    });
  });
  it('报告错误且不返回部分结果', () => {
    expect(parseHolidayConfigs('{').errors).toEqual(['不是合法的 JSON']);
    expect(parseHolidayConfigs('{"holidays":[]}').errors[0]).toContain('year');
    const dup = JSON.stringify([HOLIDAY_CONFIGS[0], HOLIDAY_CONFIGS[0]]);
    expect(parseHolidayConfigs(dup)).toEqual({ configs: [], errors: ['同一年份出现了多次'] });
    const bad = parseHolidayConfigs(
      JSON.stringify([HOLIDAY_CONFIGS[0], { year: 2030, holidays: [], workdays: [{ date: '2030-01-02' }] }]),
    );
    expect(bad.configs).toEqual([]);
    expect(bad.errors.length).toBe(1);
  });
});
