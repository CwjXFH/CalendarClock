/**
 * 数据库入口：首次调用时打开、迁移并导入内置节假日数据
 */

import { HOLIDAY_CONFIGS } from '@/config/holidays';
import { openExpoDb } from './expo-adapter';
import { migrate } from './schema';
import { seedBuiltinHolidays } from './holiday-repo';
import type { SqlDb } from './types';

let dbPromise: Promise<SqlDb> | null = null;

export function getDb(): Promise<SqlDb> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await openExpoDb();
      await migrate(db);
      await seedBuiltinHolidays(db, HOLIDAY_CONFIGS);
      return db;
    })().catch((error) => {
      dbPromise = null; // 允许下次重试
      throw error;
    });
  }
  return dbPromise;
}

export * as alarmRepo from './alarm-repo';
export * as holidayRepo from './holiday-repo';
export type { SqlDb } from './types';
