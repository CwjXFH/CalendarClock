/**
 * 铃声
 *
 * 本地通知只能播放系统默认提示音或打包进 App 的音频文件，
 * 目前统一使用系统默认提示音；预览播放的是内置示例音。
 */

import type { Sound } from '@/types/alarm';

/** 预览用的示例音频 */
export const PREVIEW_SOUND_ASSET = require('../assets/sounds/default.mp3');

export function getSystemSounds(): Sound[] {
  return [{ id: 'default', name: '系统默认铃声', uri: 'system://default', isCustom: false }];
}
