/**
 * 闹钟管理Context
 * 提供全局闹钟状态管理
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Alarm, Sound } from '@/types/alarm';
import * as storage from '@/lib/storage';
import * as notifications from '@/lib/notifications';

interface AlarmContextValue {
  alarms: Alarm[];
  sounds: Sound[];
  loading: boolean;
  addAlarm: (alarm: Omit<Alarm, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Alarm>;
  updateAlarm: (id: string, updates: Partial<Alarm>) => Promise<Alarm | null>;
  deleteAlarm: (id: string) => Promise<boolean>;
  toggleAlarm: (id: string) => Promise<Alarm | null>;
  refreshAlarms: () => Promise<void>;
  refreshSounds: () => Promise<void>;
}

const AlarmContext = createContext<AlarmContextValue | undefined>(undefined);

export function AlarmProvider({ children }: { children: React.ReactNode }) {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载闹钟数据
  const refreshAlarms = useCallback(async () => {
    try {
      const data = await storage.getAlarms();
      setAlarms(data);
    } catch (error) {
      console.error('Failed to refresh alarms:', error);
    }
  }, []);

  // 加载铃声数据
  const refreshSounds = useCallback(async () => {
    try {
      const data = await storage.getAllSounds();
      setSounds(data);
    } catch (error) {
      console.error('Failed to refresh sounds:', error);
    }
  }, []);

  // 检查并关闭已失效的闹钟
  const checkExpiredAlarms = useCallback(async () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    let hasChanges = false;
    const updatedAlarms = await Promise.all(
      alarms.map(async (alarm) => {
        // 如果闹钟开启且有指定日期
        if (alarm.enabled && alarm.date && alarm.repeatType === 'none') {
          // 检查是否已过期
          if (alarm.date < today || (alarm.date === today && alarm.time < currentTime)) {
            hasChanges = true;
            // 自动关闭已失效的闹钟
            await storage.updateAlarm(alarm.id, { enabled: false });
            await notifications.cancelAlarmNotification(alarm.id);
            return { ...alarm, enabled: false };
          }
        }
        return alarm;
      })
    );
    
    if (hasChanges) {
      setAlarms(updatedAlarms);
    }
  }, [alarms]);

  // 初始化加载
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      // 请求通知权限
      await notifications.requestNotificationPermissions();
      await Promise.all([refreshAlarms(), refreshSounds()]);
      setLoading(false);
    };
    init();
  }, [refreshAlarms, refreshSounds]);

  // 定时检查已失效的闹钟(每分钟检查一次)
  useEffect(() => {
    if (alarms.length > 0) {
      checkExpiredAlarms();
      const interval = setInterval(checkExpiredAlarms, 60000); // 60秒
      return () => clearInterval(interval);
    }
  }, [alarms, checkExpiredAlarms]);

  // 添加闹钟
  const addAlarm = useCallback(async (alarm: Omit<Alarm, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newAlarm = await storage.addAlarm(alarm);
    // 调度通知
    if (newAlarm.enabled) {
      await notifications.scheduleAlarmNotification(newAlarm);
    }
    await refreshAlarms();
    return newAlarm;
  }, [refreshAlarms]);

  // 更新闹钟
  const updateAlarm = useCallback(async (id: string, updates: Partial<Alarm>) => {
    const updated = await storage.updateAlarm(id, updates);
    if (updated) {
      // 重新调度通知
      if (updated.enabled) {
        await notifications.scheduleAlarmNotification(updated);
      } else {
        await notifications.cancelAlarmNotification(updated.id);
      }
    }
    await refreshAlarms();
    return updated;
  }, [refreshAlarms]);

  // 删除闹钟
  const deleteAlarm = useCallback(async (id: string) => {
    // 取消通知
    await notifications.cancelAlarmNotification(id);
    const success = await storage.deleteAlarm(id);
    if (success) {
      await refreshAlarms();
    }
    return success;
  }, [refreshAlarms]);

  // 切换闹钟状态
  const toggleAlarm = useCallback(async (id: string) => {
    const updated = await storage.toggleAlarm(id);
    if (updated) {
      // 更新通知
      if (updated.enabled) {
        await notifications.scheduleAlarmNotification(updated);
      } else {
        await notifications.cancelAlarmNotification(updated.id);
      }
    }
    await refreshAlarms();
    return updated;
  }, [refreshAlarms]);

  const value: AlarmContextValue = {
    alarms,
    sounds,
    loading,
    addAlarm,
    updateAlarm,
    deleteAlarm,
    toggleAlarm,
    refreshAlarms,
    refreshSounds,
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
