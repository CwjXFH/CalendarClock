/**
 * 用 Node 内置 node:sqlite 实现 SqlDb，供仓储层单元测试使用
 */

import { createRequire } from 'node:module';
import type { DatabaseSync as DatabaseSyncType } from 'node:sqlite';
import type { SqlDb, SqlParam } from '../../lib/db/types';

// Vite 会去掉 node:sqlite 的 node: 前缀导致解析失败，这里在运行时加载
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as { DatabaseSync: typeof DatabaseSyncType };

export function openMemoryDb(): SqlDb & { close(): void } {
  const db = new DatabaseSync(':memory:');
  const plain = <T>(row: unknown) => ({ ...(row as object) }) as T;
  return {
    exec: async (sql) => {
      db.exec(sql);
    },
    run: async (sql, params: SqlParam[] = []) => {
      const r = db.prepare(sql).run(...params);
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    },
    all: async <T>(sql: string, params: SqlParam[] = []) => db.prepare(sql).all(...params).map((r) => plain<T>(r)),
    first: async <T>(sql: string, params: SqlParam[] = []) => {
      const row = db.prepare(sql).get(...params);
      return row ? plain<T>(row) : null;
    },
    transaction: async (fn) => {
      db.exec('BEGIN');
      try {
        await fn();
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
    close: () => db.close(),
  };
}
