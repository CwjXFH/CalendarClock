/**
 * 添加 / 编辑闹钟
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/screen-container';
import { DateField, TimeField } from '@/components/date-field';
import { useAlarms } from '@/lib/alarm-provider';
import { useColors } from '@/hooks/use-colors';
import { cn } from '@/lib/utils';
import { combineDateTime, formatMonthDayWeek, toDateKey, WEEKDAY_NAMES, type DateKey } from '@/lib/date-utils';
import { findUncoveredYears, getOccurrences } from '@/lib/schedule';
import { consumePendingSound } from '@/lib/picker-result';
import {
  createDefaultAlarm,
  nextDateForTime,
  REPEAT_KIND_LABELS,
  type Alarm,
  type AlarmInput,
  type RepeatKind,
  type RepeatRule,
} from '@/types/alarm';

const KIND_ORDER: RepeatKind[] = ['once', 'cn-workday', 'cn-offday', 'weekly', 'daily', 'interval'];

const KIND_HINTS: Partial<Record<RepeatKind, string>> = {
  once: '可以选择很久以后的某一天',
  'cn-workday': '周一至周五 + 调休上班日，自动跳过法定节假日',
  'cn-offday': '周末 + 法定节假日，调休上班日不响',
};

/** 周一在前的展示顺序 */
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

interface Draft {
  time: string;
  label: string;
  kind: RepeatKind;
  onceDate: DateKey;
  /** 用户是否手动选过单次日期；没选过时改时间会自动顺延到下一个该时刻 */
  onceDateTouched: boolean;
  weeklyDays: number[];
  everyDays: number;
  anchorDate: DateKey;
  startDate?: DateKey;
  endDate?: DateKey;
  soundId: string;
  soundName: string;
}

function draftFromAlarm(alarm: Alarm | AlarmInput): Draft {
  const today = toDateKey(new Date());
  const { rule } = alarm;
  return {
    time: alarm.time,
    label: alarm.label,
    kind: rule.kind,
    onceDate: rule.kind === 'once' ? rule.date : nextDateForTime(alarm.time),
    onceDateTouched: rule.kind === 'once' && 'id' in alarm,
    weeklyDays: rule.kind === 'weekly' ? rule.days : [1, 2, 3, 4, 5],
    everyDays: rule.kind === 'interval' ? rule.everyDays : 2,
    anchorDate: rule.kind === 'interval' ? rule.anchorDate : alarm.startDate ?? today,
    startDate: alarm.startDate,
    endDate: alarm.endDate,
    soundId: alarm.soundId,
    soundName: alarm.soundName,
  };
}

function ruleFromDraft(d: Draft): RepeatRule {
  switch (d.kind) {
    case 'once':
      return { kind: 'once', date: d.onceDate };
    case 'weekly':
      return { kind: 'weekly', days: [...d.weeklyDays].sort((a, b) => a - b) };
    case 'interval':
      return { kind: 'interval', everyDays: d.everyDays, anchorDate: d.anchorDate };
    default:
      return { kind: d.kind };
  }
}

function inputFromDraft(d: Draft): AlarmInput {
  const rule = ruleFromDraft(d);
  const isOnce = rule.kind === 'once';
  return {
    time: d.time,
    label: d.label.trim(),
    enabled: true,
    rule,
    startDate: isOnce ? undefined : d.startDate,
    endDate: isOnce ? undefined : d.endDate,
    soundId: d.soundId,
    soundName: d.soundName,
  };
}

export default function EditAlarmScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{ id?: string }>();
  const { alarms, calendar, addAlarm, updateAlarm, deleteAlarm } = useAlarms();

  const alarmId = params.id;
  const existing = alarmId ? alarms.find((a) => a.id === alarmId) : undefined;

  // 只在首次渲染时初始化，之后的列表刷新不会覆盖正在编辑的内容
  const [draft, setDraft] = useState<Draft>(() => draftFromAlarm(existing ?? createDefaultAlarm()));
  const [saving, setSaving] = useState(false);
  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  // 从铃声页返回
  useFocusEffect(
    useCallback(() => {
      const picked = consumePendingSound();
      if (picked) setDraft((d) => ({ ...d, ...picked }));
    }, []),
  );

  const today = toDateKey(new Date());
  const input = useMemo(() => inputFromDraft(draft), [draft]);

  // 预览接下来几次响铃，便于核对节假日规则
  const preview = useMemo(() => {
    const fake: Alarm = { ...input, id: 'preview', createdAt: '', updatedAt: '' };
    if (input.rule.kind === 'weekly' && input.rule.days.length === 0) return { dates: [], uncovered: [] };
    return {
      dates: getOccurrences(fake, new Date(), calendar, { maxCount: 6 }),
      uncovered: findUncoveredYears(fake, new Date(), calendar, 366),
    };
  }, [input, calendar]);

  const handleTimeChange = (time: string) => {
    setDraft((d) => ({
      ...d,
      time,
      onceDate: d.onceDateTouched ? d.onceDate : nextDateForTime(time),
    }));
  };

  const toggleWeekday = (day: number) => {
    setDraft((d) => ({
      ...d,
      weeklyDays: d.weeklyDays.includes(day) ? d.weeklyDays.filter((x) => x !== day) : [...d.weeklyDays, day],
    }));
  };

  const validate = (): string | null => {
    const { rule, startDate, endDate } = input;
    if (rule.kind === 'once' && combineDateTime(rule.date, input.time) <= new Date()) {
      return '这个时间已经过去了，请选择未来的日期或时间';
    }
    if (rule.kind === 'weekly' && rule.days.length === 0) return '请至少选择一天';
    if (rule.kind === 'interval' && (rule.everyDays < 1 || rule.everyDays > 365)) return '间隔天数需在 1～365 之间';
    if (startDate && endDate && endDate < startDate) return '结束日期不能早于开始日期';
    if (endDate && endDate < today) return '结束日期已经过去了';
    if (preview.dates.length === 0) return '按当前设置，这个闹钟不会响，请检查日期范围';
    return null;
  };

  const doSave = async () => {
    setSaving(true);
    try {
      if (alarmId) {
        await updateAlarm(alarmId, input);
      } else {
        await addAlarm(input);
      }
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.back();
    } catch (error) {
      console.error('Failed to save alarm:', error);
      Alert.alert('错误', '保存闹钟失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (saving) return;
    const error = validate();
    if (error) {
      Alert.alert('无法保存', error);
      return;
    }
    if (preview.uncovered.length) {
      Alert.alert(
        '节假日数据未配置',
        `${preview.uncovered.join('、')} 年的节假日安排还没有配置，这些年份将按“周一至周五上班、周末休息”处理。\n\n可在“设置 → 节假日数据”中补充。`,
        [
          { text: '取消', style: 'cancel' },
          { text: '仍然保存', onPress: () => void doSave() },
        ],
      );
      return;
    }
    void doSave();
  };

  const handleDelete = () => {
    if (!alarmId) return;
    Alert.alert('删除闹钟', '确定要删除这个闹钟吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteAlarm(alarmId);
          router.back();
        },
      },
    ]);
  };

  return (
    <ScreenContainer>
      {/* 顶部导航栏 */}
      <View className="px-6 py-4 border-b border-border flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-lg text-primary">取消</Text>
        </Pressable>
        <Text className="text-xl font-semibold text-foreground">{alarmId ? '编辑闹钟' : '添加闹钟'}</Text>
        <Pressable onPress={handleSave} hitSlop={8} disabled={saving}>
          <Text className={cn('text-lg font-semibold', saving ? 'text-muted' : 'text-primary')}>保存</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <TimeField value={draft.time} onChange={handleTimeChange} />

        <View className="mt-4 px-4">
          {/* 标签 */}
          <SectionTitle>标签</SectionTitle>
          <TextInput
            value={draft.label}
            onChangeText={(label) => patch({ label })}
            placeholder="闹钟（可选）"
            placeholderTextColor={colors.muted}
            className="bg-surface border border-border rounded-xl px-4 py-3 text-base text-foreground mb-4"
            maxLength={30}
          />

          {/* 重复规则 */}
          <SectionTitle>重复</SectionTitle>
          <View className="flex-row flex-wrap gap-2 mb-2">
            {KIND_ORDER.map((kind) => (
              <Chip key={kind} selected={draft.kind === kind} onPress={() => patch({ kind })}>
                {REPEAT_KIND_LABELS[kind]}
              </Chip>
            ))}
          </View>
          {KIND_HINTS[draft.kind] && <Text className="text-xs text-muted mb-3">{KIND_HINTS[draft.kind]}</Text>}

          {draft.kind === 'once' && (
            <DateField
              label="日期"
              value={draft.onceDate}
              minimumDate={today}
              onChange={(v) => v && patch({ onceDate: v, onceDateTouched: true })}
            />
          )}

          {draft.kind === 'weekly' && (
            <View className="flex-row justify-between mb-3">
              {WEEKDAY_ORDER.map((day) => (
                <Pressable
                  key={day}
                  onPress={() => toggleWeekday(day)}
                  className={cn(
                    'w-11 h-11 rounded-full items-center justify-center border',
                    draft.weeklyDays.includes(day) ? 'bg-primary border-primary' : 'bg-surface border-border',
                  )}
                >
                  <Text className={draft.weeklyDays.includes(day) ? 'text-white font-semibold' : 'text-foreground'}>
                    {WEEKDAY_NAMES[day].slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {draft.kind === 'interval' && (
            <>
              <View className="bg-surface border border-border rounded-xl px-4 py-3 flex-row items-center justify-between mb-3">
                <Text className="text-base text-foreground">每隔</Text>
                <View className="flex-row items-center gap-4">
                  <StepButton onPress={() => patch({ everyDays: Math.max(1, draft.everyDays - 1) })}>−</StepButton>
                  <Text className="text-base text-foreground w-14 text-center">{draft.everyDays} 天</Text>
                  <StepButton onPress={() => patch({ everyDays: Math.min(365, draft.everyDays + 1) })}>+</StepButton>
                </View>
              </View>
              <DateField label="从这天开始算" value={draft.anchorDate} onChange={(v) => v && patch({ anchorDate: v })} />
            </>
          )}

          {/* 生效时间段 */}
          {draft.kind !== 'once' && (
            <>
              <SectionTitle className="mt-2">生效时间段</SectionTitle>
              <DateField
                label="开始"
                value={draft.startDate}
                placeholder="立即生效"
                clearable
                minimumDate={today}
                onChange={(startDate) => patch({ startDate })}
              />
              <DateField
                label="结束"
                value={draft.endDate}
                placeholder="一直有效"
                clearable
                minimumDate={draft.startDate && draft.startDate > today ? draft.startDate : today}
                onChange={(endDate) => patch({ endDate })}
              />
            </>
          )}

          {/* 铃声 */}
          <SectionTitle className="mt-2">铃声</SectionTitle>
          <Pressable
            onPress={() => router.push({ pathname: '/alarm/sound', params: { soundId: draft.soundId } })}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <View className="bg-surface border border-border rounded-xl px-4 py-3 flex-row items-center justify-between mb-4">
              <Text className="text-base text-foreground">{draft.soundName}</Text>
              <Text className="text-base text-muted">›</Text>
            </View>
          </Pressable>

          {/* 响铃预览 */}
          <SectionTitle>接下来会在这些时间响</SectionTitle>
          <View className="bg-surface border border-border rounded-xl px-4 py-2 mb-4">
            {preview.dates.length === 0 ? (
              <Text className="text-sm text-muted py-2">按当前设置不会响铃</Text>
            ) : (
              preview.dates.map((d) => {
                const key = toDateKey(d);
                const info = calendar.getDayInfo(key);
                return (
                  <View key={d.getTime()} className="flex-row justify-between py-2">
                    <Text className="text-sm text-foreground">
                      {key.slice(0, 4) !== today.slice(0, 4) ? `${key.slice(0, 4)}年` : ''}
                      {formatMonthDayWeek(key)} {draft.time}
                    </Text>
                    {info.name && <Text className="text-xs text-muted">{info.name}</Text>}
                  </View>
                );
              })
            )}
            {preview.uncovered.length > 0 && (
              <Text className="text-xs text-warning py-2">
                {preview.uncovered.join('、')} 年节假日未配置，按普通周末推算
              </Text>
            )}
          </View>

          {alarmId && (
            <Pressable onPress={handleDelete} className="items-center py-3 mb-4">
              <Text className="text-base text-error">删除闹钟</Text>
            </Pressable>
          )}
        </View>

        <View className="h-8" />
      </ScrollView>
    </ScreenContainer>
  );
}

function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Text className={cn('text-sm text-muted mb-2', className)}>{children}</Text>;
}

function Chip({ selected, onPress, children }: { selected: boolean; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== 'web') void Haptics.selectionAsync();
        onPress();
      }}
      className={cn('px-4 py-2 rounded-full border', selected ? 'bg-primary border-primary' : 'bg-surface border-border')}
    >
      <Text className={selected ? 'text-white font-semibold' : 'text-foreground'}>{children}</Text>
    </Pressable>
  );
}

function StepButton({ onPress, children }: { onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} hitSlop={6} className="w-8 h-8 rounded-full bg-background border border-border items-center justify-center">
      <Text className="text-lg text-primary">{children}</Text>
    </Pressable>
  );
}
