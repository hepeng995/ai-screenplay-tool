'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { splitChapters, type Chapter } from '@/lib/utils/chapter-splitter';
import type { TemplateType } from '@/lib/ai/templates';
import { toast } from '@/lib/utils/toast';

/** 并发批次大小（与服务端 withConcurrencyLimit MAX_CONCURRENT=3 匹配） */
const BATCH_SIZE = 3;
/** 中间结果的 localStorage key 前缀（按 chapter.id 索引，避免删章错位） */
const PARTIAL_PREFIX = 'partial-yaml-';
/** 转换状态持久化 key 前缀（跨刷新恢复跳过/删除/改名） */
const STATE_PREFIX = 'convert-state-';

/** 单章转换状态 */
export type ChapterStatus = 'pending' | 'converting' | 'success' | 'failed' | 'skipped';

/** 持久化的转换状态（基于 chapter.id，跨刷新恢复） */
interface PersistedState {
  /** 已删除的章节 id */
  removedIds: string[];
  /** 已跳过的章节 id */
  skippedIds: string[];
  /** 用户修改过的章节标题（id → 新标题） */
  titles: Record<string, string>;
}

interface UseChapterConversionReturn {
  chapters: Chapter[];
  splitError: string | null;
  converting: boolean;
  chapterStatuses: ChapterStatus[];
  chapterErrors: (string | null)[];
  resumableCount: number;
  expandedChapter: number | null;
  editingTitle: number | null;
  editTitleValue: string;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  pendingCount: number;
  hasFailures: boolean;
  allDone: boolean;
  hasAnySuccess: boolean;
  setExpandedChapter: (idx: number | null) => void;
  setEditingTitle: (idx: number | null) => void;
  setEditTitleValue: (val: string) => void;
  /** 当前选择的剧本模板 */
  templateId: TemplateType;
  setTemplateId: (id: TemplateType) => void;
  /** 用户自定义转换指令（可选，影响 AI 生成风格/结构） */
  instruction: string;
  setInstruction: (val: string) => void;
  handleConvert: () => Promise<void>;
  handleRetryChapter: (idx: number) => Promise<void>;
  handleSkipChapter: (idx: number) => void;
  handleRemoveChapter: (idx: number) => void;
  handleRenameConfirm: (idx: number) => void;
  handleRenameCancel: () => void;
  handleCancel: () => void;
  /** 按当前章节顺序收集已成功章节的 YAML（用 chapter.id 索引，避免删章错位） */
  getOrderedSuccessYamls: () => string[];
  /** 完成转换后清理所有中间数据 + 持久化状态（用 chapter.id 索引） */
  clearAllPartials: () => void;
}

/** 读取持久化的转换状态 */
function loadPersistedState(fileId: string): PersistedState {
  const empty: PersistedState = { removedIds: [], skippedIds: [], titles: {} };
  if (typeof window === 'undefined') return empty;
  try {
    const raw = localStorage.getItem(`${STATE_PREFIX}${fileId}`);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    return {
      removedIds: Array.isArray(parsed.removedIds) ? parsed.removedIds : [],
      skippedIds: Array.isArray(parsed.skippedIds) ? parsed.skippedIds : [],
      titles: parsed.titles && typeof parsed.titles === 'object' ? parsed.titles : {},
    };
  } catch {
    return empty;
  }
}

/** 写回持久化的转换状态（失败不阻塞主流程） */
function savePersistedState(fileId: string, state: PersistedState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STATE_PREFIX}${fileId}`, JSON.stringify(state));
  } catch {
    // 持久化失败不影响转换流程
  }
}

export function useChapterConversion(fileId: string | null): UseChapterConversionReturn {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [templateId, setTemplateId] = useState<TemplateType>('default');
  const [instruction, setInstruction] = useState('');
  const [splitError, setSplitError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [chapterStatuses, setChapterStatuses] = useState<ChapterStatus[]>([]);
  const [chapterErrors, setChapterErrors] = useState<(string | null)[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const [resumableCount, setResumableCount] = useState(0);
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState<number | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  // 持久化状态引用（删除/跳过/改名实时写入）
  const persistedRef = useRef<PersistedState>({ removedIds: [], skippedIds: [], titles: {} });

  /** 构建某章的 partial-yaml key（按稳定 id） */
  const partialKey = useCallback(
    (chapterId: string) => `${PARTIAL_PREFIX}${fileId}-${chapterId}`,
    [fileId],
  );

  // 从 URL 参数加载已上传的文件文本，并恢复持久化的转换状态
  useEffect(() => {
    if (!fileId) return;
    const text = typeof window === 'undefined' ? null : localStorage.getItem(`novel-${fileId}`);
    if (!text) return;

    const result = splitChapters(text);
    if (!result.success) {
      setSplitError(result.message ?? '切分失败');
      return;
    }

    // 恢复持久化状态：应用删除、标题覆盖
    const persisted = loadPersistedState(fileId);
    persistedRef.current = persisted;

    const visibleChapters = result.chapters
      .filter((ch) => !persisted.removedIds.includes(ch.id))
      .map((ch) => (persisted.titles[ch.id] ? { ...ch, title: persisted.titles[ch.id] } : ch));

    setChapters(visibleChapters);

    // 计算每章状态：有 partial → success；在 skip 列表 → skipped；否则 pending
    const statuses: ChapterStatus[] = visibleChapters.map((ch) => {
      if (localStorage.getItem(`${PARTIAL_PREFIX}${fileId}-${ch.id}`)) return 'success';
      if (persisted.skippedIds.includes(ch.id)) return 'skipped';
      return 'pending';
    });
    setChapterStatuses(statuses);
    setChapterErrors(visibleChapters.map(() => null));

    const successCount = statuses.filter((s) => s === 'success').length;
    if (successCount > 0 && successCount < visibleChapters.length) {
      setResumableCount(successCount);
    }
  }, [fileId]);

  // 组件卸载时中止未完成的请求
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // 转换中防止意外离开页面
  useEffect(() => {
    if (!converting) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [converting]);

  /** 转换单个章节 */
  const convertSingleChapter = useCallback(async (
    chapter: Chapter,
    globalIdx: number,
    signal: AbortSignal,
  ) => {
    setChapterStatuses((prev) => {
      const next = [...prev];
      next[globalIdx] = 'converting';
      return next;
    });

    try {
      const res = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterTitle: chapter.title,
          chapterText: chapter.content,
          templateId,
          instruction,
        }),
        signal,
      });
      const data = await res.json();

      if (data.success && data.yaml) {
        localStorage.setItem(partialKey(chapter.id), data.yaml);
        setChapterStatuses((prev) => {
          const next = [...prev];
          next[globalIdx] = 'success';
          return next;
        });
        setChapterErrors((prev) => {
          const next = [...prev];
          next[globalIdx] = null;
          return next;
        });
      } else {
        throw new Error(data.error ?? `第 ${globalIdx + 1} 章 AI 转换失败`);
      }
    } catch (err) {
      if (signal.aborted) return;
      const msg = err instanceof Error ? err.message : String(err);
      setChapterStatuses((prev) => {
        const next = [...prev];
        next[globalIdx] = 'failed';
        return next;
      });
      setChapterErrors((prev) => {
        const next = [...prev];
        next[globalIdx] = msg;
        return next;
      });
      throw err;
    }
  }, [templateId, instruction, partialKey]);

  /** AI 转换（分批并发 + 持续推进不中断 + 可取消） */
  const handleConvert = useCallback(async () => {
    if (chapters.length === 0 || !fileId) return;
    setConverting(true);
    setResumableCount(0);

    // 转换前提示超长章节（>10000 字会被服务端拒绝，导致该章失败）
    const oversized = chapters.filter(
      (ch, i) =>
        (chapterStatuses[i] === 'pending' || chapterStatuses[i] === 'failed') &&
        ch.content.length > 10000,
    );
    if (oversized.length > 0) {
      toast.info(`检测到 ${oversized.length} 个超长章节（超过 10000 字），可能转换失败，建议拆分后重新上传`);
    }

    const abort = new AbortController();
    abortRef.current = abort;

    const pendingIndices = chapterStatuses
      .map((s, i) => (s === 'pending' || s === 'failed' ? i : -1))
      .filter((i) => i >= 0);

    for (let batchStart = 0; batchStart < pendingIndices.length; batchStart += BATCH_SIZE) {
      if (abort.signal.aborted) break;
      const batchIndices = pendingIndices.slice(batchStart, batchStart + BATCH_SIZE);
      await Promise.allSettled(
        batchIndices.map((globalIdx) =>
          convertSingleChapter(chapters[globalIdx], globalIdx, abort.signal),
        ),
      );
    }

    setConverting(false);
    abortRef.current = null;
  }, [chapters, chapterStatuses, fileId, convertSingleChapter]);

  /** 单独重试某一章 */
  const handleRetryChapter = useCallback(async (idx: number) => {
    if (!fileId) return;
    const ch = chapters[idx];
    if (!ch) return;
    localStorage.removeItem(partialKey(ch.id));
    setConverting(true);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      await convertSingleChapter(ch, idx, abort.signal);
    } catch {
      // convertSingleChapter 内部已处理状态
    }

    setConverting(false);
    abortRef.current = null;
  }, [fileId, chapters, convertSingleChapter, partialKey]);

  /** 跳过某一章（持久化，刷新后保留） */
  const handleSkipChapter = useCallback((idx: number) => {
    const ch = chapters[idx];
    if (!ch) return;
    if (fileId) {
      localStorage.removeItem(partialKey(ch.id));
      const st = persistedRef.current;
      if (!st.skippedIds.includes(ch.id)) st.skippedIds.push(ch.id);
      savePersistedState(fileId, st);
    }
    setChapterStatuses((prev) => {
      const next = [...prev];
      next[idx] = 'skipped';
      return next;
    });
    setChapterErrors((prev) => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
  }, [chapters, fileId, partialKey]);

  /** 删除某一章（持久化，刷新后保留） */
  const handleRemoveChapter = useCallback((idx: number) => {
    const ch = chapters[idx];
    if (!ch) return;
    if (fileId) {
      localStorage.removeItem(partialKey(ch.id));
      const st = persistedRef.current;
      if (!st.removedIds.includes(ch.id)) st.removedIds.push(ch.id);
      st.skippedIds = st.skippedIds.filter((x) => x !== ch.id);
      delete st.titles[ch.id];
      savePersistedState(fileId, st);
    }
    setChapters((prev) => prev.filter((_, i) => i !== idx));
    setChapterStatuses((prev) => prev.filter((_, i) => i !== idx));
    setChapterErrors((prev) => prev.filter((_, i) => i !== idx));
    setExpandedChapter(null);
    setEditingTitle(null);
  }, [chapters, fileId, partialKey]);

  /** 确认编辑章节标题（持久化，刷新后保留） */
  const handleRenameConfirm = useCallback((idx: number) => {
    const trimmed = editTitleValue.trim();
    if (!trimmed) return;
    const ch = chapters[idx];
    setChapters((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, title: trimmed } : c)),
    );
    if (fileId && ch) {
      const st = persistedRef.current;
      st.titles[ch.id] = trimmed;
      savePersistedState(fileId, st);
    }
    setEditingTitle(null);
    setEditTitleValue('');
  }, [editTitleValue, chapters, fileId]);

  /** 取消编辑章节标题 */
  const handleRenameCancel = useCallback(() => {
    setEditingTitle(null);
    setEditTitleValue('');
  }, []);

  /** 取消正在进行的转换 */
  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  /** 按当前章节顺序收集已成功章节的 YAML（用 chapter.id 索引） */
  const getOrderedSuccessYamls = useCallback((): string[] => {
    if (!fileId) return [];
    return chapters
      .map((ch, i) => (chapterStatuses[i] === 'success' ? localStorage.getItem(partialKey(ch.id)) : null))
      .filter((yaml): yaml is string => yaml !== null);
  }, [fileId, chapters, chapterStatuses, partialKey]);

  /** 完成转换后清理所有中间数据与持久化状态（用 chapter.id 索引） */
  const clearAllPartials = useCallback(() => {
    if (!fileId) return;
    for (const ch of chapters) {
      localStorage.removeItem(partialKey(ch.id));
    }
    localStorage.removeItem(`${STATE_PREFIX}${fileId}`);
  }, [fileId, chapters, partialKey]);

  // 统计信息
  const successCount = chapterStatuses.filter((s) => s === 'success').length;
  const failedCount = chapterStatuses.filter((s) => s === 'failed').length;
  const skippedCount = chapterStatuses.filter((s) => s === 'skipped').length;
  const pendingCount = chapterStatuses.filter((s) => s === 'pending' || s === 'converting').length;

  return {
    chapters,
    splitError,
    converting,
    chapterStatuses,
    chapterErrors,
    resumableCount,
    expandedChapter,
    editingTitle,
    editTitleValue,
    successCount,
    failedCount,
    skippedCount,
    pendingCount,
    hasFailures: failedCount > 0,
    allDone: pendingCount === 0 && !converting,
    hasAnySuccess: successCount > 0,
    setExpandedChapter,
    setEditingTitle,
    setEditTitleValue,
    templateId,
    setTemplateId,
    instruction,
    setInstruction,
    handleConvert,
    handleRetryChapter,
    handleSkipChapter,
    handleRemoveChapter,
    handleRenameConfirm,
    handleRenameCancel,
    handleCancel,
    getOrderedSuccessYamls,
    clearAllPartials,
  };
}
