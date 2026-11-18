/**
 * 闹钟表读写
 */

import type { Alarm, AlarmInput } from '../../types/alarm';
import { parseRule } from '../../types/alarm';
import { isValidDateKey, isValidTime } from '../date-utils';
import type { SqlDb, SqlParam } from './types';

interface AlarmRow {
  id: string;
  time: string;
  label: string;
  enabled: number;
  rule: string;
  start_date: string | null;
  end_date: string | null;
  sound_id: string;
  sound_name: string;
  created_at: string;
  updated_at: string;
}

function fromRow(row: AlarmRow): Alarm | null {
  const rule = parseRule(row.rule);
  if (!rule || !isValidTime(row.time)) return null;
  return {
    id: row.id,
    time: row.time,
    label: row.label,
    enabled: row.enabled === 1,
    rule,
    startDate: isValidDateKey(row.start_date) ? row.start_date : undefined,
    endDate: isValidDateKey(row.end_date) ? row.end_date : undefined,
    soundId: row.sound_id,
    soundName: row.sound_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function listAlarms(db: SqlDb): Promise<Alarm[]> {
  const rows = await db.all<AlarmRow>('SELECT * FROM alarms ORDER BY created_at DESC, id DESC');
  return rows.map(fromRow).filter((a): a is Alarm => a !== null);
}

export async function getAlarm(db: SqlDb, id: string): Promise<Alarm | null> {
  const row = await db.first<AlarmRow>('SELECT * FROM alarms WHERE id = ?', [id]);
  return row ? fromRow(row) : null;
}

export async function insertAlarm(db: SqlDb, input: AlarmInput, now = new Date()): Promise<Alarm> {
  const ts = now.toISOString();
  const alarm: Alarm = { ...input, id: newId(), createdAt: ts, updatedAt: ts };
  await db.run(
    `INSERT INTO alarms (id, time, label, enabled, rule, start_date, end_date, sound_id, sound_name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      alarm.id,
      alarm.time,
      alarm.label,
      alarm.enabled ? 1 : 0,
      JSON.stringify(alarm.rule),
      alarm.startDate ?? null,
      alarm.endDate ?? null,
      alarm.soundId,
      alarm.soundName,
      alarm.createdAt,
      alarm.updatedAt,
    ],
  );
  return alarm;
}

const COLUMN: Record<keyof AlarmInput, string> = {
  time: 'time',
  label: 'label',
  enabled: 'enabled',
  rule: 'rule',
  startDate: 'start_date',
  endDate: 'end_date',
  soundId: 'sound_id',
  soundName: 'sound_name',
};

function toParam(key: keyof AlarmInput, value: unknown): SqlParam {
  if (value === undefined || value === null) return null;
  if (key === 'enabled') return value ? 1 : 0;
  if (key === 'rule') return JSON.stringify(value);
  return value as string;
}

/**
 * 更新部分字段。changes 中显式给出 undefined 的 startDate/endDate 会被清空
 */
export async function updateAlarm(
  db: SqlDb,
  id: string,
  changes: Partial<AlarmInput>,
  now = new Date(),
): Promise<boolean> {
  const keys = (Object.keys(changes) as (keyof AlarmInput)[]).filter((k) => k in COLUMN);
  const sets = keys.map((k) => `${COLUMN[k]} = ?`);
  const params = keys.map((k) => toParam(k, changes[k]));
  sets.push('updated_at = ?');
  params.push(now.toISOString());
  const { changes: n } = await db.run(`UPDATE alarms SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
  return n > 0;
}

export async function setAlarmsEnabled(db: SqlDb, ids: string[], enabled: boolean, now = new Date()): Promise<void> {
  if (!ids.length) return;
  await db.run(
    `UPDATE alarms SET enabled = ?, updated_at = ? WHERE id IN (${ids.map(() => '?').join(', ')})`,
    [enabled ? 1 : 0, now.toISOString(), ...ids],
  );
}

export async function deleteAlarm(db: SqlDb, id: string): Promise<boolean> {
  const { changes } = await db.run('DELETE FROM alarms WHERE id = ?', [id]);
  return changes > 0;
}
