/**
 * 节假日表读写
 */

import type { HolidayYearConfig } from '../../config/holidays';
import type { SqlDb } from './types';

export async function listHolidayYears(db: SqlDb): Promise<HolidayYearConfig[]> {
  const years = await db.all<{ year: number; source: string | null }>(
    'SELECT year, source FROM holiday_years ORDER BY year',
  );
  const holidays = await db.all<{ year: number; name: string; start_date: string; end_date: string }>(
    'SELECT year, name, start_date, end_date FROM holidays ORDER BY start_date',
  );
  const workdays = await db.all<{ year: number; date: string; name: string | null }>(
    'SELECT year, date, name FROM adjusted_workdays ORDER BY date',
  );

  return years.map(({ year, source }) => ({
    year,
    ...(source ? { source } : {}),
    holidays: holidays
      .filter((h) => h.year === year)
      .map((h) => ({ name: h.name, start: h.start_date, end: h.end_date })),
    workdays: workdays
      .filter((w) => w.year === year)
      .map((w) => (w.name ? { date: w.date, name: w.name } : { date: w.date })),
  }));
}

/** 整年覆盖写入（不存在则新建） */
export async function saveHolidayYear(db: SqlDb, cfg: HolidayYearConfig, now = new Date()): Promise<void> {
  await db.transaction(async () => {
    await db.run(
      `INSERT INTO holiday_years (year, source, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(year) DO UPDATE SET source = excluded.source, updated_at = excluded.updated_at`,
      [cfg.year, cfg.source?.trim() || null, now.toISOString()],
    );
    await db.run('DELETE FROM holidays WHERE year = ?', [cfg.year]);
    await db.run('DELETE FROM adjusted_workdays WHERE year = ?', [cfg.year]);
    for (const h of cfg.holidays) {
      await db.run('INSERT INTO holidays (year, name, start_date, end_date) VALUES (?, ?, ?, ?)', [
        cfg.year,
        h.name.trim(),
        h.start,
        h.end,
      ]);
    }
    for (const w of cfg.workdays) {
      await db.run('INSERT INTO adjusted_workdays (year, date, name) VALUES (?, ?, ?)', [
        cfg.year,
        w.date,
        w.name?.trim() || null,
      ]);
    }
  });
}

export async function deleteHolidayYear(db: SqlDb, year: number): Promise<void> {
  // 外键 ON DELETE CASCADE 会一并删除假期与调休记录
  await db.run('DELETE FROM holiday_years WHERE year = ?', [year]);
}

/**
 * 把 App 内置的节假日数据导入数据库。
 * 每个内置年份只自动导入一次；数据库里已有的年份（用户可能改过）不会被覆盖。
 * @returns 本次新导入的年份
 */
export async function seedBuiltinHolidays(db: SqlDb, builtins: HolidayYearConfig[]): Promise<number[]> {
  const seeded = new Set(
    (await db.all<{ year: number }>('SELECT year FROM builtin_holiday_seeds')).map((r) => r.year),
  );
  const existing = new Set((await db.all<{ year: number }>('SELECT year FROM holiday_years')).map((r) => r.year));
  const imported: number[] = [];
  for (const cfg of builtins) {
    if (seeded.has(cfg.year)) continue;
    if (!existing.has(cfg.year)) {
      await saveHolidayYear(db, cfg);
      imported.push(cfg.year);
    }
    await db.run('INSERT OR IGNORE INTO builtin_holiday_seeds (year) VALUES (?)', [cfg.year]);
  }
  return imported;
}
