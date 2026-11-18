/**
 * 子页面（如铃声选择）向上一页回传结果的简单通道。
 * 子页面 set 后 router.back()，上一页在获得焦点时 consume。
 * 这样不需要 router.replace 重新创建编辑页，也不会丢失编辑中的表单内容。
 */

export interface SoundSelection {
  soundId: string;
  soundName: string;
}

let pendingSound: SoundSelection | null = null;

export function setPendingSound(selection: SoundSelection) {
  pendingSound = selection;
}

export function consumePendingSound(): SoundSelection | null {
  const s = pendingSound;
  pendingSound = null;
  return s;
}
