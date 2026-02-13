/**
 * 2026年中国法定节假日
 * 数据来源: 国务院办公厅发布
 */

export interface HolidayDate {
  date: string; // YYYY-MM-DD
  name: string;
  type: 'holiday' | 'workday'; // 调休的工作日
}

/** 2026年法定节假日及调休日 */
export const HOLIDAYS_2026: HolidayDate[] = [
  // 元旦 1月1日
  { date: '2026-01-01', name: '元旦', type: 'holiday' },
  // 春节 1月28日-2月4日 (农历除夕至正月初七)
  { date: '2026-01-28', name: '春节', type: 'holiday' },
  { date: '2026-01-29', name: '春节', type: 'holiday' },
  { date: '2026-01-30', name: '春节', type: 'holiday' },
  { date: '2026-01-31', name: '春节', type: 'holiday' },
  { date: '2026-02-01', name: '春节', type: 'holiday' },
  { date: '2026-02-02', name: '春节', type: 'holiday' },
  { date: '2026-02-03', name: '春节', type: 'holiday' },
  { date: '2026-02-04', name: '春节', type: 'holiday' },
  // 清明节 4月4日-6日
  { date: '2026-04-04', name: '清明节', type: 'holiday' },
  { date: '2026-04-05', name: '清明节', type: 'holiday' },
  { date: '2026-04-06', name: '清明节', type: 'holiday' },
  // 劳动节 5月1日-5日
  { date: '2026-05-01', name: '劳动节', type: 'holiday' },
  { date: '2026-05-02', name: '劳动节', type: 'holiday' },
  { date: '2026-05-03', name: '劳动节', type: 'holiday' },
  { date: '2026-05-04', name: '劳动节', type: 'holiday' },
  { date: '2026-05-05', name: '劳动节', type: 'holiday' },
  // 端午节 5月31日-6月2日
  { date: '2026-05-31', name: '端午节', type: 'holiday' },
  { date: '2026-06-01', name: '端午节', type: 'holiday' },
  { date: '2026-06-02', name: '端午节', type: 'holiday' },
  // 中秋节 10月1日 (与国庆连休)
  { date: '2026-10-01', name: '中秋节/国庆节', type: 'holiday' },
  { date: '2026-10-02', name: '国庆节', type: 'holiday' },
  { date: '2026-10-03', name: '国庆节', type: 'holiday' },
  { date: '2026-10-04', name: '国庆节', type: 'holiday' },
  { date: '2026-10-05', name: '国庆节', type: 'holiday' },
  { date: '2026-10-06', name: '国庆节', type: 'holiday' },
  { date: '2026-10-07', name: '国庆节', type: 'holiday' },
  { date: '2026-10-08', name: '国庆节', type: 'holiday' },
];

/** 判断某日期是否为法定节假日 */
export function isHoliday(dateStr: string): boolean {
  return HOLIDAYS_2026.some(h => h.date === dateStr && h.type === 'holiday');
}

/** 获取指定年份范围内的节假日日期列表 */
export function getHolidayDates(startYear: number, endYear: number): string[] {
  return HOLIDAYS_2026
    .filter(h => h.type === 'holiday')
    .filter(h => {
      const year = parseInt(h.date.slice(0, 4), 10);
      return year >= startYear && year <= endYear;
    })
    .map(h => h.date);
}
