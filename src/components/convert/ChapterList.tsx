'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { FileText, Loader2, CheckCircle2, AlertCircle, SkipForward, ChevronDown, ChevronRight, RefreshCw, Pencil, Check, X, Trash2 } from 'lucide-react';
import type { Chapter } from '@/lib/utils/chapter-splitter';
import type { ChapterStatus } from '@/hooks/useChapterConversion';
import { CHAPTER_TEXT_TRUNCATE_LIMIT } from '@/lib/ai/prompt';

/** 单章转换硬上限（与 /api/convert route 的限制保持一致）：超过会被服务端拒绝 */
const MAX_CONVERT_CHARS = 10000;

/** 章节状态图标映射 */
const STATUS_ICONS: Record<ChapterStatus, { icon: typeof FileText; color: string; label: string }> = {
  pending: { icon: FileText, color: 'text-zinc-300 dark:text-zinc-600', label: '待转换' },
  converting: { icon: Loader2, color: 'text-teal-500 animate-spin', label: '转换中' },
  success: { icon: CheckCircle2, color: 'text-emerald-500', label: '已完成' },
  failed: { icon: AlertCircle, color: 'text-red-500', label: '失败' },
  skipped: { icon: SkipForward, color: 'text-amber-400', label: '已跳过' },
};

interface ChapterListProps {
  chapters: Chapter[];
  chapterStatuses: ChapterStatus[];
  chapterErrors: (string | null)[];
  converting: boolean;
  expandedChapter: number | null;
  editingTitle: number | null;
  editTitleValue: string;
  canRemove: boolean; // chapters.length > 3
  onToggleExpand: (idx: number | null) => void;
  onRenameStart: (idx: number) => void;
  onRenameConfirm: (idx: number) => void;
  onRenameCancel: () => void;
  onEditTitleChange: (val: string) => void;
  onRetry: (idx: number) => void;
  onSkip: (idx: number) => void;
  onRemove: (idx: number) => void;
}

export function ChapterList({
  chapters,
  chapterStatuses,
  chapterErrors,
  converting,
  expandedChapter,
  editingTitle,
  editTitleValue,
  canRemove,
  onToggleExpand,
  onRenameStart,
  onRenameConfirm,
  onRenameCancel,
  onEditTitleChange,
  onRetry,
  onSkip,
  onRemove,
}: ChapterListProps) {
  const reduce = useReducedMotion();

  return (
    <div className="space-y-2">
      {chapters.map((ch, idx) => {
        const isExpanded = expandedChapter === idx;
        const status = chapterStatuses[idx] ?? 'pending';
        const statusInfo = STATUS_ICONS[status];
        const StatusIcon = statusInfo.icon;
        const previewText = ch.content.length > 200
          ? ch.content.slice(0, 200) + '...'
          : ch.content;

        return (
          <div
            key={idx}
            data-testid={`chapter-${idx + 1}`}
            className={`group rounded-lg border transition-all duration-200 overflow-hidden hover:-translate-y-0.5 hover:shadow-sm ${
              status === 'failed' ? 'border-red-200 bg-red-50/30 dark:border-red-900 dark:bg-red-950/10' :
              status === 'success' ? 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-900 dark:bg-emerald-950/10' :
              'border-zinc-200 hover:border-teal-300 dark:border-zinc-700 dark:hover:border-teal-700'
            }`}
          >
            <div className="flex items-center justify-between p-3">
              <button
                type="button"
                className="flex items-center gap-3 min-w-0 flex-1 text-left"
                onClick={() => onToggleExpand(isExpanded ? null : idx)}
              >
                <motion.span
                  animate={reduce ? {} : { rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight className="h-4 w-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
                </motion.span>
                <StatusIcon className={`h-4 w-4 flex-shrink-0 ${statusInfo.color}`} />
                {editingTitle === idx ? (
                  <input
                    type="text"
                    value={editTitleValue}
                    onChange={(e) => onEditTitleChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onRenameConfirm(idx);
                      if (e.key === 'Escape') onRenameCancel();
                    }}
                    autoFocus
                    className="font-medium text-zinc-900 dark:text-zinc-100 bg-transparent border border-teal-300 dark:border-teal-600 rounded-lg px-2 py-0.5 outline-none focus:border-teal-500 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{ch.title}</span>
                )}
                <span className={`text-xs px-1.5 py-0.5 rounded transition-colors duration-200 ${
                  status === 'success' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' :
                  status === 'failed' ? 'bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400' :
                  status === 'skipped' ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400' :
                  status === 'converting' ? 'bg-teal-100 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400' :
                  'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500'
                }`}>
                  {statusInfo.label}
                </span>
              </button>
              <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">{ch.charCount.toLocaleString()} 字</span>
                {ch.charCount > CHAPTER_TEXT_TRUNCATE_LIMIT && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 whitespace-nowrap"
                    title={`本章超长，AI 转换仅处理前 ${CHAPTER_TEXT_TRUNCATE_LIMIT.toLocaleString()} 字`}
                  >
                    ⚠ 超长
                  </span>
                )}
                {/* 失败章节操作按钮 */}
                {status === 'failed' && !converting && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onRetry(idx)}
                      className="p-1 rounded-lg hover:bg-teal-50 text-teal-600 dark:hover:bg-teal-950/20 dark:text-teal-400"
                      title="重试此章"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSkip(idx)}
                      className="p-1 rounded-lg hover:bg-amber-50 text-amber-600 dark:hover:bg-amber-950/20 dark:text-amber-400"
                      title="跳过此章"
                    >
                      <SkipForward className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                {/* 转换前：编辑标题/删除章节 */}
                {editingTitle === idx ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onRenameConfirm(idx); }}
                      className="p-1 rounded-lg hover:bg-emerald-50 text-emerald-600 dark:hover:bg-emerald-950/30 dark:text-emerald-400"
                      title="确认"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onRenameCancel(); }}
                      className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-500 dark:hover:bg-zinc-800 dark:text-zinc-400"
                      title="取消"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : !converting && (status === 'pending' || status === 'failed') ? (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onRenameStart(idx); }}
                      className="p-1 rounded-lg hover:bg-teal-50 text-teal-600 dark:hover:bg-teal-950/20 dark:text-teal-400"
                      title="修改标题"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {canRemove && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onRemove(idx); }}
                        className="p-1 rounded-lg hover:bg-red-50 text-red-600 dark:hover:bg-red-950/30 dark:text-red-400"
                        title="删除此章"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
            {/* 展开/折叠内容区域 - AnimatePresence 驱动 */}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={reduce ? false : { height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3 pt-0 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                    <pre className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap font-sans leading-relaxed">
                      {previewText}
                    </pre>
                    {ch.content.length > 200 && (
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">（共 {ch.charCount.toLocaleString()} 字，仅显示前 200 字）</p>
                    )}
                    {ch.charCount > CHAPTER_TEXT_TRUNCATE_LIMIT && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        ⚠ 本章约 {ch.charCount.toLocaleString()} 字，AI 转换仅处理前 {CHAPTER_TEXT_TRUNCATE_LIMIT.toLocaleString()} 字，超出部分不会进入剧本
                        {ch.charCount > MAX_CONVERT_CHARS ? '；且已超过单次上限（10000 字），可能转换失败，建议拆分本章后重新上传' : '，如需完整请拆分后重新上传'}。
                      </p>
                    )}
                    {chapterErrors[idx] && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-2">错误：{chapterErrors[idx]}</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
