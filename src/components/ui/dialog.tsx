'use client';

import { useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * 确认弹窗组件 Props
 */
export interface DialogProps {
  /** 是否显示 */
  open: boolean;
  /** 标题 */
  title: string;
  /** 描述（可选） */
  description?: string;
  /** 确认回调 */
  onConfirm: () => void;
  /** 取消/关闭回调 */
  onCancel: () => void;
  /** 确认按钮文字，默认「确认」 */
  confirmText?: string;
  /** 取消按钮文字，默认「取消」 */
  cancelText?: string;
  /** 风格变体：danger 时确认按钮为红色，用于删除等危险操作 */
  variant?: 'danger' | 'default';
}

/**
 * 轻量级确认弹窗（不依赖第三方库）
 * - ESC 键关闭
 * - 点击遮罩关闭
 * - danger variant 用于删除等危险操作（红色确认按钮）
 */
export function Dialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'default',
}: DialogProps) {
  // ESC 键关闭
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    },
    [onCancel],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    // 禁止 body 滚动
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  // 确认按钮样式：danger 红色，default 主色 teal
  const confirmClass =
    variant === 'danger'
      ? 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500'
      : 'bg-teal-600 text-white hover:bg-teal-700 focus-visible:ring-teal-500 dark:bg-teal-500 dark:hover:bg-teal-400';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* 居中卡片 */}
      <div
        className={cn(
          'relative z-10 w-full max-w-md mx-4 rounded-xl border border-zinc-200 bg-white shadow-lg',
          'dark:border-zinc-700 dark:bg-zinc-900',
          'animate-in fade-in zoom-in-95 duration-150',
        )}
      >
        <div className="p-6">
          <h2
            id="dialog-title"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
          >
            {title}
          </h2>
          {description && (
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 rounded-b-xl dark:border-zinc-800 dark:bg-zinc-800/50">
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200',
              'h-9 px-4 border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100',
              'dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900',
            )}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200',
              'h-9 px-4 active:scale-[0.98]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900',
              confirmClass,
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
