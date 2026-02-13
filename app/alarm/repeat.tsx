/**
 * 重复规则选择页面
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { cn } from '@/lib/utils';

const WEEKDAYS = [
  { value: 0, label: '周日' },
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
];

export default function RepeatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colors = useColors();

  // 从参数中获取当前设置
  const currentType = (params.type as string) || 'none';
  const currentDays = params.days ? JSON.parse(params.days as string) : [];

  const [repeatType, setRepeatType] = useState(currentType);
  const [selectedDays, setSelectedDays] = useState<number[]>(currentDays);

  const handleDayToggle = (day: number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    setSelectedDays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day].sort();
      }
    });
  };

  const handleSave = () => {
    router.replace({
      pathname: '/alarm/edit',
      params: {
        ...(params.id && { id: params.id as string }),
        repeatType: repeatType,
        repeatDays: JSON.stringify(selectedDays),
        ...(params.soundId && { soundId: params.soundId as string }),
        ...(params.soundName && { soundName: params.soundName as string }),
      },
    });
  };

  const handleCancel = () => {
    router.back();
  };

  const handleQuickSelect = (days: number[]) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedDays(days);
  };

  return (
    <ScreenContainer>
      {/* 顶部导航栏 */}
      <View className="px-6 py-4 border-b border-border flex-row items-center justify-between">
        <Pressable
          onPress={handleCancel}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Text className="text-lg text-primary">取消</Text>
        </Pressable>
        <Text className="text-xl font-semibold text-foreground">重复规则</Text>
        <Pressable
          onPress={handleSave}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Text className="text-lg text-primary font-semibold">完成</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1">
        {/* 重复类型选择 */}
        <View className="px-4 mt-4">
          <Text className="text-sm text-muted mb-3">重复类型</Text>
          
          {/* 不重复 */}
          <Pressable
            onPress={() => {
              setRepeatType('none');
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <View className={cn(
              "bg-surface border rounded-xl px-4 py-3 mb-2 flex-row items-center justify-between",
              repeatType === 'none' ? "border-primary" : "border-border"
            )}>
              <Text className="text-base text-foreground">不重复</Text>
              {repeatType === 'none' && (
                <Text className="text-lg text-primary">✓</Text>
              )}
            </View>
          </Pressable>

          {/* 每周重复 */}
          <Pressable
            onPress={() => {
              setRepeatType('weekly');
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <View className={cn(
              "bg-surface border rounded-xl px-4 py-3 mb-2 flex-row items-center justify-between",
              repeatType === 'weekly' ? "border-primary" : "border-border"
            )}>
              <Text className="text-base text-foreground">每周重复</Text>
              {repeatType === 'weekly' && (
                <Text className="text-lg text-primary">✓</Text>
              )}
            </View>
          </Pressable>

          {/* 法定节假日 */}
          <Pressable
            onPress={() => {
              setRepeatType('holiday');
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <View className={cn(
              "bg-surface border rounded-xl px-4 py-3 mb-2 flex-row items-center justify-between",
              repeatType === 'holiday' ? "border-primary" : "border-border"
            )}>
              <Text className="text-base text-foreground">法定节假日</Text>
              {repeatType === 'holiday' && (
                <Text className="text-lg text-primary">✓</Text>
              )}
            </View>
          </Pressable>
        </View>

        {/* 每周重复详细设置 */}
        {repeatType === 'weekly' && (
          <View className="px-4 mt-6">
            <Text className="text-sm text-muted mb-3">选择星期</Text>
            
            {/* 快捷选择 */}
            <View className="flex-row gap-2 mb-4">
              <Pressable
                onPress={() => handleQuickSelect([1, 2, 3, 4, 5])}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                  flex: 1,
                })}
              >
                <View className="bg-surface border border-border rounded-lg px-3 py-2">
                  <Text className="text-sm text-foreground text-center">工作日</Text>
                </View>
              </Pressable>
              
              <Pressable
                onPress={() => handleQuickSelect([0, 6])}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                  flex: 1,
                })}
              >
                <View className="bg-surface border border-border rounded-lg px-3 py-2">
                  <Text className="text-sm text-foreground text-center">周末</Text>
                </View>
              </Pressable>
              
              <Pressable
                onPress={() => handleQuickSelect([0, 1, 2, 3, 4, 5, 6])}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                  flex: 1,
                })}
              >
                <View className="bg-surface border border-border rounded-lg px-3 py-2">
                  <Text className="text-sm text-foreground text-center">每天</Text>
                </View>
              </Pressable>
            </View>

            {/* 星期选择按钮 */}
            <View className="flex-row flex-wrap gap-2">
              {WEEKDAYS.map(({ value, label }) => (
                <Pressable
                  key={value}
                  onPress={() => handleDayToggle(value)}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <View
                    className={cn(
                      "w-12 h-12 rounded-full items-center justify-center",
                      selectedDays.includes(value)
                        ? "bg-primary"
                        : "bg-surface border border-border"
                    )}
                  >
                    <Text
                      className={cn(
                        "text-base font-medium",
                        selectedDays.includes(value)
                          ? "text-white"
                          : "text-foreground"
                      )}
                    >
                      {label.slice(1)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>

            {/* 选择摘要 */}
            {selectedDays.length > 0 && (
              <View className="mt-4 p-3 bg-surface rounded-lg">
                <Text className="text-sm text-muted">
                  已选择: {selectedDays.map(d => WEEKDAYS.find(w => w.value === d)?.label).join('、')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* 法定节假日详细设置 */}
        {repeatType === 'holiday' && (
          <View className="px-4 mt-6">
            <Text className="text-sm text-muted mb-3">节假日类型</Text>
            <View className="bg-surface border border-border rounded-xl p-4">
              <Text className="text-base text-foreground mb-2">所有法定节假日</Text>
              <Text className="text-sm text-muted">
                包括春节、清明节、劳动节、端午节、中秋节、国庆节等
              </Text>
            </View>
          </View>
        )}

        {/* 底部留白 */}
        <View className="h-8" />
      </ScrollView>
    </ScreenContainer>
  );
}
