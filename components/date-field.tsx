/**
 * 日期 / 时间选择字段
 * iOS：点击展开内嵌选择器；Android：弹出系统对话框
 * Web：datetimepicker 不支持 Web，改用浏览器原生 <input type="date|time">（仅用于开发调试界面）
 */

import React, { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { formatFullDate, parseDateKey, toDateKey, WEEKDAY_NAMES, type DateKey } from '@/lib/date-utils';

interface DateFieldProps {
  label: string;
  value: DateKey | undefined;
  onChange: (value: DateKey | undefined) => void;
  placeholder?: string;
  /** 是否允许清除（可选字段） */
  clearable?: boolean;
  minimumDate?: DateKey;
}

export function DateField({ label, value, onChange, placeholder = '不限', clearable, minimumDate }: DateFieldProps) {
  const [open, setOpen] = useState(false);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') setOpen(false);
    if (event.type === 'dismissed' || !selected) return;
    onChange(toDateKey(selected));
  };

  if (Platform.OS === 'web') {
    return (
      <View className="mb-3">
        <View className="bg-surface border border-border rounded-xl px-4 py-3 flex-row items-center justify-between">
          <Text className="text-base text-foreground">{label}</Text>
          <WebInput type="date" value={value ?? ''} min={minimumDate} onChange={(v) => onChange(v || undefined)} />
        </View>
      </View>
    );
  }

  const display = value ? `${formatFullDate(value)} ${WEEKDAY_NAMES[parseDateKey(value).getDay()]}` : placeholder;

  return (
    <View className="mb-3">
      <View className="bg-surface border border-border rounded-xl px-4 py-3 flex-row items-center justify-between">
        <Text className="text-base text-foreground">{label}</Text>
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => setOpen((o) => !o)} hitSlop={8}>
            <Text className={value ? 'text-base text-primary' : 'text-base text-muted'}>{display}</Text>
          </Pressable>
          {clearable && value && (
            <Pressable
              onPress={() => {
                onChange(undefined);
                setOpen(false);
              }}
              hitSlop={8}
            >
              <Text className="text-sm text-muted">清除</Text>
            </Pressable>
          )}
        </View>
      </View>
      {open && (
        <DateTimePicker
          value={value ? parseDateKey(value) : minimumDate ? parseDateKey(minimumDate) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={minimumDate ? parseDateKey(minimumDate) : undefined}
          onChange={handleChange}
          locale="zh-CN"
        />
      )}
    </View>
  );
}

interface TimeFieldProps {
  value: string; // HH:mm
  onChange: (value: string) => void;
}

export function TimeField({ value, onChange }: TimeFieldProps) {
  const [open, setOpen] = useState(Platform.OS === 'ios');
  const [h, m] = value.split(':').map(Number);
  const pickerValue = new Date();
  pickerValue.setHours(h, m, 0, 0);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') setOpen(false);
    if (event.type === 'dismissed' || !selected) return;
    onChange(`${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`);
  };

  if (Platform.OS === 'web') {
    return (
      <View className="items-center py-6 bg-surface">
        <WebInput type="time" value={value} onChange={(v) => v && onChange(v)} large />
      </View>
    );
  }

  return (
    <View className="items-center py-6 bg-surface">
      {Platform.OS !== 'ios' && (
        <Pressable onPress={() => setOpen(true)}>
          <Text className="text-7xl font-bold text-foreground">{value}</Text>
          <Text className="text-sm text-muted mt-2 text-center">点击修改时间</Text>
        </Pressable>
      )}
      {open && (
        <DateTimePicker
          value={pickerValue}
          mode="time"
          is24Hour
          display="spinner"
          onChange={handleChange}
          locale="zh-CN"
        />
      )}
    </View>
  );
}

interface WebInputProps {
  type: 'date' | 'time';
  value: string;
  onChange: (value: string) => void;
  min?: string;
  large?: boolean;
}

/** Web 端原生输入框：react-native-web 允许直接渲染 DOM 元素 */
function WebInput({ type, value, onChange, min, large }: WebInputProps) {
  return React.createElement('input', {
    type,
    value,
    min,
    onChange: (e: { target: { value: string } }) => onChange(e.target.value),
    style: {
      fontSize: large ? 56 : 16,
      fontWeight: large ? 700 : 400,
      color: large ? 'inherit' : '#FF9500',
      background: 'transparent',
      border: 'none',
      outline: 'none',
      fontFamily: 'inherit',
      textAlign: large ? 'center' : 'right',
    },
  });
}
