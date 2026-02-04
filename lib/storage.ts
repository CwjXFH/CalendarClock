/**
 * 闹钟数据存储服务
 * 使用AsyncStorage进行本地持久化
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Alarm, Sound } from '@/types/alarm';

const ALARMS_KEY = '@alarms';
const SOUNDS_KEY = '@sounds';

/**
 * 获取所有闹钟
 */
export async function getAlarms(): Promise<Alarm[]> {
  try {
    const data = await AsyncStorage.getItem(ALARMS_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Failed to load alarms:', error);
    return [];
  }
}

/**
 * 保存所有闹钟
 */
export async function saveAlarms(alarms: Alarm[]): Promise<void> {
  try {
    await AsyncStorage.setItem(ALARMS_KEY, JSON.stringify(alarms));
  } catch (error) {
    console.error('Failed to save alarms:', error);
    throw error;
  }
}

/**
 * 添加新闹钟
 */
export async function addAlarm(alarm: Omit<Alarm, 'id' | 'createdAt' | 'updatedAt'>): Promise<Alarm> {
  const alarms = await getAlarms();
  
  const newAlarm: Alarm = {
    ...alarm,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  alarms.unshift(newAlarm); // 添加到列表开头
  await saveAlarms(alarms);
  
  return newAlarm;
}

/**
 * 更新闹钟
 */
export async function updateAlarm(id: string, updates: Partial<Alarm>): Promise<Alarm | null> {
  const alarms = await getAlarms();
  const index = alarms.findIndex(a => a.id === id);
  
  if (index === -1) {
    return null;
  }
  
  alarms[index] = {
    ...alarms[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  await saveAlarms(alarms);
  return alarms[index];
}

/**
 * 删除闹钟
 */
export async function deleteAlarm(id: string): Promise<boolean> {
  const alarms = await getAlarms();
  const filtered = alarms.filter(a => a.id !== id);
  
  if (filtered.length === alarms.length) {
    return false; // 未找到要删除的闹钟
  }
  
  await saveAlarms(filtered);
  return true;
}

/**
 * 切换闹钟启用状态
 */
export async function toggleAlarm(id: string): Promise<Alarm | null> {
  const alarms = await getAlarms();
  const alarm = alarms.find(a => a.id === id);
  
  if (!alarm) {
    return null;
  }
  
  return updateAlarm(id, { enabled: !alarm.enabled });
}

/**
 * 获取系统预设铃声列表
 */
export function getSystemSounds(): Sound[] {
  return [
    { id: 'default', name: '默认铃声', uri: 'system://default', isCustom: false },
    { id: 'classic', name: '经典铃声', uri: 'system://classic', isCustom: false },
    { id: 'gentle', name: '轻柔铃声', uri: 'system://gentle', isCustom: false },
    { id: 'urgent', name: '急促铃声', uri: 'system://urgent', isCustom: false },
    { id: 'melody', name: '旋律铃声', uri: 'system://melody', isCustom: false },
    { id: 'chime', name: '钟声铃声', uri: 'system://chime', isCustom: false },
  ];
}

/**
 * 获取自定义铃声列表
 */
export async function getCustomSounds(): Promise<Sound[]> {
  try {
    const data = await AsyncStorage.getItem(SOUNDS_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Failed to load custom sounds:', error);
    return [];
  }
}

/**
 * 保存自定义铃声列表
 */
export async function saveCustomSounds(sounds: Sound[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SOUNDS_KEY, JSON.stringify(sounds));
  } catch (error) {
    console.error('Failed to save custom sounds:', error);
    throw error;
  }
}

/**
 * 添加自定义铃声
 */
export async function addCustomSound(name: string, uri: string): Promise<Sound> {
  const sounds = await getCustomSounds();
  
  const newSound: Sound = {
    id: Date.now().toString(),
    name,
    uri,
    isCustom: true,
  };
  
  sounds.push(newSound);
  await saveCustomSounds(sounds);
  
  return newSound;
}

/**
 * 删除自定义铃声
 */
export async function deleteCustomSound(id: string): Promise<boolean> {
  const sounds = await getCustomSounds();
  const filtered = sounds.filter(s => s.id !== id);
  
  if (filtered.length === sounds.length) {
    return false;
  }
  
  await saveCustomSounds(filtered);
  return true;
}

/**
 * 获取所有铃声(系统+自定义)
 */
export async function getAllSounds(): Promise<Sound[]> {
  const systemSounds = getSystemSounds();
  const customSounds = await getCustomSounds();
  return [...systemSounds, ...customSounds];
}
