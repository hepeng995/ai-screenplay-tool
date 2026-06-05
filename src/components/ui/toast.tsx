'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import type { ToastItem } from '@/lib/utils/toast';
import { TOAST_EVENT } from '@/lib/utils/toast';

// 单个 Toast 样式映射
const toastStyles: Record<ToastItem['type'], { bg: string; icon: typeof CheckCircle2; iconColor: string }> = {
  success: { bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800', icon: CheckCircle2, iconColor: 'text-emerald-600 dark:text-emerald-400' },
  error: { bg: 'bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-800', icon: XCircle, iconColor: 'text-red-600 dark:text-red-400' },
  info: { bg: 'bg-sky-50 border-sky-200 dark:bg-sky-950/50 dark:border-sky-800', icon: Info, iconColor: 'text-sky-600 dark:text-sky-400' },
};

// 最多保留的 Toast 数量，防止连续触发时 DOM 堆积
const MAX_TOASTS = 5;

// 单个 Toast 条目
function ToastEntry({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const style = toastStyles[item.type];
  const Icon = style.icon;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(item.id), item.duration);
    return () => clearTimeout(timer);
  }, [item.id, item.duration, onDismiss]);

  return (
    <div
      data-testid={`toast-${item.type}`}
      className={`flex items-start gap-2 rounded-lg border px-4 py-3 shadow-md min-w-[280px] max-w-[400px] backdrop-blur-sm ${style.bg}`}
    >
      <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${style.iconColor}`} />
      <p className="flex-1 text-sm text-zinc-800 dark:text-zinc-200">{item.message}</p>
      <button
        onClick={() => onDismiss(item.id)}
        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 flex-shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// Toast 容器（挂载在根布局中）
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const item = (e as CustomEvent<ToastItem>).detail;
      // 最多保留 MAX_TOASTS 条 toast，防止连续触发时 DOM 堆积
      setToasts((prev) => [...prev, item].slice(-MAX_TOASTS));
    };
    window.addEventListener(TOAST_EVENT, handler);
    return () => window.removeEventListener(TOAST_EVENT, handler);
  }, []);

  const dismiss = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div
      data-testid="toast-container"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2"
    >
      {toasts.map((item) => (
        <ToastEntry key={item.id} item={item} onDismiss={dismiss} />
      ))}
    </div>
  );
}
