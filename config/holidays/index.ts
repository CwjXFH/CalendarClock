/**
 * App 内置的中国法定节假日数据（种子数据）
 *
 * 运行时的节假日数据保存在手机本地 SQLite 中，日常维护请直接在 App 的“设置 → 节假日数据”里操作。
 * 这里的数据只在以下情况使用：
 * - 首次启动时导入数据库（每个年份只自动导入一次，不会覆盖用户在 App 里的修改）
 * - 编辑页里的“恢复 App 内置数据”
 *
 * 如果想让新安装的 App 自带某年数据：新建 <年份>.json，在下面加入 HOLIDAY_CONFIGS，运行 `pnpm test` 校验。
 */

import y2025 from './2025.json';
import y2026 from './2026.json';

export interface HolidayRange {
  name: string;
  /** YYYY-MM-DD，含 */
  start: string;
  /** YYYY-MM-DD，含 */
  end: string;
}

export interface AdjustedWorkday {
  /** YYYY-MM-DD */
  date: string;
  name?: string;
}

export interface HolidayYearConfig {
  year: number;
  source?: string;
  holidays: HolidayRange[];
  workdays: AdjustedWorkday[];
}

export const HOLIDAY_CONFIGS: HolidayYearConfig[] = [y2025, y2026];
