/**
 * expo-sqlite 适配（iOS / Android）
 */

import * as SQLite from 'expo-sqlite';
import type { SqlDb } from './types';

export async function openExpoDb(name = 'calendar-clock.db'): Promise<SqlDb> {
  const db = await SQLite.openDatabaseAsync(name);
  return {
    exec: (sql) => db.execAsync(sql),
    run: async (sql, params = []) => {
      const r = await db.runAsync(sql, params);
      return { changes: r.changes, lastInsertRowId: r.lastInsertRowId };
    },
    all: (sql, params = []) => db.getAllAsync(sql, params),
    first: (sql, params = []) => db.getFirstAsync(sql, params),
    transaction: (fn) => db.withTransactionAsync(fn),
  };
}
