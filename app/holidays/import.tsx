/**
 * 从 JSON 批量导入节假日数据
 */

import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useAlarms } from '@/lib/alarm-provider';
import { parseHolidayConfigs } from '@/lib/cn-calendar';
import { useColors } from '@/hooks/use-colors';

const EXAMPLE = `{
  "year": 2027,
  "source": "国办发明电〔2026〕X号",
  "holidays": [
    { "name": "元旦", "start": "2027-01-01", "end": "2027-01-03" }
  ],
  "workdays": [
    { "date": "2027-01-09", "name": "元旦调休" }
  ]
}`;

export default function ImportHolidaysScreen() {
  const router = useRouter();
  const colors = useColors();
  const { holidayYears, saveHolidayYear } = useAlarms();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const handleImport = () => {
    const { configs, errors } = parseHolidayConfigs(text.trim());
    if (errors.length) {
      Alert.alert('数据有误', errors.slice(0, 8).join('\n'));
      return;
    }
    const overwrite = configs.filter((c) => holidayYears.some((y) => y.year === c.year)).map((c) => c.year);
    const run = async () => {
      setBusy(true);
      try {
        for (const cfg of configs) await saveHolidayYear(cfg);
        Alert.alert('导入成功', `已导入 ${configs.map((c) => c.year).join('、')} 年`);
        router.back();
      } catch (e) {
        console.error('Import failed:', e);
        Alert.alert('错误', '导入失败，请重试');
      } finally {
        setBusy(false);
      }
    };
    if (overwrite.length) {
      Alert.alert('覆盖确认', `${overwrite.join('、')} 年已有数据，导入将整年覆盖。`, [
        { text: '取消', style: 'cancel' },
        { text: '覆盖', style: 'destructive', onPress: () => void run() },
      ]);
    } else {
      void run();
    }
  };

  return (
    <ScreenContainer>
      <View className="px-6 py-4 border-b border-border flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-lg text-primary">取消</Text>
        </Pressable>
        <Text className="text-xl font-semibold text-foreground">导入节假日</Text>
        <Pressable onPress={handleImport} hitSlop={8} disabled={busy || !text.trim()}>
          <Text className={busy || !text.trim() ? 'text-lg text-muted' : 'text-lg font-semibold text-primary'}>导入</Text>
        </Pressable>
      </View>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text className="text-sm text-muted mb-2">粘贴 JSON（单个年份对象，或多个年份组成的数组）</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="在此粘贴…"
          placeholderTextColor={colors.muted}
          className="bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground mb-4"
          style={{ minHeight: 200, textAlignVertical: 'top', fontFamily: 'Menlo' }}
        />
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-sm text-muted">格式示例</Text>
          <Pressable onPress={() => setText(EXAMPLE)} hitSlop={8}>
            <Text className="text-sm text-primary">填入示例</Text>
          </Pressable>
        </View>
        <View className="bg-surface border border-border rounded-xl p-3">
          <Text selectable className="text-xs text-foreground" style={{ fontFamily: 'Menlo' }}>
            {EXAMPLE}
          </Text>
        </View>
        <Text className="text-xs text-muted mt-3">
          holidays 为放假区间（含首尾），workdays 为调休上班日。导入时会校验日期格式、调休日是否在周末等。
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}
