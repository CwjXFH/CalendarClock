/**
 * 通知服务
 * 管理闹钟通知的调度和取消
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Alarm } from '@/types/alarm';

// 配置通知行为
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * 请求通知权限
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return true; // Web平台不需要权限
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

/**
 * 为闹钟调度通知
 */
export async function scheduleAlarmNotification(alarm: Alarm): Promise<string[]> {
  if (Platform.OS === 'web') {
    console.log('Web platform does not support notifications');
    return [];
  }

  // 先取消已有的通知
  await cancelAlarmNotification(alarm.id);

  const notificationIds: string[] = [];

  try {
    const [hour, minute] = alarm.time.split(':').map(Number);

    // 不重复的闹钟
    if (alarm.repeatType === 'none') {
      let triggerDate = new Date();
      triggerDate.setHours(hour, minute, 0, 0);

      // 如果指定了日期
      if (alarm.date) {
        const [year, month, day] = alarm.date.split('-').map(Number);
        triggerDate = new Date(year, month - 1, day, hour, minute, 0, 0);
      } else {
        // 如果时间已过,设置为明天
        if (triggerDate <= new Date()) {
          triggerDate.setDate(triggerDate.getDate() + 1);
        }
      }

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: alarm.label || '闹钟',
          body: `${alarm.time}`,
          sound: true,
          data: { alarmId: alarm.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
      });

      notificationIds.push(id);
    }

    // 每周重复的闹钟
    else if (alarm.repeatType === 'weekly' && alarm.repeatDays && alarm.repeatDays.length > 0) {
      for (const weekday of alarm.repeatDays) {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: alarm.label || '闹钟',
            body: `${alarm.time}`,
            sound: true,
            data: { alarmId: alarm.id },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            hour,
            minute,
            weekday: weekday + 1, // expo-notifications uses 1-7 (Sunday=1)
            repeats: true,
          },
        });

        notificationIds.push(id);
      }
    }

    // 法定节假日闹钟
    else if (alarm.repeatType === 'holiday') {
      // TODO: 实现法定节假日逻辑
      console.log('Holiday notifications not yet implemented');
    }

    // 保存通知ID到闹钟数据(用于后续取消)
    // 这里简化处理,实际应该保存到storage
    console.log(`Scheduled ${notificationIds.length} notifications for alarm ${alarm.id}`);

    return notificationIds;
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    return [];
  }
}

/**
 * 取消闹钟的所有通知
 */
export async function cancelAlarmNotification(alarmId: string): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    // 获取所有已调度的通知
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

    // 找到属于该闹钟的通知
    const alarmNotifications = scheduledNotifications.filter(
      notification => notification.content.data?.alarmId === alarmId
    );

    // 取消这些通知
    for (const notification of alarmNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }

    console.log(`Cancelled ${alarmNotifications.length} notifications for alarm ${alarmId}`);
  } catch (error) {
    console.error('Failed to cancel notification:', error);
  }
}

/**
 * 取消所有通知
 */
export async function cancelAllNotifications(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('Cancelled all notifications');
  } catch (error) {
    console.error('Failed to cancel all notifications:', error);
  }
}

/**
 * 获取已调度的通知数量
 */
export async function getScheduledNotificationCount(): Promise<number> {
  if (Platform.OS === 'web') {
    return 0;
  }

  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    return notifications.length;
  } catch (error) {
    console.error('Failed to get notification count:', error);
    return 0;
  }
}
