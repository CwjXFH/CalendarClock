/**
 * 添加/编辑闹钟页面
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ScreenContainer } from '@/components/screen-container';
import { useAlarms } from '@/lib/alarm-provider';
import { useColors } from '@/hooks/use-colors';
import { createDefaultAlarm, getRepeatDescription } from '@/types/alarm';
import type { Alarm } from '@/types/alarm';
import { cn } from '@/lib/utils';

export default function EditAlarmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colors = useColors();
  const { alarms, addAlarm, updateAlarm } = useAlarms();

  const alarmId = params.id as string | undefined;
  const existingAlarm = alarmId ? alarms.find(a => a.id === alarmId) : null;

  // 表单状态
  const [time, setTime] = useState(new Date());
  const [label, setLabel] = useState('');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [repeatType, setRepeatType] = useState<Alarm['repeatType']>('none');
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [soundId, setSoundId] = useState('default');
  const [soundName, setSoundName] = useState('默认铃声');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // 初始化表单
  useEffect(() => {
    if (existingAlarm) {
      const [hour, minute] = existingAlarm.time.split(':');
      const newTime = new Date();
      newTime.setHours(parseInt(hour, 10));
      newTime.setMinutes(parseInt(minute, 10));
      setTime(newTime);
      setLabel(existingAlarm.label);
      setRepeatType(existingAlarm.repeatType);
      setRepeatDays(existingAlarm.repeatDays || []);
      setSoundId(existingAlarm.soundId);
      setSoundName(existingAlarm.soundName);
      if (existingAlarm.date) {
        setDate(new Date(existingAlarm.date));
      }
    } else {
      const defaults = createDefaultAlarm();
      const [hour, minute] = defaults.time.split(':');
      const newTime = new Date();
      newTime.setHours(parseInt(hour, 10));
      newTime.setMinutes(parseInt(minute, 10));
      setTime(newTime);
      setSoundId(defaults.soundId);
      setSoundName(defaults.soundName);
    }
  }, [existingAlarm]);

  const handleSave = async () => {
    const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
    const dateStr = date ? date.toISOString().split('T')[0] : undefined;

    const alarmData: Omit<Alarm, 'id' | 'createdAt' | 'updatedAt'> = {
      time: timeStr,
      date: dateStr,
      label,
      enabled: true,
      repeatType,
      repeatDays: repeatType === 'weekly' ? repeatDays : undefined,
      soundId,
      soundName,
    };

    try {
      if (alarmId) {
        await updateAlarm(alarmId, alarmData);
      } else {
        await addAlarm(alarmData);
      }
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      router.back();
    } catch (error) {
      Alert.alert('错误', '保存闹钟失败，请重试');
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setTime(selectedTime);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleClearDate = () => {
    setDate(undefined);
  };

  const tempAlarm: Alarm = {
    id: 'temp',
    time: `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`,
    label,
    enabled: true,
    repeatType,
    repeatDays,
    soundId,
    soundName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
        <Text className="text-xl font-semibold text-foreground">
          {alarmId ? '编辑闹钟' : '添加闹钟'}
        </Text>
        <Pressable
          onPress={handleSave}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Text className="text-lg text-primary font-semibold">保存</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1">
        {/* 时间选择区 */}
        <View className="items-center py-8 bg-surface">
          <Pressable
            onPress={() => setShowTimePicker(true)}
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          >
            <Text className="text-7xl font-bold text-foreground">
              {String(time.getHours()).padStart(2, '0')}:
              {String(time.getMinutes()).padStart(2, '0')}
            </Text>
          </Pressable>
          <Text className="text-sm text-muted mt-2">点击修改时间</Text>
        </View>

        {showTimePicker && (
          <DateTimePicker
            value={time}
            mode="time"
            is24Hour={true}
            display="spinner"
            onChange={handleTimeChange}
          />
        )}

        {/* 基本设置区 */}
        <View className="mt-4 px-4">
          {/* 标签输入 */}
          <View className="mb-4">
            <Text className="text-sm text-muted mb-2">标签 (可选)</Text>
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder="闹钟名称"
              placeholderTextColor={colors.muted}
              className="bg-surface border border-border rounded-xl px-4 py-3 text-base text-foreground"
              maxLength={30}
            />
          </View>

          {/* 日期选择 */}
          <View className="mb-4">
            <Text className="text-sm text-muted mb-2">日期 (可选)</Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View className="bg-surface border border-border rounded-xl px-4 py-3 flex-row items-center justify-between">
                <Text className="text-base text-foreground">
                  {date ? format(date, 'yyyy年MM月dd日 EEEE', { locale: zhCN }) : '不选择'}
                </Text>
                {date && (
                  <Pressable
                    onPress={handleClearDate}
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                  >
                    <Text className="text-sm text-primary">清除</Text>
                  </Pressable>
                )}
              </View>
            </Pressable>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={date || new Date()}
              mode="date"
              display="spinner"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}

          {/* 重复规则 */}
          <View className="mb-4">
            <Text className="text-sm text-muted mb-2">重复</Text>
            <Pressable
              onPress={() => {
                router.push({
                  pathname: '/alarm/repeat',
                  params: {
                    type: repeatType,
                    days: JSON.stringify(repeatDays),
                  },
                });
              }}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View className="bg-surface border border-border rounded-xl px-4 py-3 flex-row items-center justify-between">
                <Text className="text-base text-foreground">
                  {getRepeatDescription(tempAlarm)}
                </Text>
                <Text className="text-base text-muted">›</Text>
              </View>
            </Pressable>
          </View>

          {/* 铃声选择 */}
          <View className="mb-4">
            <Text className="text-sm text-muted mb-2">铃声</Text>
            <Pressable
              onPress={() => {
                router.push({
                  pathname: '/alarm/sound',
                  params: { soundId },
                });
              }}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View className="bg-surface border border-border rounded-xl px-4 py-3 flex-row items-center justify-between">
                <Text className="text-base text-foreground">{soundName}</Text>
                <Text className="text-base text-muted">›</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* 底部留白 */}
        <View className="h-8" />
      </ScrollView>
    </ScreenContainer>
  );
}
