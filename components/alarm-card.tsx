/**
 * 闹钟卡片组件
 */

import React from 'react';
import { View, Text, Switch, Pressable, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Alarm } from '@/types/alarm';
import { describePeriod, describeRule } from '@/types/alarm';
import { useColors } from '@/hooks/use-colors';
import { cn } from '@/lib/utils';
import { useAlarms } from '@/lib/alarm-provider';
import { getNextOccurrence } from '@/lib/schedule';
import { addDays, formatMonthDayWeek, toDateKey } from '@/lib/date-utils';

interface AlarmCardProps {
  alarm: Alarm;
  onPress: () => void;
  onToggle: (enabled: boolean) => void;
}

function describeNext(next: Date, now: Date): string {
  const key = toDateKey(next);
  const today = toDateKey(now);
  const prefix =
    key === today ? '今天' : key === addDays(today, 1) ? '明天' : key === addDays(today, 2) ? '后天' : formatMonthDayWeek(key);
  const year = key.slice(0, 4) !== today.slice(0, 4) ? `${key.slice(0, 4)}年` : '';
  return `下次：${year}${prefix}`;
}

export function AlarmCard({ alarm, onPress, onToggle }: AlarmCardProps) {
  const colors = useColors();
  const { calendar } = useAlarms();

  const handleToggle = (value: boolean) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onToggle(value);
  };

  const now = new Date();
  const ruleDesc = describeRule(alarm.rule);
  const periodDesc = describePeriod(alarm);
  const next = alarm.enabled ? getNextOccurrence(alarm, now, calendar) : null;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <View className="flex-row items-center justify-between p-4 mb-2 rounded-2xl bg-surface border border-border">
        <View className="flex-1 pr-3">
          <Text className={cn('text-5xl font-bold mb-1', alarm.enabled ? 'text-foreground' : 'text-muted')}>
            {alarm.time}
          </Text>
          <Text className={cn('text-base', alarm.enabled ? 'text-foreground' : 'text-muted')} numberOfLines={1}>
            {alarm.label ? `${alarm.label}，` : ''}
            {ruleDesc}
          </Text>
          {periodDesc && <Text className="text-sm text-muted mt-0.5">{periodDesc}</Text>}
          {next && <Text className="text-sm text-primary mt-0.5">{describeNext(next, now)}</Text>}
        </View>

        <Switch
          value={alarm.enabled}
          onValueChange={handleToggle}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#ffffff"
          ios_backgroundColor={colors.border}
        />
      </View>
    </Pressable>
  );
}
