/**
 * 编辑某一年的节假日 / 调休数据
 */

import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { DateField } from '@/components/date-field';
import { BUILTIN_HOLIDAY_YEARS, useAlarms } from '@/lib/alarm-provider';
import { validateHolidayConfig } from '@/lib/cn-calendar';
import { useColors } from '@/hooks/use-colors';
import type { HolidayYearConfig } from '@/config/holidays';
import type { DateKey } from '@/lib/date-utils';

interface HolidayDraft {
  key: string;
  name: string;
  start?: DateKey;
  end?: DateKey;
}

interface WorkdayDraft {
  key: string;
  date?: DateKey;
  name: string;
}

let keySeq = 0;
const nextKey = () => `k${++keySeq}`;

function toDraft(cfg: HolidayYearConfig | undefined) {
  return {
    source: cfg?.source ?? '',
    holidays: (cfg?.holidays ?? []).map<HolidayDraft>((h) => ({ key: nextKey(), ...h })),
    workdays: (cfg?.workdays ?? []).map<WorkdayDraft>((w) => ({ key: nextKey(), date: w.date, name: w.name ?? '' })),
  };
}

export default function HolidayYearScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{ year: string }>();
  const year = Number(params.year);
  const { holidayYears, saveHolidayYear, deleteHolidayYear } = useAlarms();

  const existing = holidayYears.find((y) => y.year === year);
  const builtin = useMemo(() => BUILTIN_HOLIDAY_YEARS.find((y) => y.year === year), [year]);

  const [initial] = useState(() => toDraft(existing));
  const [source, setSource] = useState(initial.source);
  const [holidays, setHolidays] = useState<HolidayDraft[]>(initial.holidays);
  const [workdays, setWorkdays] = useState<WorkdayDraft[]>(initial.workdays);
  const [saving, setSaving] = useState(false);

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-muted">年份无效</Text>
      </ScreenContainer>
    );
  }

  const yearStart = `${year}-01-01`;

  const patchHoliday = (key: string, p: Partial<HolidayDraft>) =>
    setHolidays((list) =>
      list.map((h) => {
        if (h.key !== key) return h;
        const next = { ...h, ...p };
        // 选了开始日期而结束日期为空或更早时，自动对齐
        if (p.start && (!next.end || next.end < p.start)) next.end = p.start;
        return next;
      }),
    );
  const patchWorkday = (key: string, p: Partial<WorkdayDraft>) =>
    setWorkdays((list) => list.map((w) => (w.key === key ? { ...w, ...p } : w)));

  const buildConfig = (): { cfg?: HolidayYearConfig; error?: string } => {
    for (const [i, h] of holidays.entries()) {
      if (!h.name.trim()) return { error: `第 ${i + 1} 个假期缺少名称` };
      if (!h.start || !h.end) return { error: `“${h.name}”缺少日期` };
    }
    for (const [i, w] of workdays.entries()) {
      if (!w.date) return { error: `第 ${i + 1} 个调休日缺少日期` };
    }
    const cfg: HolidayYearConfig = {
      year,
      ...(source.trim() ? { source: source.trim() } : {}),
      holidays: holidays
        .map((h) => ({ name: h.name.trim(), start: h.start!, end: h.end! }))
        .sort((a, b) => a.start.localeCompare(b.start)),
      workdays: workdays
        .map((w) => (w.name.trim() ? { date: w.date!, name: w.name.trim() } : { date: w.date! }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
    const errors = validateHolidayConfig(cfg);
    return errors.length ? { error: errors.join('\n') } : { cfg };
  };

  const handleSave = async () => {
    if (saving) return;
    const { cfg, error } = buildConfig();
    if (!cfg) {
      Alert.alert('无法保存', error);
      return;
    }
    setSaving(true);
    try {
      await saveHolidayYear(cfg);
      router.back();
    } catch (e) {
      console.error('Failed to save holidays:', e);
      Alert.alert('错误', '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(`删除 ${year} 年数据`, '删除后该年将按普通周一至周五 / 周末推算。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteHolidayYear(year);
          router.back();
        },
      },
    ]);
  };

  const handleRestoreBuiltin = () => {
    if (!builtin) return;
    Alert.alert('恢复内置数据', `用 App 内置的 ${year} 年数据替换当前表单内容？（点“保存”后生效）`, [
      { text: '取消', style: 'cancel' },
      {
        text: '恢复',
        onPress: () => {
          const d = toDraft(builtin);
          setSource(d.source);
          setHolidays(d.holidays);
          setWorkdays(d.workdays);
        },
      },
    ]);
  };

  return (
    <ScreenContainer>
      <View className="px-6 py-4 border-b border-border flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-lg text-primary">取消</Text>
        </Pressable>
        <Text className="text-xl font-semibold text-foreground">{year} 年节假日</Text>
        <Pressable onPress={handleSave} hitSlop={8} disabled={saving}>
          <Text className={saving ? 'text-lg text-muted' : 'text-lg font-semibold text-primary'}>保存</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Text className="text-sm text-muted mb-2">数据来源（可选）</Text>
        <TextInput
          value={source}
          onChangeText={setSource}
          placeholder="如：国办发明电〔2025〕7号"
          placeholderTextColor={colors.muted}
          className="bg-surface border border-border rounded-xl px-4 py-3 text-base text-foreground mb-6"
        />

        {/* 假期 */}
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-sm text-muted">放假安排（含首尾日期，包括其中的周末）</Text>
        </View>
        {holidays.map((h) => (
          <View key={h.key} className="border border-border rounded-xl p-3 mb-3">
            <View className="flex-row items-center mb-2">
              <TextInput
                value={h.name}
                onChangeText={(name) => patchHoliday(h.key, { name })}
                placeholder="节日名称，如 春节"
                placeholderTextColor={colors.muted}
                className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-base text-foreground"
              />
              <Pressable
                onPress={() => setHolidays((list) => list.filter((x) => x.key !== h.key))}
                hitSlop={8}
                className="ml-3"
              >
                <Text className="text-error">删除</Text>
              </Pressable>
            </View>
            <DateField
              label="开始"
              value={h.start}
              placeholder="选择日期"
              minimumDate={h.start ?? yearStart}
              onChange={(start) => start && patchHoliday(h.key, { start })}
            />
            <DateField
              label="结束"
              value={h.end}
              placeholder="选择日期"
              minimumDate={h.start ?? yearStart}
              onChange={(end) => end && patchHoliday(h.key, { end })}
            />
          </View>
        ))}
        <Pressable
          onPress={() => setHolidays((list) => [...list, { key: nextKey(), name: '' }])}
          className="py-3 mb-6 items-center border border-dashed border-primary rounded-xl"
        >
          <Text className="text-primary">+ 添加假期</Text>
        </Pressable>

        {/* 调休上班 */}
        <Text className="text-sm text-muted mb-2">调休上班日（通常是周六或周日）</Text>
        {workdays.map((w) => (
          <View key={w.key} className="border border-border rounded-xl p-3 mb-3">
            <DateField
              label="日期"
              value={w.date}
              placeholder="选择日期"
              minimumDate={w.date ?? `${year - 1}-12-01`}
              onChange={(date) => date && patchWorkday(w.key, { date })}
            />
            <View className="flex-row items-center">
              <TextInput
                value={w.name}
                onChangeText={(name) => patchWorkday(w.key, { name })}
                placeholder="说明（可选），如 春节调休"
                placeholderTextColor={colors.muted}
                className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-base text-foreground"
              />
              <Pressable
                onPress={() => setWorkdays((list) => list.filter((x) => x.key !== w.key))}
                hitSlop={8}
                className="ml-3"
              >
                <Text className="text-error">删除</Text>
              </Pressable>
            </View>
          </View>
        ))}
        <Pressable
          onPress={() => setWorkdays((list) => [...list, { key: nextKey(), name: '' }])}
          className="py-3 mb-8 items-center border border-dashed border-primary rounded-xl"
        >
          <Text className="text-primary">+ 添加调休上班日</Text>
        </Pressable>

        {builtin && (
          <Pressable onPress={handleRestoreBuiltin} className="items-center py-3">
            <Text className="text-primary">恢复 App 内置的 {year} 年数据</Text>
          </Pressable>
        )}
        {existing && (
          <Pressable onPress={handleDelete} className="items-center py-3">
            <Text className="text-error">删除 {year} 年数据</Text>
          </Pressable>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
