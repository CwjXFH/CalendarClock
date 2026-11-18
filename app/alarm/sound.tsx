/**
 * 铃声选择页面
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { ScreenContainer } from '@/components/screen-container';
import { getSystemSounds, PREVIEW_SOUND_ASSET } from '@/lib/sounds';
import { setPendingSound } from '@/lib/picker-result';
import type { Sound } from '@/types/alarm';
import { cn } from '@/lib/utils';

const PREVIEW_DURATION_MS = 10000;

export default function SoundScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ soundId?: string }>();
  const sounds = getSystemSounds();
  const [selectedSoundId, setSelectedSoundId] = useState(
    sounds.some((s) => s.id === params.soundId) ? params.soundId! : sounds[0].id,
  );

  const previewStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewPlayerRef = useRef<AudioPlayer | null>(null);
  const previewTipShownRef = useRef(false);

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
    }).catch((error) => console.error('Failed to configure audio mode for preview:', error));
    return () => stopPreviewPlayback();
  }, [stopPreviewPlayback]);

  const handleSelectSound = (sound: Sound) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSoundId(sound.id);
    stopPreviewPlayback();

    if (!previewTipShownRef.current) {
      Alert.alert('提示', '系统铃声由设备控制，这里播放的是参考示例，实际提醒以系统提示音为准。');
      previewTipShownRef.current = true;
    }
    try {
      const player = createAudioPlayer(PREVIEW_SOUND_ASSET);
      player.loop = true;
      player.play();
      previewPlayerRef.current = player;
      previewStopTimerRef.current = setTimeout(stopPreviewPlayback, PREVIEW_DURATION_MS);
    } catch (error) {
      console.error('Failed to preview sound:', error);
    }
  };

  const handleSave = () => {
    stopPreviewPlayback();
    const selected = sounds.find((s) => s.id === selectedSoundId) ?? sounds[0];
    setPendingSound({ soundId: selected.id, soundName: selected.name });
    router.back();
  };

  const handleCancel = () => {
    stopPreviewPlayback();
    router.back();
  };

  return (
    <ScreenContainer>
      <View className="px-6 py-4 border-b border-border flex-row items-center justify-between">
        <Pressable onPress={handleCancel} hitSlop={8}>
          <Text className="text-lg text-primary">取消</Text>
        </Pressable>
        <Text className="text-xl font-semibold text-foreground">选择铃声</Text>
        <Pressable onPress={handleSave} hitSlop={8}>
          <Text className="text-lg text-primary font-semibold">完成</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1">
        <View className="px-4 mt-4">
          <Text className="text-sm text-muted mb-3">系统铃声</Text>
          {sounds.map((sound) => (
            <Pressable
              key={sound.id}
              onPress={() => handleSelectSound(sound)}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <View
                className={cn(
                  'bg-surface border rounded-xl px-4 py-3 mb-2 flex-row items-center justify-between',
                  selectedSoundId === sound.id ? 'border-primary' : 'border-border',
                )}
              >
                <Text className="text-base text-foreground">{sound.name}</Text>
                {selectedSoundId === sound.id && <Text className="text-lg text-primary">✓</Text>}
              </View>
            </Pressable>
          ))}
          <Text className="text-xs text-muted mt-2">
            iOS 本地通知只能使用系统提示音或打包进 App 的音频，暂不支持选择手机里的音乐。
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
