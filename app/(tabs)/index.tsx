/**
 * 闹钟列表主页面
 */

import React, { useState } from 'react';
import { View, Text, FlatList, Alert, ActivityIndicator, Linking, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { SwipeableAlarmCard } from '@/components/swipeable-alarm-card';
import { AddButton } from '@/components/add-button';
import { useAlarms } from '@/lib/alarm-provider';
import { useColors } from '@/hooks/use-colors';
import { isNotificationSupported } from '@/lib/notifications';
import { formatMonthDayWeek, toDateKey } from '@/lib/date-utils';
import type { Alarm } from '@/types/alarm';

const MAX_ALARMS = 30;

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { alarms, loading, permissionGranted, scheduleInfo, uncoveredYears, setAlarmEnabled, deleteAlarm, refresh } =
    useAlarms();
  const [refreshing, setRefreshing] = useState(false);

  const handleAddAlarm = () => {
    if (alarms.length >= MAX_ALARMS) {
      Alert.alert('已达上限', `最多只能添加${MAX_ALARMS}个闹钟`);
      return;
    }
    router.push('/alarm/edit');
  };

  const handleEditAlarm = (alarm: Alarm) => {
    router.push({ pathname: '/alarm/edit', params: { id: alarm.id } });
  };

  const handleDeleteAlarm = (id: string) => {
    Alert.alert('删除闹钟', '确定要删除这个闹钟吗？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => void deleteAlarm(id) },
    ]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  const enabledCount = alarms.filter((a) => a.enabled).length;

  return (
    <ScreenContainer>
      <View className="px-6 py-4 border-b border-border">
        <View className="flex-row items-center justify-between">
          <Text className="text-3xl font-bold text-foreground">闹钟</Text>
          <Text className="text-base text-muted">
            {alarms.length}/{MAX_ALARMS}
          </Text>
        </View>
        {enabledCount > 0 && scheduleInfo && isNotificationSupported && (
          <Text className="text-xs text-muted mt-1">
            已安排 {scheduleInfo.scheduled} 次提醒
            {scheduleInfo.coverageEnd ? `，至 ${formatMonthDayWeek(toDateKey(scheduleInfo.coverageEnd))}` : ''}
            {scheduleInfo.truncated ? '（打开 App 会自动续排）' : ''}
          </Text>
        )}
      </View>

      {!isNotificationSupported && (
        <Banner tone="warning">当前平台不支持本地通知，闹钟不会响铃，请在手机上使用。</Banner>
      )}
      {isNotificationSupported && permissionGranted === false && (
        <Banner tone="error" actionText="去设置" onAction={() => void Linking.openSettings()}>
          通知权限未开启，闹钟将不会响铃。
        </Banner>
      )}
      {uncoveredYears.length > 0 && (
        <Banner tone="warning" actionText="查看" onAction={() => router.push('/settings')}>
          {uncoveredYears.join('、')} 年节假日安排未配置，相关闹钟暂按普通周末推算。
        </Banner>
      )}

      {alarms.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-xl text-muted text-center mb-2">还没有闹钟</Text>
          <Text className="text-base text-muted text-center">点击右下角按钮添加</Text>
        </View>
      ) : (
        <FlatList
          data={alarms}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SwipeableAlarmCard
              alarm={item}
              onPress={() => handleEditAlarm(item)}
              onToggle={(enabled) => void setAlarmEnabled(item.id, enabled)}
              onEdit={() => handleEditAlarm(item)}
              onDelete={() => handleDeleteAlarm(item.id)}
            />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}

      <AddButton onPress={handleAddAlarm} />
    </ScreenContainer>
  );
}

function Banner({
  tone,
  children,
  actionText,
  onAction,
}: {
  tone: 'warning' | 'error';
  children: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
}) {
  return (
    <View
      className={`mx-4 mt-3 px-4 py-3 rounded-xl border flex-row items-center justify-between ${
        tone === 'error' ? 'border-error' : 'border-warning'
      }`}
    >
      <Text className={`flex-1 text-sm ${tone === 'error' ? 'text-error' : 'text-warning'}`}>{children}</Text>
      {actionText && onAction && (
        <Pressable onPress={onAction} hitSlop={8} className="ml-3">
          <Text className="text-sm font-semibold text-primary">{actionText}</Text>
        </Pressable>
      )}
    </View>
  );
}
