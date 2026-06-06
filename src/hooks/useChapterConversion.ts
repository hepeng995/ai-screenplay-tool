'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { splitChapters, type Chapter } from '@/lib/utils/chapter-splitter';
import type { TemplateType } from '@/lib/ai/templates';
import { toast } from '@/lib/utils/toast';

/** 最大并发请求数（与服务端 AI API 并发能力匹配） */
const MAX_CONCURRENT_REQUESTS = 5;
/** 客户端请求超时（低于服务端 maxDuration=60s，留出 buffer） */
const CLIENT_TIMEOUT_MS = 55_000;
/** 客户端最大重试次数 */
const MAX_CLIENT_RETRIES = 2;
/** 重试退避基数（ms） */
const CLIENT_RETRY_DELAY_MS = 1_000;
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

/**
 * 从 SSE 流中读取完整 AI 响应文本
 * 解析 OpenAI 兼容的 SSE 格式：`data: {"choices":[{"delta":{"content":"..."}}]}`
 */
async function readSSEStream(
  response: Response,
  signal: AbortSignal,
): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';
  let sseBuffer = '';

  try {
    while (true) {
      if (signal.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;

      sseBuffer += decoder.decode(value, { stream: true });

      // 按行分割，最后一行可能不完整
      const lines = sseBuffer.split('\n');
      sseBuffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;

        try {
          const json = JSON.parse(data);
          const content = json?.choices?.[0]?.delta?.content ?? '';
          if (content) accumulated += content;
        } catch {
          // 非法 JSON 行（如心跳），忽略
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return accumulated;
}

/**
 * 从 AI 响应文本中提取 YAML（客户端版本，不依赖服务端模块）
 */
function extractYamlFromResponse(raw: string): string | null {
  const match = raw.match(/```ya?ml\s*\n([\s\S]*?)\n```/i);
  if (match) return match[1].trim();
  const start = raw.indexOf('script:');
  if (start >= 0) return raw.slice(start).trim();
  return null;
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

  /** 转换单个章节（流式 SSE + 客户端超时 + 自动重试） */
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

    let lastErrorMsg = '';

    for (let attempt = 0; attempt <= MAX_CLIENT_RETRIES; attempt++) {
      if (signal.aborted) return;

      try {
        // 客户端超时 + 用户取消信号合并
        const clientSignal = typeof AbortSignal.any === 'function'
          ? AbortSignal.any([AbortSignal.timeout(CLIENT_TIMEOUT_MS), signal])
          : signal;

        // 使用流式模式
        const res = await fetch('/api/convert?stream=true', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chapterTitle: chapter.title,
            chapterText: chapter.content,
            templateId,
            instruction,
          }),
          signal: clientSignal,
        });

        // 服务端在流式启动失败时返回 JSON 错误（非 SSE）
        const contentType = res.headers.get('content-type') ?? '';
        if (!res.ok || !contentType.includes('text/event-stream')) {
          let errorMsg: string;
          try {
            const errData = await res.json();
            errorMsg = errData.error ?? `服务器返回 ${res.status}`;
          } catch {
            errorMsg = res.status === 504
              ? 'AI 转换超时（服务端响应超时），请稍后重试或尝试缩短章节内容'
              : `服务器返回异常状态码 ${res.status}，请稍后重试`;
          }
          throw new Error(errorMsg);
        }

        // 读取 SSE 流，累积完整文本
        const fullText = await readSSEStream(res, signal);

        if (signal.aborted) return;

        // 从累积文本中提取 YAML
        const yaml = extractYamlFromResponse(fullText);
        if (!yaml) {
          throw new Error('无法从 AI 响应中提取 YAML');
        }

        localStorage.setItem(partialKey(chapter.id), yaml);
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
        return; // 转换成功
      } catch (err) {
        if (signal.aborted) return; // 用户取消，不重试
        lastErrorMsg = err instanceof Error ? err.message : String(err);

        if (attempt < MAX_CLIENT_RETRIES) {
          // 等待后重试（指数退避，用户取消时可提前中断）
          await new Promise<void>((resolve) => {
            const timer = setTimeout(resolve, CLIENT_RETRY_DELAY_MS * Math.pow(2, attempt));
            signal.addEventListener('abort', () => {
              clearTimeout(timer);
              resolve();
            }, { once: true });
          });
          if (signal.aborted) return;
          continue;
        }
      }
    }

    // 所有重试用尽，标记为失败
    setChapterStatuses((prev) => {
      const next = [...prev];
      next[globalIdx] = 'failed';
      return next;
    });
    setChapterErrors((prev) => {
      const next = [...prev];
      next[globalIdx] = lastErrorMsg;
      return next;
    });
    throw new Error(lastErrorMsg);
  }, [templateId, instruction, partialKey]);

  /** AI 转换（滑动窗口并发 + 可取消） */
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

    if (pendingIndices.length === 0) {
      setConverting(false);
      return;
    }

    // 滑动窗口并发：当某个请求完成后，立即启动下一个待处理请求
    // 比固定批次更高效——快请求不会被慢请求阻塞
    let nextIdx = 0;

    const worker = async () => {
      while (!abort.signal.aborted) {
        // 同步取下一个索引（JS 单线程，无竞态）
        const idx = nextIdx;
        nextIdx++;
        if (idx >= pendingIndices.length) break;

        const globalIdx = pendingIndices[idx];
        try {
          await convertSingleChapter(chapters[globalIdx], globalIdx, abort.signal);
        } catch {
          // convertSingleChapter 内部已处理状态更新和重试
        }
      }
    };

    const workerCount = Math.min(MAX_CONCURRENT_REQUESTS, pendingIndices.length);
    await Promise.allSettled(
      Array.from({ length: workerCount }, () => worker()),
    );

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
