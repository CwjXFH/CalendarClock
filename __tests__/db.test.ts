import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openMemoryDb } from './helpers/node-sqlite';
import { migrate, SCHEMA_VERSION } from '../lib/db/schema';
import * as alarmRepo from '../lib/db/alarm-repo';
import * as holidayRepo from '../lib/db/holiday-repo';
import { HOLIDAY_CONFIGS, type HolidayYearConfig } from '../config/holidays';
import type { AlarmInput } from '../types/alarm';

let db: ReturnType<typeof openMemoryDb>;

beforeEach(async () => {
  db = openMemoryDb();
  await migrate(db);
});
afterEach(() => db.close());

const input: AlarmInput = {
  time: '07:30',
  label: '上班',
  enabled: true,
  rule: { kind: 'cn-workday' },
  startDate: '2026-12-01',
  endDate: '2027-01-31',
  soundId: 'default',
  soundName: '系统默认铃声',
};

describe('schema', () => {
  it('迁移幂等，版本号正确', async () => {
    await migrate(db);
    const row = await db.first<{ user_version: number }>('PRAGMA user_version');
    expect(row?.user_version).toBe(SCHEMA_VERSION);
  });
});

describe('alarmRepo', () => {
  it('增删改查往返', async () => {
    const a = await alarmRepo.insertAlarm(db, input);
    expect(await alarmRepo.listAlarms(db)).toEqual([a]);

    await alarmRepo.updateAlarm(db, a.id, { label: '早起', startDate: undefined, rule: { kind: 'weekly', days: [1, 3] } });
    const updated = await alarmRepo.getAlarm(db, a.id);
    expect(updated).toMatchObject({ label: '早起', rule: { kind: 'weekly', days: [1, 3] }, endDate: '2027-01-31' });
    expect(updated?.startDate).toBeUndefined();

    await alarmRepo.setAlarmsEnabled(db, [a.id], false);
    expect((await alarmRepo.getAlarm(db, a.id))?.enabled).toBe(false);

    expect(await alarmRepo.deleteAlarm(db, a.id)).toBe(true);
    expect(await alarmRepo.listAlarms(db)).toEqual([]);
  });

  it('新建的排在前面，非法行被忽略', async () => {
    const a = await alarmRepo.insertAlarm(db, input, new Date(2026, 0, 1));
    const b = await alarmRepo.insertAlarm(db, input, new Date(2026, 0, 2));
    await db.run(
      `INSERT INTO alarms (id, time, label, enabled, rule, sound_id, sound_name, created_at, updated_at)
       VALUES ('bad', '07:00', '', 1, '{"kind":"nope"}', 'default', '', 'z', 'z')`,
    );
    expect((await alarmRepo.listAlarms(db)).map((x) => x.id)).toEqual([b.id, a.id]);
  });
});

describe('holidayRepo', () => {
  it('首次导入内置数据', async () => {
    const imported = await holidayRepo.seedBuiltinHolidays(db, HOLIDAY_CONFIGS);
    expect(imported).toEqual(HOLIDAY_CONFIGS.map((c) => c.year));
    expect(await holidayRepo.listHolidayYears(db)).toEqual(HOLIDAY_CONFIGS);
  });

  it('用户删除或修改过的年份不会被再次导入覆盖', async () => {
    await holidayRepo.seedBuiltinHolidays(db, HOLIDAY_CONFIGS);
    const [first, second] = HOLIDAY_CONFIGS;
    await holidayRepo.deleteHolidayYear(db, first.year);
    const edited: HolidayYearConfig = { ...second, holidays: second.holidays.slice(0, 1), workdays: [] };
    await holidayRepo.saveHolidayYear(db, edited);

    expect(await holidayRepo.seedBuiltinHolidays(db, HOLIDAY_CONFIGS)).toEqual([]);
    expect(await holidayRepo.listHolidayYears(db)).toEqual([edited]);
  });

  it('新版本内置了新年份时会补充导入', async () => {
    await holidayRepo.seedBuiltinHolidays(db, HOLIDAY_CONFIGS.slice(0, 1));
    expect(await holidayRepo.seedBuiltinHolidays(db, HOLIDAY_CONFIGS)).toEqual(
      HOLIDAY_CONFIGS.slice(1).map((c) => c.year),
    );
  });

  it('删除年份时级联删除假期与调休', async () => {
    await holidayRepo.seedBuiltinHolidays(db, HOLIDAY_CONFIGS);
    await holidayRepo.deleteHolidayYear(db, 2026);
    expect(await db.first('SELECT * FROM holidays WHERE year = 2026')).toBeNull();
    expect(await db.first('SELECT * FROM adjusted_workdays WHERE year = 2026')).toBeNull();
  });

  it('保存失败时整年回滚', async () => {
    await holidayRepo.seedBuiltinHolidays(db, HOLIDAY_CONFIGS);
    const before = await holidayRepo.listHolidayYears(db);
    const broken = {
      year: 2026,
      holidays: [{ name: null as unknown as string, start: '2026-01-01', end: '2026-01-01' }],
      workdays: [],
    };
    await expect(holidayRepo.saveHolidayYear(db, broken)).rejects.toThrow();
    expect(await holidayRepo.listHolidayYears(db)).toEqual(before);
  });
});
