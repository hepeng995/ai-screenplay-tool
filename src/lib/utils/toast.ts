'use client';

// Toast 类型
type ToastType = 'success' | 'error' | 'info';

// Toast 数据结构
export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

// 事件名
const TOAST_EVENT = 'app-toast';

// 自增 ID
let toastId = 0;

/**
 * 触发一个 Toast 通知
 * @param message 消息内容
 * @param type 类型：success / error / info
 * @param duration 显示时长（毫秒），默认 3000
 */
function show(message: string, type: ToastType, duration = 3000): void {
  if (typeof window === 'undefined') return;
  const item: ToastItem = { id: ++toastId, message, type, duration };
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: item }));
}

// 导出 toast API
export const toast = {
  success: (msg: string, duration?: number) => show(msg, 'success', duration),
  error: (msg: string, duration?: number) => show(msg, 'error', duration ?? 5000),
  info: (msg: string, duration?: number) => show(msg, 'info', duration),
};

export { TOAST_EVENT };
