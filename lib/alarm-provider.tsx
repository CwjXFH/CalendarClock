/**
 * 闹钟与节假日数据的全局状态
 *
 * 任何变更（闹钟增删改、开关、节假日修改）以及 App 启动 / 回到前台 / 收到通知时，都会执行一次 sync：
 * 1. 从 SQLite 读取闹钟与节假日
 * 2. 自动关闭已经不会再响的闹钟（单次已过、时间段已结束）
 * 3. 用排程引擎计算最近的触发时间并重建系统通知
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Alarm, AlarmInput } from '@/types/alarm';
import { nextDateForTime } from '@/types/alarm';
import type { HolidayYearConfig } from '@/config/holidays';
import { HOLIDAY_CONFIGS } from '@/config/holidays';
import { alarmRepo, getDb, holidayRepo } from '@/lib/db';
import * as notifications from '@/lib/notifications';
import { createCnCalendar, type CnCalendar } from '@/lib/cn-calendar';
import { findUncoveredYears, isExpired, planNotifications } from '@/lib/schedule';

export interface ScheduleInfo {
  /** 已注册的通知数 */
  scheduled: number;
  /** 已注册的最后一次触发 */
  coverageEnd: Date | null;
  /** 是否因系统数量限制只排了一部分 */
  truncated: boolean;
  syncedAt: Date;
}

interface AlarmContextValue {
  alarms: Alarm[];
  holidayYears: HolidayYearConfig[];
  calendar: CnCalendar;
  loading: boolean;
  /** 数据库打开失败等致命错误 */
  error: string | null;
  permissionGranted: boolean | null;
  scheduleInfo: ScheduleInfo | null;
  /** 已启用闹钟依赖、但尚未配置节假日数据的年份 */
  uncoveredYears: number[];
  addAlarm: (input: AlarmInput) => Promise<Alarm>;
  updateAlarm: (id: string, changes: Partial<AlarmInput>) => Promise<void>;
  deleteAlarm: (id: string) => Promise<void>;
  setAlarmEnabled: (id: string, enabled: boolean) => Promise<void>;
  saveHolidayYear: (cfg: HolidayYearConfig) => Promise<void>;
  deleteHolidayYear: (year: number) => Promise<void>;
  refresh: () => Promise<void>;
}

const AlarmContext = createContext<AlarmContextValue | undefined>(undefined);

/** App 内置节假日数据（可用于“恢复内置数据”） */
export const BUILTIN_HOLIDAY_YEARS = HOLIDAY_CONFIGS;

export function AlarmProvider({ children }: { children: React.ReactNode }) {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [holidayYears, setHolidayYears] = useState<HolidayYearConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [scheduleInfo, setScheduleInfo] = useState<ScheduleInfo | null>(null);

  const calendar = useMemo(() => createCnCalendar(holidayYears), [holidayYears]);

  // 串行化 sync，避免并发重建通知
  const syncChain = useRef<Promise<void>>(Promise.resolve());

  const sync = useCallback((): Promise<void> => {
    const run = async () => {
      const db = await getDb();
      const now = new Date();
      const years = await holidayRepo.listHolidayYears(db);
      const cal = createCnCalendar(years);
      let list = await alarmRepo.listAlarms(db);

      const expired = list.filter((a) => a.enabled && isExpired(a, now, cal));
      if (expired.length) {
        await alarmRepo.setAlarmsEnabled(db, expired.map((a) => a.id), false, now);
        list = await alarmRepo.listAlarms(db);
      }
      setHolidayYears(years);
      setAlarms(list);

      const plan = planNotifications(list, now, cal, notifications.NOTIFICATION_BUDGET);
      try {
        const { scheduled } = await notifications.applySchedulePlan(plan, list);
        setScheduleInfo({ scheduled, coverageEnd: plan.coverageEnd, truncated: plan.truncated, syncedAt: now });
      } catch (e) {
        console.error('Failed to apply schedule:', e);
      }
    };
    const next = syncChain.current.then(run, run);
    syncChain.current = next.catch((e) => console.error('Sync failed:', e));
    return next;
  }, []);

  // 初始化
  useEffect(() => {
    (async () => {
      try {
        setPermissionGranted(await notifications.requestNotificationPermissions());
      } catch (e) {
        console.error('Failed to request permissions:', e);
        setPermissionGranted(false);
      }
      await sync();
    })()
      .catch((e) => {
        console.error('Failed to initialize:', e);
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => setLoading(false));
  }, [sync]);

  // 回到前台时续排（滚动窗口），并刷新权限状态
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void sync();
      if (notifications.isNotificationSupported) {
        Notifications.getPermissionsAsync()
          .then(({ status }) => setPermissionGranted(status === 'granted'))
          .catch(() => undefined);
      }
    });
    return () => sub.remove();
  }, [sync]);

  // 收到通知 / 点击通知时续排，并关闭已响过的单次闹钟
  useEffect(() => {
    if (!notifications.isNotificationSupported) return;
    const received = Notifications.addNotificationReceivedListener(() => void sync());
    const response = Notifications.addNotificationResponseReceivedListener(() => void sync());
    return () => {
      received.remove();
      response.remove();
    };
  }, [sync]);

  const addAlarm = useCallback(
    async (input: AlarmInput) => {
      const alarm = await alarmRepo.insertAlarm(await getDb(), input);
      await sync();
      return alarm;
    },
    [sync],
  );

  const updateAlarm = useCallback(
    async (id: string, changes: Partial<AlarmInput>) => {
      await alarmRepo.updateAlarm(await getDb(), id, changes);
      await sync();
    },
    [sync],
  );

  const deleteAlarm = useCallback(
    async (id: string) => {
      await alarmRepo.deleteAlarm(await getDb(), id);
      await sync();
    },
    [sync],
  );

  const setAlarmEnabled = useCallback(
    async (id: string, enabled: boolean) => {
      const db = await getDb();
      const alarm = await alarmRepo.getAlarm(db, id);
      if (!alarm) return;
      const changes: Partial<AlarmInput> = { enabled };
      // 重新打开一个已经过期的单次闹钟：顺延到下一个该时刻（与系统闹钟行为一致）
      if (enabled && alarm.rule.kind === 'once' && isExpired(alarm, new Date(), calendar)) {
        changes.rule = { kind: 'once', date: nextDateForTime(alarm.time) };
      }
      await alarmRepo.updateAlarm(db, id, changes);
      await sync();
    },
    [sync, calendar],
  );

  const saveHolidayYear = useCallback(
    async (cfg: HolidayYearConfig) => {
      await holidayRepo.saveHolidayYear(await getDb(), cfg);
      await sync();
    },
    [sync],
  );

  const deleteHolidayYear = useCallback(
    async (year: number) => {
      await holidayRepo.deleteHolidayYear(await getDb(), year);
      await sync();
    },
    [sync],
  );

  const uncoveredYears = useMemo(() => {
    const now = new Date();
    const years = new Set<number>();
    for (const a of alarms) for (const y of findUncoveredYears(a, now, calendar)) years.add(y);
    return [...years].sort((a, b) => a - b);
  }, [alarms, calendar]);

  const value: AlarmContextValue = {
    alarms,
    holidayYears,
    calendar,
    loading,
    error,
    permissionGranted,
    scheduleInfo,
    uncoveredYears,
    addAlarm,
    updateAlarm,
    deleteAlarm,
    setAlarmEnabled,
    saveHolidayYear,
    deleteHolidayYear,
    refresh: sync,
  };

  return <AlarmContext.Provider value={value}>{children}</AlarmContext.Provider>;
}

export function useAlarms() {
  const context = useContext(AlarmContext);
  if (context === undefined) {
    throw new Error('useAlarms must be used within an AlarmProvider');
  }
  return context;
}
