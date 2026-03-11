/**
 * 铃声选择页面
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { ScreenContainer } from '@/components/screen-container';
import { getSystemSounds, getCustomSounds, getPreviewAudioSource, isSystemSoundId } from '@/lib/storage';
import type { Sound } from '@/types/alarm';
import { cn } from '@/lib/utils';

const PREVIEW_DURATION_MS = 10000;

export default function SoundScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const currentSoundId = (params.soundId as string) || 'default';

  const [selectedSoundId, setSelectedSoundId] = useState(currentSoundId);
  const [systemSounds, setSystemSounds] = useState<Sound[]>([]);
  const [customSounds, setCustomSounds] = useState<Sound[]>([]);

  const previewStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewPlayerRef = useRef<AudioPlayer | null>(null);
  const systemPreviewTipShownRef = useRef(false);

  const stopPreviewPlayback = useCallback(() => {
    if (previewStopTimerRef.current) {
      clearTimeout(previewStopTimerRef.current);
      previewStopTimerRef.current = null;
    }

    if (previewPlayerRef.current) {
      previewPlayerRef.current.pause();
      previewPlayerRef.current.remove();
      previewPlayerRef.current = null;
    }
  }, []);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
      interruptionModeAndroid: 'duckOthers',
    }).catch((error) => {
      console.error('Failed to configure audio mode for preview:', error);
    });
  }, []);

  useEffect(() => {
    const loadSounds = async () => {
      const system = getSystemSounds();
      setSystemSounds(system);
      const custom = await getCustomSounds();
      setCustomSounds(custom);
      if (isSystemSoundId(currentSoundId) && currentSoundId !== 'default') {
        setSelectedSoundId('default');
      }
    };
    void loadSounds();
  }, [currentSoundId]);

  useEffect(() => {
    return () => stopPreviewPlayback();
  }, [stopPreviewPlayback]);

  const handleSelectSound = (sound: Sound) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedSoundId(sound.id);

    stopPreviewPlayback();

    try {
      if (isSystemSoundId(sound.id) && !systemPreviewTipShownRef.current) {
        Alert.alert('提示', '系统铃声由设备控制，下面播放的是参考示例，实际提醒以系统设置为准。');
        systemPreviewTipShownRef.current = true;
      }

      const source = getPreviewAudioSource(sound);
      const player = createAudioPlayer(source);
      player.loop = true;
      player.play();
      previewPlayerRef.current = player;

      previewStopTimerRef.current = setTimeout(() => {
        stopPreviewPlayback();
      }, PREVIEW_DURATION_MS);
    } catch (error) {
      console.error('Failed to preview sound:', error);
    }
  };

  const handleSave = () => {
    stopPreviewPlayback();
    const allSounds = [...systemSounds, ...customSounds];
    const fallbackSystemSound: Sound = systemSounds[0] ?? {
      id: 'default',
      name: '系统默认铃声',
      uri: 'system://default',
      isCustom: false,
    };
    const selectedSound = allSounds.find(s => s.id === selectedSoundId) ?? fallbackSystemSound;
    const soundName = selectedSound.name;
    router.replace({
      pathname: '/alarm/edit',
      params: {
        ...(params.id && { id: params.id as string }),
        soundId: selectedSound.id,
        soundName,
        ...(params.repeatType && { repeatType: params.repeatType as string }),
        ...(params.repeatDays && { repeatDays: params.repeatDays as string }),
      },
    });
  };

  const handleCancel = () => {
    stopPreviewPlayback();
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
