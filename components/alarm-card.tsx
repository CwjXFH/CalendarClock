/**
 * 闹钟卡片组件
 */

import React from 'react';
import { View, Text, Switch, Pressable, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Alarm } from '@/types/alarm';
import { getRepeatDescription } from '@/types/alarm';
import { useColors } from '@/hooks/use-colors';
import { cn } from '@/lib/utils';

interface AlarmCardProps {
  alarm: Alarm;
  onPress: () => void;
  onToggle: (enabled: boolean) => void;
}

export function AlarmCard({ alarm, onPress, onToggle }: AlarmCardProps) {
  const colors = useColors();
  
  const handleToggle = (value: boolean) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onToggle(value);
  };

  const [hour, minute] = alarm.time.split(':');
  const repeatDesc = getRepeatDescription(alarm);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View className={cn(
        "flex-row items-center justify-between p-4 mb-2 rounded-2xl",
        "bg-surface border border-border"
      )}>
        {/* 左侧: 时间和信息 */}
        <View className="flex-1">
          {/* 时间显示 */}
          <Text 
            className={cn(
              "text-5xl font-bold mb-1",
              alarm.enabled ? "text-foreground" : "text-muted"
            )}
          >
            {hour}:{minute}
          </Text>
          
          {/* 标签和重复规则 */}
          <View className="flex-row items-center gap-2">
            {alarm.label && (
              <Text className="text-base text-foreground">
                {alarm.label}
              </Text>
            )}
            <Text className="text-sm text-muted">
              {repeatDesc}
            </Text>
          </View>
        </View>

        {/* 右侧: 开关 */}
        <Switch
          value={alarm.enabled}
          onValueChange={handleToggle}
          trackColor={{ 
            false: colors.border, 
            true: colors.primary 
          }}
          thumbColor="#ffffff"
          ios_backgroundColor={colors.border}
        />
      </View>
    </Pressable>
  );
}
