/**
 * 铃声选择页面
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { getSystemSounds, getCustomSounds, getPreviewAudioSource } from '@/lib/storage';
import type { Sound } from '@/types/alarm';
import { cn } from '@/lib/utils';

const PREVIEW_DURATION_MS = 3000;

export default function SoundScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colors = useColors();

  const currentSoundId = (params.soundId as string) || 'default';

  const [selectedSoundId, setSelectedSoundId] = useState(currentSoundId);
  const [systemSounds, setSystemSounds] = useState<Sound[]>([]);
  const [customSounds, setCustomSounds] = useState<Sound[]>([]);

  const previewStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const player = useAudioPlayer(getPreviewAudioSource(getSystemSounds()[0] ?? { id: 'default', name: '默认铃声', uri: 'system://default', isCustom: false }));

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers', interruptionModeAndroid: 'duckOthers' });
  }, []);

  useEffect(() => {
    loadSounds();
  }, []);

  const loadSounds = async () => {
    setSystemSounds(getSystemSounds());
    const custom = await getCustomSounds();
    setCustomSounds(custom);
  };

  useEffect(() => {
    return () => {
      if (previewStopTimerRef.current) {
        clearTimeout(previewStopTimerRef.current);
      }
    };
  }, []);

  const handleSelectSound = (sound: Sound) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedSoundId(sound.id);

    if (previewStopTimerRef.current) {
      clearTimeout(previewStopTimerRef.current);
      previewStopTimerRef.current = null;
    }

    player.pause();
    try {
      const source = getPreviewAudioSource(sound);
      player.replace(source);
      player.play();

      previewStopTimerRef.current = setTimeout(() => {
        player.pause();
        previewStopTimerRef.current = null;
      }, PREVIEW_DURATION_MS);
    } catch {
      // 预览播放失败时静默忽略
    }
  };

  const handleSave = () => {
    const selectedSound = [...systemSounds, ...customSounds].find(s => s.id === selectedSoundId);
    const soundName = selectedSound?.name ?? '默认铃声';
    router.replace({
      pathname: '/alarm/edit',
      params: {
        ...(params.id && { id: params.id as string }),
        soundId: selectedSoundId,
        soundName,
        ...(params.repeatType && { repeatType: params.repeatType as string }),
        ...(params.repeatDays && { repeatDays: params.repeatDays as string }),
      },
    });
  };

  const handleCancel = () => {
    router.back();
  };

  const handleAddCustomSound = () => {
    Alert.alert('提示', '自定义铃声上传功能开发中');
  };

  const renderSoundItem = (sound: Sound) => (
    <Pressable
      key={sound.id}
      onPress={() => handleSelectSound(sound)}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View className={cn(
        "bg-surface border rounded-xl px-4 py-3 mb-2 flex-row items-center justify-between",
        selectedSoundId === sound.id ? "border-primary" : "border-border"
      )}>
        <Text className="text-base text-foreground">{sound.name}</Text>
        {selectedSoundId === sound.id && (
          <Text className="text-lg text-primary">✓</Text>
        )}
      </View>
    </Pressable>
  );

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
        <Text className="text-xl font-semibold text-foreground">选择铃声</Text>
        <Pressable
          onPress={handleSave}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Text className="text-lg text-primary font-semibold">完成</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1">
        {/* 系统铃声 */}
        <View className="px-4 mt-4">
          <Text className="text-sm text-muted mb-3">系统铃声</Text>
          {systemSounds.map(renderSoundItem)}
        </View>

        {/* 自定义铃声 */}
        <View className="px-4 mt-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm text-muted">自定义铃声</Text>
            <Pressable
              onPress={handleAddCustomSound}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Text className="text-sm text-primary">+ 添加</Text>
            </Pressable>
          </View>
          
          {customSounds.length === 0 ? (
            <View className="bg-surface rounded-xl p-6 items-center">
              <Text className="text-base text-muted text-center">
                还没有自定义铃声
              </Text>
              <Text className="text-sm text-muted text-center mt-2">
                点击右上角「添加」按钮上传
              </Text>
            </View>
          ) : (
            customSounds.map(renderSoundItem)
          )}
        </View>

        {/* 底部留白 */}
        <View className="h-8" />
      </ScrollView>
    </ScreenContainer>
  );
}
