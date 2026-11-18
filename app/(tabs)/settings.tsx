/**
 * 设置
 */

import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { ScreenContainer } from '@/components/screen-container';
import { useAlarms } from '@/lib/alarm-provider';
import { isNotificationSupported } from '@/lib/notifications';
import { addDays, formatMonthDayWeek, toDateKey } from '@/lib/date-utils';
import type { DayInfo } from '@/lib/cn-calendar';

const KIND_TEXT: Record<DayInfo['kind'], string> = {
  holiday: '法定节假日，放假',
  'adjusted-workday': '调休，需要上班',
  workday: '工作日',
  weekend: '周末',
};

function describeDay(info: DayInfo) {
  return `${info.name ? `${info.name}，` : ''}${KIND_TEXT[info.kind]}${info.covered ? '' : '（未配置该年数据）'}`;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { holidayYears, calendar, permissionGranted, scheduleInfo, refresh } = useAlarms();
  const [syncing, setSyncing] = useState(false);

  const today = toDateKey(new Date());
  const thisYear = Number(today.slice(0, 4));
  const configured = new Set(holidayYears.map((y) => y.year));
  const missing = [thisYear, thisYear + 1].filter((y) => !configured.has(y));
  const addable = [thisYear - 1, thisYear, thisYear + 1, thisYear + 2].filter((y) => !configured.has(y));
  const years = [...holidayYears].sort((a, b) => b.year - a.year);

  const handleResync = async () => {
    setSyncing(true);
    try {
      await refresh();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <ScreenContainer>
      <View className="px-6 py-4 border-b border-border">
        <Text className="text-3xl font-bold text-foreground">设置</Text>
      </View>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* 今日 */}
        <Card>
          <Text className="text-base text-foreground">
            今天 {formatMonthDayWeek(today)}：{describeDay(calendar.getDayInfo(today))}
          </Text>
          <Text className="text-sm text-muted mt-1">明天：{describeDay(calendar.getDayInfo(addDays(today, 1)))}</Text>
        </Card>

        {/* 节假日数据 */}
        <SectionTitle>节假日数据</SectionTitle>
        {missing.length > 0 && (
          <View className="border border-warning rounded-xl p-4 mb-3">
            <Text className="text-sm text-warning">
              {missing.join('、')} 年的节假日安排尚未配置，“法定工作日 / 休息日”闹钟在这些年份会按普通周一至周五 / 周末推算。
            </Text>
            <Text className="text-xs text-muted mt-2">国务院办公厅通常在每年 11 月前后发布次年的放假安排。</Text>
          </View>
        )}

        <View className="bg-surface border border-border rounded-xl mb-3">
          {years.length === 0 && <Text className="text-sm text-muted p-4">还没有任何年份的数据</Text>}
          {years.map((y, i) => (
            <Row
              key={y.year}
              first={i === 0}
              title={`${y.year} 年`}
              subtitle={`${y.holidays.length} 个假期 · ${y.workdays.length} 个调休上班日${y.source ? `\n${y.source}` : ''}`}
              onPress={() => router.push({ pathname: '/holidays/[year]', params: { year: String(y.year) } })}
            />
          ))}
        </View>

        {addable.length > 0 && (
          <View className="flex-row flex-wrap gap-2 mb-3">
            {addable.map((y) => (
              <Pressable
                key={y}
                onPress={() => router.push({ pathname: '/holidays/[year]', params: { year: String(y) } })}
                className="px-4 py-2 rounded-full border border-primary"
              >
                <Text className="text-primary">+ 添加 {y} 年</Text>
              </Pressable>
            ))}
          </View>
        )}
        <Pressable onPress={() => router.push('/holidays/import')} className="py-2 mb-4">
          <Text className="text-primary">从 JSON 导入 / 查看格式…</Text>
        </Pressable>

        {/* 通知 */}
        <SectionTitle>通知</SectionTitle>
        <Card>
          {!isNotificationSupported ? (
            <Text className="text-sm text-warning">当前平台不支持本地通知</Text>
          ) : (
            <>
              <View className="flex-row justify-between items-center">
                <Text className="text-base text-foreground">通知权限</Text>
                {permissionGranted ? (
                  <Text className="text-sm text-success">已开启</Text>
                ) : (
                  <Pressable onPress={() => void Linking.openSettings()} hitSlop={8}>
                    <Text className="text-sm text-error">未开启，去设置 ›</Text>
                  </Pressable>
                )}
              </View>
              <Text className="text-sm text-muted mt-2">
                已安排 {scheduleInfo?.scheduled ?? 0} 次提醒
                {scheduleInfo?.coverageEnd ? `，排到 ${formatMonthDayWeek(toDateKey(scheduleInfo.coverageEnd))}` : ''}
              </Text>
              <Text className="text-xs text-muted mt-1">
                iOS 最多同时保留 64 个待发送通知，App 每次打开都会自动续排。建议在系统设置中为本 App 打开“时间敏感通知”。
              </Text>
              <Pressable onPress={handleResync} disabled={syncing} className="mt-3">
                <Text className={syncing ? 'text-muted' : 'text-primary'}>{syncing ? '正在重新安排…' : '立即重新安排通知'}</Text>
              </Pressable>
            </>
          )}
        </Card>

        <Text className="text-xs text-muted text-center mt-4">日历闹钟 v{Constants.expoConfig?.version ?? '-'}</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text className="text-sm text-muted mb-2 mt-2">{children}</Text>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <View className="bg-surface border border-border rounded-xl p-4 mb-4">{children}</View>;
}

function Row({ title, subtitle, onPress, first }: { title: string; subtitle?: string; onPress: () => void; first?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      <View className={`flex-row items-center justify-between px-4 py-3 ${first ? '' : 'border-t border-border'}`}>
        <View className="flex-1 pr-2">
          <Text className="text-base text-foreground">{title}</Text>
          {subtitle && <Text className="text-xs text-muted mt-0.5">{subtitle}</Text>}
        </View>
        <Text className="text-base text-muted">›</Text>
      </View>
    </Pressable>
  );
}
