'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import type { ToastItem } from '@/lib/utils/toast';
import { TOAST_EVENT } from '@/lib/utils/toast';

// 单个 Toast 样式映射
const toastStyles: Record<ToastItem['type'], { bg: string; icon: typeof CheckCircle2; iconColor: string }> = {
  success: { bg: 'bg-green-50 border-green-200', icon: CheckCircle2, iconColor: 'text-green-600' },
  error: { bg: 'bg-red-50 border-red-200', icon: XCircle, iconColor: 'text-red-600' },
  info: { bg: 'bg-blue-50 border-blue-200', icon: Info, iconColor: 'text-blue-600' },
};

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
      className={`flex items-start gap-2 rounded-lg border px-4 py-3 shadow-md min-w-[280px] max-w-[400px] ${style.bg}`}
    >
      <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${style.iconColor}`} />
      <p className="flex-1 text-sm text-slate-800">{item.message}</p>
      <button
        onClick={() => onDismiss(item.id)}
        className="text-slate-400 hover:text-slate-600 flex-shrink-0"
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
      setToasts((prev) => [...prev, item]);
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
