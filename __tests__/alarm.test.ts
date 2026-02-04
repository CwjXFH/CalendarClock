/**
 * 闹钟功能单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Alarm } from '../types/alarm';
import { getRepeatDescription, formatTime, createDefaultAlarm } from '../types/alarm';

describe('Alarm Utils', () => {
  describe('getRepeatDescription', () => {
    it('should return "仅一次" for non-repeating alarm without date', () => {
      const alarm: Alarm = {
        id: '1',
        time: '08:00',
        label: 'Test',
        enabled: true,
        repeatType: 'none',
        soundId: 'default',
        soundName: '默认铃声',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(getRepeatDescription(alarm)).toBe('仅一次');
    });

    it('should return date for non-repeating alarm with date', () => {
      const alarm: Alarm = {
        id: '1',
        time: '08:00',
        date: '2026-02-05',
        label: 'Test',
        enabled: true,
        repeatType: 'none',
        soundId: 'default',
        soundName: '默认铃声',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(getRepeatDescription(alarm)).toBe('2026-02-05');
    });

    it('should return "每天" for all weekdays', () => {
      const alarm: Alarm = {
        id: '1',
        time: '08:00',
        label: 'Test',
        enabled: true,
        repeatType: 'weekly',
        repeatDays: [0, 1, 2, 3, 4, 5, 6],
        soundId: 'default',
        soundName: '默认铃声',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(getRepeatDescription(alarm)).toBe('每天');
    });

    it('should return "工作日" for weekdays only', () => {
      const alarm: Alarm = {
        id: '1',
        time: '08:00',
        label: 'Test',
        enabled: true,
        repeatType: 'weekly',
        repeatDays: [1, 2, 3, 4, 5],
        soundId: 'default',
        soundName: '默认铃声',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(getRepeatDescription(alarm)).toBe('工作日');
    });

    it('should return "周末" for weekend only', () => {
      const alarm: Alarm = {
        id: '1',
        time: '08:00',
        label: 'Test',
        enabled: true,
        repeatType: 'weekly',
        repeatDays: [0, 6],
        soundId: 'default',
        soundName: '默认铃声',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(getRepeatDescription(alarm)).toBe('周末');
    });

    it('should return specific days for custom weekly repeat', () => {
      const alarm: Alarm = {
        id: '1',
        time: '08:00',
        label: 'Test',
        enabled: true,
        repeatType: 'weekly',
        repeatDays: [1, 3, 5],
        soundId: 'default',
        soundName: '默认铃声',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(getRepeatDescription(alarm)).toBe('周一、周三、周五');
    });

    it('should return holiday description', () => {
      const alarm: Alarm = {
        id: '1',
        time: '08:00',
        label: 'Test',
        enabled: true,
        repeatType: 'holiday',
        holidayType: 'all',
        soundId: 'default',
        soundName: '默认铃声',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(getRepeatDescription(alarm)).toBe('所有法定节假日');
    });
  });

  describe('formatTime', () => {
    it('should format time correctly', () => {
      const result = formatTime('08:30');
      expect(result.hour).toBe('08');
      expect(result.minute).toBe('30');
    });

    it('should handle midnight', () => {
      const result = formatTime('00:00');
      expect(result.hour).toBe('00');
      expect(result.minute).toBe('00');
    });

    it('should handle noon', () => {
      const result = formatTime('12:00');
      expect(result.hour).toBe('12');
      expect(result.minute).toBe('00');
    });
  });

  describe('createDefaultAlarm', () => {
    it('should create default alarm with next hour', () => {
      const alarm = createDefaultAlarm();
      expect(alarm.time).toMatch(/^\d{2}:\d{2}$/);
      expect(alarm.label).toBe('');
      expect(alarm.enabled).toBe(true);
      expect(alarm.repeatType).toBe('none');
      expect(alarm.soundId).toBe('default');
      expect(alarm.soundName).toBe('默认铃声');
    });

    it('should have valid time format', () => {
      const alarm = createDefaultAlarm();
      const [hour, minute] = alarm.time.split(':').map(Number);
      expect(hour).toBeGreaterThanOrEqual(0);
      expect(hour).toBeLessThan(24);
      expect(minute).toBeGreaterThanOrEqual(0);
      expect(minute).toBeLessThan(60);
    });
  });
});
