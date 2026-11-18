/**
 * 数据库结构与版本迁移（PRAGMA user_version）
 * 新增结构变更时在 MIGRATIONS 末尾追加，不要修改已有条目。
 */

import type { SqlDb } from './types';

const MIGRATIONS: string[] = [
  // v1
  `
  CREATE TABLE alarms (
    id          TEXT PRIMARY KEY NOT NULL,
    time        TEXT NOT NULL,              -- HH:mm
    label       TEXT NOT NULL DEFAULT '',
    enabled     INTEGER NOT NULL DEFAULT 1,
    rule        TEXT NOT NULL,              -- RepeatRule JSON
    start_date  TEXT,                       -- YYYY-MM-DD
    end_date    TEXT,
    sound_id    TEXT NOT NULL,
    sound_name  TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  );

  CREATE TABLE holiday_years (
    year        INTEGER PRIMARY KEY NOT NULL,
    source      TEXT,
    updated_at  TEXT NOT NULL
  );

  CREATE TABLE holidays (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    year        INTEGER NOT NULL REFERENCES holiday_years(year) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    start_date  TEXT NOT NULL,
    end_date    TEXT NOT NULL
  );
  CREATE INDEX idx_holidays_year ON holidays(year);

  CREATE TABLE adjusted_workdays (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    year        INTEGER NOT NULL REFERENCES holiday_years(year) ON DELETE CASCADE,
    date        TEXT NOT NULL,
    name        TEXT
  );
  CREATE INDEX idx_workdays_year ON adjusted_workdays(year);

  -- 记录已经导入过的内置年份：用户删除某年后，升级 App 也不会再自动加回来
  CREATE TABLE builtin_holiday_seeds (
    year        INTEGER PRIMARY KEY NOT NULL
  );
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

export async function migrate(db: SqlDb): Promise<void> {
  await db.exec('PRAGMA foreign_keys = ON;');
  const row = await db.first<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let v = current; v < MIGRATIONS.length; v++) {
    await db.transaction(async () => {
      await db.exec(MIGRATIONS[v]);
      await db.exec(`PRAGMA user_version = ${v + 1}`);
    });
  }
}
