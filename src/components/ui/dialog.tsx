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

  // 确认按钮样式：danger 红色，default 主色 indigo
  const confirmClass =
    variant === 'danger'
      ? 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500'
      : 'bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-500';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* 居中卡片 */}
      <div
        className={cn(
          'relative z-10 w-full max-w-md mx-4 rounded-xl border border-slate-200 bg-white shadow-lg',
          'animate-in fade-in zoom-in-95 duration-150',
        )}
      >
        <div className="p-6">
          <h2
            id="dialog-title"
            className="text-lg font-semibold text-slate-900"
          >
            {title}
          </h2>
          {description && (
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
              'h-9 px-4 border border-slate-300 bg-white text-slate-700 hover:bg-slate-100',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2',
            )}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
              'h-9 px-4',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
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
