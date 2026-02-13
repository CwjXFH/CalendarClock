/**
 * 可左滑的闹钟卡片
 * 左滑显示编辑/删除按钮
 */

import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { AlarmCard } from '@/components/alarm-card';
import type { Alarm } from '@/types/alarm';

interface SwipeableAlarmCardProps {
  alarm: Alarm;
  onPress: () => void;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function SwipeableAlarmCard({
  alarm,
  onPress,
  onToggle,
  onEdit,
  onDelete,
}: SwipeableAlarmCardProps) {

  const renderRightActions = (
    _progress: unknown,
    _dragX: unknown,
    swipeable: { close: () => void }
  ) => (
    <View className="flex-row items-stretch mb-2">
      <Pressable
        onPress={() => {
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          swipeable.close();
          onEdit();
        }}
        className="bg-primary justify-center px-6"
      >
        <Text className="text-white font-medium text-base">编辑</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          swipeable.close();
          onDelete();
        }}
        className="bg-red-500 justify-center px-6"
      >
        <Text className="text-white font-medium text-base">删除</Text>
      </Pressable>
    </View>
  );

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
    >
      <AlarmCard alarm={alarm} onPress={onPress} onToggle={onToggle} />
    </Swipeable>
  );
}
