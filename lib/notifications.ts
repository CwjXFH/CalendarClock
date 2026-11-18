/**
 * 通知服务：把排程引擎算出的计划（SchedulePlan）落到系统本地通知
 *
 * 本 App 独占所有本地通知，每次同步都“全部取消再按计划重建”，简单且不会残留。
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Alarm } from '@/types/alarm';
import type { SchedulePlan } from '@/lib/schedule';

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
 * 可同时挂起的通知数量上限
 * - iOS 系统硬限制 64，留 4 个余量
 * - Android 没有同样的硬限制，但过多会拖慢重排，取一个足够覆盖较长时间的值
 */
export const NOTIFICATION_BUDGET = Platform.select({ ios: 60, android: 200, default: 60 }) ?? 60;

export const isNotificationSupported = Platform.OS === 'ios' || Platform.OS === 'android';

const ANDROID_CHANNEL_ID = 'alarm-default-channel';
const REFRESH_REMINDER_ID = 'schedule-refresh-reminder';

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!isNotificationSupported) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return status === 'granted';
}

async function ensureAndroidChannel(): Promise<string | undefined> {
  if (Platform.OS !== 'android') return undefined;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: '闹钟提醒',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
    sound: 'default',
  });
  return ANDROID_CHANNEL_ID;
}

/**
 * 铃声：目前统一使用系统默认提示音。
 * 如需自定义，需要把音频文件通过 expo-notifications 插件打包进 App，再在这里返回文件名。
 */
function notificationSound(_alarm: Alarm): string {
  return 'default';
}

function buildContent(alarm: Alarm): Notifications.NotificationContentInput {
  return {
    title: alarm.label || '闹钟',
    body: alarm.label ? alarm.time : `${alarm.time} 闹钟时间到了`,
    sound: notificationSound(alarm),
    priority: Notifications.AndroidNotificationPriority.MAX,
    vibrate: [0, 250, 250, 250],
    // 时效性通知：可突破“专注模式”的通知摘要（需在系统设置中允许）
    interruptionLevel: 'timeSensitive',
    data: { alarmId: alarm.id },
  };
}

export interface ApplyResult {
  scheduled: number;
}

/**
 * 按计划重建全部本地通知
 */
export async function applySchedulePlan(plan: SchedulePlan, alarms: Alarm[]): Promise<ApplyResult> {
  if (!isNotificationSupported) return { scheduled: 0 };

  await Notifications.cancelAllScheduledNotificationsAsync();
  const channelId = await ensureAndroidChannel();
  const byId = new Map(alarms.map((a) => [a.id, a]));

  let scheduled = 0;
  for (const item of plan.items) {
    const alarm = byId.get(item.alarmId);
    if (!alarm) continue;
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `alarm:${alarm.id}:${item.date.getTime()}`,
        content: buildContent(alarm),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: item.date,
          ...(channelId ? { channelId } : {}),
        },
      });
      scheduled++;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
    }
  }

  if (plan.refreshReminderAt) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: REFRESH_REMINDER_ID,
        content: {
          title: '请打开一次闹钟 App',
          body: '受系统通知数量限制，后续闹钟需要打开 App 才能继续安排。',
          sound: 'default',
          data: { type: 'refresh-reminder' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: plan.refreshReminderAt,
          ...(channelId ? { channelId } : {}),
        },
      });
    } catch (error) {
      console.error('Failed to schedule refresh reminder:', error);
    }
  }

  return { scheduled };
}
