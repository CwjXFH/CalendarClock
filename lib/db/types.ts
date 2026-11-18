/**
 * 最小 SQLite 接口。
 * App 内由 expo-sqlite 实现（lib/db/expo-adapter.ts），测试中由 Node 内置 node:sqlite 实现，
 * 这样仓储层的 SQL 可以在电脑上直接跑单元测试。
 */

export type SqlParam = string | number | null;

export interface SqlDb {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlParam[]): Promise<{ changes: number; lastInsertRowId: number }>;
  all<T>(sql: string, params?: SqlParam[]): Promise<T[]>;
  first<T>(sql: string, params?: SqlParam[]): Promise<T | null>;
  /** 在事务中执行；fn 抛错时回滚 */
  transaction(fn: () => Promise<void>): Promise<void>;
}
