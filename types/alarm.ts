/**
 * 闹钟数据类型定义
 */

export type RepeatType = 'none' | 'weekly' | 'holiday' | 'custom';

export interface Alarm {
  id: string;
  time: string; // HH:mm 格式
  date?: string; // 特定日期 YYYY-MM-DD (可选)
  label: string; // 闹钟标签
  enabled: boolean; // 是否启用
  repeatType: RepeatType; // 重复类型
  repeatDays?: number[]; // 0-6 表示周日到周六 (用于weekly类型)
  holidayType?: 'all' | 'workday' | 'weekend'; // 节假日类型 (用于holiday类型)
  customInterval?: number; // 自定义间隔天数 (用于custom类型)
  customEndDate?: string; // 自定义结束日期 YYYY-MM-DD (用于custom类型)
  soundId: string; // 铃声ID
  soundName: string; // 铃声名称
  createdAt: string; // ISO 8601 格式
  updatedAt: string; // ISO 8601 格式
}

export interface Sound {
  id: string;
  name: string;
  uri: string; // 铃声文件路径或URL
  isCustom: boolean; // 是否为自定义铃声
}

/**
 * 获取重复规则的描述文本
 */
export function getRepeatDescription(alarm: Alarm): string {
  if (alarm.repeatType === 'none') {
    if (alarm.date) {
      return alarm.date;
    }
    return '仅一次';
  }

  if (alarm.repeatType === 'weekly' && alarm.repeatDays) {
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const selectedDays = alarm.repeatDays.map(day => dayNames[day]);
    
    if (alarm.repeatDays.length === 7) {
      return '每天';
    }
    
    if (alarm.repeatDays.length === 5 && 
        alarm.repeatDays.every(day => day >= 1 && day <= 5)) {
      return '工作日';
    }
    
    if (alarm.repeatDays.length === 2 && 
        alarm.repeatDays.includes(0) && alarm.repeatDays.includes(6)) {
      return '周末';
    }
    
    return selectedDays.join('、');
  }

  if (alarm.repeatType === 'holiday') {
    switch (alarm.holidayType) {
      case 'all':
        return '所有法定节假日';
      case 'workday':
        return '工作日前夜';
      case 'weekend':
        return '周末前夜';
      default:
        return '法定节假日';
    }
  }

  if (alarm.repeatType === 'custom' && alarm.customInterval) {
    return `每${alarm.customInterval}天`;
  }

  return '未设置';
}

/**
 * 格式化时间显示
 */
export function formatTime(time: string): { hour: string; minute: string; period?: string } {
  const [hour, minute] = time.split(':');
  const hourNum = parseInt(hour, 10);
  
  // 24小时制
  return {
    hour: hour,
    minute: minute,
  };
}

/**
 * 创建新闹钟的默认值
 */
export function createDefaultAlarm(): Omit<Alarm, 'id' | 'createdAt' | 'updatedAt'> {
  const now = new Date();
  const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
  nextHour.setMinutes(0);
  nextHour.setSeconds(0);
  
  const time = `${String(nextHour.getHours()).padStart(2, '0')}:${String(nextHour.getMinutes()).padStart(2, '0')}`;
  
  return {
    time,
    label: '',
    enabled: true,
    repeatType: 'none',
    soundId: 'default',
    soundName: '默认铃声',
  };
}
