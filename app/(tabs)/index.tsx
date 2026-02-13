/**
 * 闹钟列表主页面
 */

import React, { useState } from 'react';
import { View, Text, FlatList, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { SwipeableAlarmCard } from '@/components/swipeable-alarm-card';
import { AddButton } from '@/components/add-button';
import { useAlarms } from '@/lib/alarm-provider';
import { useColors } from '@/hooks/use-colors';
import type { Alarm } from '@/types/alarm';

const MAX_ALARMS = 30;

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { alarms, loading, toggleAlarm, deleteAlarm, refreshAlarms } = useAlarms();
  const [refreshing, setRefreshing] = useState(false);

  const handleAddAlarm = () => {
    if (alarms.length >= MAX_ALARMS) {
      Alert.alert(
        '已达上限',
        `最多只能添加${MAX_ALARMS}个闹钟`,
        [{ text: '确定', style: 'default' }]
      );
      return;
    }
    router.push('/alarm/edit');
  };

  const handleEditAlarm = (alarm: Alarm) => {
    router.push({
      pathname: '/alarm/edit',
      params: { id: alarm.id },
    });
  };

  const handleToggleAlarm = async (id: string, enabled: boolean) => {
    await toggleAlarm(id);
  };

  const handleDeleteAlarm = (id: string) => {
    Alert.alert(
      '删除闹钟',
      '确定要删除这个闹钟吗?',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            await deleteAlarm(id);
          },
        },
      ]
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshAlarms();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* 顶部标题栏 */}
      <View className="px-6 py-4 border-b border-border">
        <View className="flex-row items-center justify-between">
          <Text className="text-3xl font-bold text-foreground">闹钟</Text>
          <Text className="text-base text-muted">
            {alarms.length}/{MAX_ALARMS}
          </Text>
        </View>
      </View>

      {/* 闹钟列表 */}
      {alarms.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-xl text-muted text-center mb-2">
            还没有闹钟
          </Text>
          <Text className="text-base text-muted text-center">
            点击右下角按钮添加
          </Text>
        </View>
      ) : (
        <FlatList
          data={alarms}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SwipeableAlarmCard
              alarm={item}
              onPress={() => handleEditAlarm(item)}
              onToggle={(enabled) => handleToggleAlarm(item.id, enabled)}
              onEdit={() => handleEditAlarm(item)}
              onDelete={() => handleDeleteAlarm(item.id)}
            />
          )}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 100, // 为FAB留出空间
          }}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}

      {/* 添加按钮 */}
      <AddButton onPress={handleAddAlarm} />
    </ScreenContainer>
  );
}
