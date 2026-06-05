'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, FileText, Loader2, CheckCircle2, AlertCircle, Upload, XCircle, ChevronDown, ChevronRight, RefreshCw, SkipForward, ArrowRight, Trash2, Pencil, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUploader } from '@/components/upload/FileUploader';
import { splitChapters, type Chapter } from '@/lib/utils/chapter-splitter';
import { loadNovelText, saveYamlContent, saveProject, loadProject } from '@/lib/utils/storage';
import { mergeYamlChapters } from '@/lib/utils/yaml-merger';

/** 并发批次大小（与服务端 withConcurrencyLimit MAX_CONCURRENT=3 匹配） */
const BATCH_SIZE = 3;
/** 中间结果的 localStorage key 前缀 */
const PARTIAL_PREFIX = 'partial-yaml-';

/** 单章转换状态 */
type ChapterStatus = 'pending' | 'converting' | 'success' | 'failed' | 'skipped';

/** 章节状态图标映射 */
const STATUS_ICONS: Record<ChapterStatus, { icon: typeof FileText; color: string; label: string }> = {
  pending: { icon: FileText, color: 'text-zinc-300 dark:text-zinc-600', label: '待转换' },
  converting: { icon: Loader2, color: 'text-teal-500 animate-spin', label: '转换中' },
  success: { icon: CheckCircle2, color: 'text-emerald-500', label: '已完成' },
  failed: { icon: AlertCircle, color: 'text-red-500', label: '失败' },
  skipped: { icon: SkipForward, color: 'text-amber-400', label: '已跳过' },
};

function ConvertContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileId = searchParams.get('fileId');

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [splitError, setSplitError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  // 每章独立状态
  const [chapterStatuses, setChapterStatuses] = useState<ChapterStatus[]>([]);
  const [chapterErrors, setChapterErrors] = useState<(string | null)[]>([]);
  // 取消控制
  const abortRef = useRef<AbortController | null>(null);
  // 断点续转提示
  const [resumableCount, setResumableCount] = useState(0);
  // 章节预览展开状态
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);
  // 章节标题编辑状态
  const [editingTitle, setEditingTitle] = useState<number | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');

  // 从 URL 参数加载已上传的文件文本
  useEffect(() => {
    if (!fileId) return;
    const text = loadNovelText(fileId);
    if (text) {
      const result = splitChapters(text);
      if (result.success) {
        setChapters(result.chapters);
        // 根据已有的 partial YAML 初始化章节状态
        const statuses: ChapterStatus[] = result.chapters.map((_, idx) =>
          localStorage.getItem(`${PARTIAL_PREFIX}${fileId}-${idx}`) ? 'success' : 'pending',
        );
        setChapterStatuses(statuses);
        setChapterErrors(result.chapters.map(() => null));
        // 检测是否有未完成的断点数据
        const successCount = statuses.filter((s) => s === 'success').length;
        if (successCount > 0 && successCount < result.chapters.length) {
          setResumableCount(successCount);
        }
      } else {
        setSplitError(result.message ?? '切分失败');
      }
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

  /** 清除指定项目的所有中间 YAML 数据（基于实际章节数） */
  const clearPartialYamls = (projectId: string, count: number) => {
    for (let i = 0; i < count; i++) {
      localStorage.removeItem(`${PARTIAL_PREFIX}${projectId}-${i}`);
    }
  };

  /** 收集已保存的中间 YAML 数据 */
  const collectPartialYamls = (projectId: string, count: number): string[] => {
    const yamls: string[] = [];
    for (let i = 0; i < count; i++) {
      const yaml = localStorage.getItem(`${PARTIAL_PREFIX}${projectId}-${i}`);
      if (yaml) yamls.push(yaml);
    }
    return yamls;
  };

  /** 转换单个章节（供批量转换和单独重试复用） */
  const convertSingleChapter = async (
    chapter: Chapter,
    globalIdx: number,
    signal: AbortSignal,
  ): Promise<void> => {
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
        }),
        signal,
      });
      const data = await res.json();

      if (data.success && data.yaml) {
        localStorage.setItem(`${PARTIAL_PREFIX}${fileId}-${globalIdx}`, data.yaml);
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
      if (signal.aborted) return; // 取消不算失败
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
      throw err; // 向上抛出以便批量处理感知
    }
  };

  // AI 转换（分批并发 + 持续推进不中断 + 可取消）
  const handleConvert = async () => {
    if (chapters.length === 0 || !fileId) return;
    setConverting(true);
    setResumableCount(0);

    const abort = new AbortController();
    abortRef.current = abort;

    // 找出所有需要转换的章节（pending + failed）
    const pendingIndices = chapterStatuses
      .map((s, i) => (s === 'pending' || s === 'failed' ? i : -1))
      .filter((i) => i >= 0);

    // 分批并发处理，不再因单章失败而中断
    for (let batchStart = 0; batchStart < pendingIndices.length; batchStart += BATCH_SIZE) {
      if (abort.signal.aborted) break;

      const batchIndices = pendingIndices.slice(batchStart, batchStart + BATCH_SIZE);

      // 每章独立处理，失败不阻断同批次其他章节
      await Promise.allSettled(
        batchIndices.map((globalIdx) =>
          convertSingleChapter(chapters[globalIdx], globalIdx, abort.signal),
        ),
      );
    }

    setConverting(false);
    abortRef.current = null;
  };

  /** 单独重试某一章 */
  const handleRetryChapter = async (idx: number) => {
    if (!fileId) return;
    // 清除该章旧的 partial 数据
    localStorage.removeItem(`${PARTIAL_PREFIX}${fileId}-${idx}`);
    setConverting(true);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      await convertSingleChapter(chapters[idx], idx, abort.signal);
    } catch {
      // convertSingleChapter 内部已处理状态
    }

    setConverting(false);
    abortRef.current = null;
  };

  /** 跳过某一章 */
  const handleSkipChapter = (idx: number) => {
    // 清除该章的 partial 数据
    if (fileId) {
      localStorage.removeItem(`${PARTIAL_PREFIX}${fileId}-${idx}`);
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
  };

  /** 删除某一章（仅限转换前） */
  const handleRemoveChapter = (idx: number) => {
    setChapters((prev) => prev.filter((_, i) => i !== idx));
    setChapterStatuses((prev) => prev.filter((_, i) => i !== idx));
    setChapterErrors((prev) => prev.filter((_, i) => i !== idx));
    // 清除该章的 partial 数据
    if (fileId) {
      localStorage.removeItem(`${PARTIAL_PREFIX}${fileId}-${idx}`);
    }
    setExpandedChapter(null);
    setEditingTitle(null);
  };

  /** 开始编辑章节标题 */
  const handleRenameStart = (idx: number) => {
    setEditingTitle(idx);
    setEditTitleValue(chapters[idx].title);
  };

  /** 确认编辑章节标题 */
  const handleRenameConfirm = (idx: number) => {
    const trimmed = editTitleValue.trim();
    if (!trimmed) return;
    setChapters((prev) =>
      prev.map((ch, i) => (i === idx ? { ...ch, title: trimmed } : ch)),
    );
    setEditingTitle(null);
    setEditTitleValue('');
  };

  /** 取消编辑章节标题 */
  const handleRenameCancel = () => {
    setEditingTitle(null);
    setEditTitleValue('');
  };

  /** 完成转换：合并所有已成功的章节 */
  const handleFinish = () => {
    if (!fileId) return;
    const successYamls = chapterStatuses
      .map((s, i) => (s === 'success' ? localStorage.getItem(`${PARTIAL_PREFIX}${fileId}-${i}`) : null))
      .filter((yaml): yaml is string => yaml !== null);

    if (successYamls.length === 0) return;

    const mergedYaml = mergeYamlChapters(successYamls);
    saveYamlContent(fileId, mergedYaml);
    const project = loadProject(fileId);
    if (project) {
      project.status = 'converted';
      project.chapterCount = successYamls.length;
      saveProject(project);
    }
    clearPartialYamls(fileId, chapters.length);
    router.push(`/editor?id=${fileId}`);
  };

  /** 取消正在进行的转换 */
  const handleCancel = () => {
    abortRef.current?.abort();
  };

  /** 统计信息 */
  const successCount = chapterStatuses.filter((s) => s === 'success').length;
  const failedCount = chapterStatuses.filter((s) => s === 'failed').length;
  const skippedCount = chapterStatuses.filter((s) => s === 'skipped').length;
  const pendingCount = chapterStatuses.filter((s) => s === 'pending' || s === 'converting').length;
  const hasFailures = failedCount > 0;
  const allDone = pendingCount === 0 && !converting;
  const hasAnySuccess = successCount > 0;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {/* 面包屑 */}
      <nav className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/" className="hover:text-teal-600 dark:hover:text-teal-400">首页</Link>
        <span className="mx-1.5">/</span>
        <span className="text-zinc-900 dark:text-zinc-100 font-medium">上传与转换</span>
      </nav>
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">上传与转换</h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8">上传小说文本，自动切分章节并调用 AI 转换为 YAML 剧本</p>

      {/* 步骤 1：上传 */}
      {!fileId && <FileUploader />}

      {/* 步骤 2：章节切分 */}
      {fileId && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>步骤 2：章节切分预览</CardTitle>
            <CardDescription>
              {splitError
                ? '未能自动识别章节'
                : `识别到 ${chapters.length} 个章节`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {splitError ? (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span>{splitError}</span>
              </div>
            ) : (
              <div className="space-y-2">
                {chapters.map((ch, idx) => {
                  const isExpanded = expandedChapter === idx;
                  const status = chapterStatuses[idx] ?? 'pending';
                  const statusInfo = STATUS_ICONS[status];
                  const StatusIcon = statusInfo.icon;
                  // 预览内容：取前 200 字，超出则截断
                  const previewText = ch.content.length > 200
                    ? ch.content.slice(0, 200) + '...'
                    : ch.content;
                  return (
                    <div
                      key={idx}
                      data-testid={`chapter-${idx + 1}`}
                      className={`group rounded-lg border transition-all duration-200 overflow-hidden ${
                        status === 'failed' ? 'border-red-200 bg-red-50/30 dark:border-red-900 dark:bg-red-950/10' :
                        status === 'success' ? 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-900 dark:bg-emerald-950/10' :
                        'border-zinc-200 hover:border-teal-300 dark:border-zinc-700 dark:hover:border-teal-700'
                      }`}
                    >
                      <div className="flex items-center justify-between p-3">
                        <button
                          type="button"
                          className="flex items-center gap-3 min-w-0 flex-1 text-left"
                          onClick={() => setExpandedChapter(isExpanded ? null : idx)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
                          )}
                          <StatusIcon className={`h-4 w-4 flex-shrink-0 ${statusInfo.color}`} />
                          {editingTitle === idx ? (
                            <input
                              type="text"
                              value={editTitleValue}
                              onChange={(e) => setEditTitleValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameConfirm(idx);
                                if (e.key === 'Escape') handleRenameCancel();
                              }}
                              autoFocus
                              className="font-medium text-zinc-900 dark:text-zinc-100 bg-transparent border border-teal-300 dark:border-teal-600 rounded-lg px-2 py-0.5 outline-none focus:border-teal-500 text-sm"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{ch.title}</span>
                          )}
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
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
                          {/* 失败章节操作按钮 */}
                          {status === 'failed' && !converting && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleRetryChapter(idx)}
                                className="p-1 rounded-lg hover:bg-teal-50 text-teal-600 dark:hover:bg-teal-950/20 dark:text-teal-400"
                                title="重试此章"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSkipChapter(idx)}
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
                                onClick={(e) => { e.stopPropagation(); handleRenameConfirm(idx); }}
                                className="p-1 rounded-lg hover:bg-emerald-50 text-emerald-600 dark:hover:bg-emerald-950/30 dark:text-emerald-400"
                                title="确认"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleRenameCancel(); }}
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
                                onClick={(e) => { e.stopPropagation(); handleRenameStart(idx); }}
                                className="p-1 rounded-lg hover:bg-teal-50 text-teal-600 dark:hover:bg-teal-950/20 dark:text-teal-400"
                                title="修改标题"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              {chapters.length > 3 && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleRemoveChapter(idx); }}
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
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-0 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                          <pre className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap font-sans leading-relaxed">
                            {previewText}
                          </pre>
                          {ch.content.length > 200 && (
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">（共 {ch.charCount.toLocaleString()} 字，仅显示前 200 字）</p>
                          )}
                          {/* 显示该章的错误信息 */}
                          {chapterErrors[idx] && (
                            <p className="text-xs text-red-500 dark:text-red-400 mt-2">错误：{chapterErrors[idx]}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 步骤 3：AI 转换 */}
      {fileId && chapters.length > 0 && !splitError && (
        <Card>
          <CardHeader>
            <CardTitle>步骤 3：AI 转换</CardTitle>
            <CardDescription>
              将 {chapters.length} 个章节发送给 AI 转换为 YAML 剧本（每章约 30-90 秒）
              {hasAnySuccess && ` — 已完成 ${successCount} / ${chapters.length} 章`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 断点续转提示 */}
            {resumableCount > 0 && !converting && !hasFailures && !allDone && (
              <div className="mb-4 rounded-lg bg-sky-50 border border-sky-200 p-3 flex items-center justify-between dark:bg-sky-950/20 dark:border-sky-800">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-sky-600 dark:text-sky-400 flex-shrink-0" />
                  <span className="text-sm text-sky-700 dark:text-sky-300">
                    检测到上次未完成的转换任务（已完成 {resumableCount}/{chapters.length} 章），点击「开始 AI 转换」将从断点继续
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setResumableCount(0)}
                  className="text-xs text-sky-500 hover:text-sky-700 dark:text-sky-500 dark:hover:text-sky-300 ml-2 flex-shrink-0"
                >
                  忽略
                </button>
              </div>
            )}

            {/* 转换中：进度条 */}
            {converting ? (
              <div className="text-center py-6">
                <Loader2 className="mx-auto h-8 w-8 text-teal-600 dark:text-teal-400 animate-spin mb-3" />
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  正在转换... {successCount} / {chapters.length} 章完成
                  {failedCount > 0 && `，${failedCount} 章失败`}
                </p>
                <div className="mt-4 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-teal-600 dark:bg-teal-400 h-full transition-all duration-300"
                    style={{
                      width: `${((successCount + failedCount + skippedCount) / chapters.length) * 100}%`,
                    }}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={handleCancel} className="mt-4 gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30">
                  <XCircle className="h-4 w-4" />
                  取消转换
                </Button>
              </div>
            ) : allDone && hasAnySuccess ? (
              /* 全部处理完毕且有成功数据 → 完成合并 */
              <div className="text-center space-y-3">
                {hasFailures && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    {failedCount} 章转换失败（已跳过），将使用剩余 {successCount} 章合并
                  </p>
                )}
                {skippedCount > 0 && (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">
                    已跳过 {skippedCount} 章
                  </p>
                )}
                <Button size="lg" onClick={handleFinish} className="gap-2">
                  <ArrowRight className="h-4 w-4" />
                  完成转换（{successCount} 章）
                </Button>
              </div>
            ) : hasFailures && !converting ? (
              /* 有失败但未全部完成 → 提供重试/跳过/完成选项 */
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>部分章节转换失败（{failedCount} 章失败，{successCount} 章成功）</span>
                </div>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  可以在上方章节列表中单独重试或跳过失败章节，也可以直接完成已有章节
                </p>
                <div className="flex gap-2">
                  <Button onClick={handleConvert} variant="outline" className="gap-1.5">
                    <RefreshCw className="h-4 w-4" />
                    重试失败章节
                  </Button>
                  {hasAnySuccess && (
                    <Button onClick={handleFinish} variant="default" className="gap-1.5">
                      <ArrowRight className="h-4 w-4" />
                      跳过失败，完成转换
                    </Button>
                  )}
                </div>
              </div>
            ) : allDone && !hasAnySuccess ? (
              /* 全部失败或跳过，无成功数据 */
              <div className="text-center space-y-3">
                <p className="text-sm text-red-600 dark:text-red-400">
                  所有章节转换均失败，无法生成剧本
                </p>
                <Button onClick={handleConvert} variant="outline" className="gap-1.5">
                  <RefreshCw className="h-4 w-4" />
                  全部重试
                </Button>
              </div>
            ) : (
              /* 初始状态 */
              <div className="text-center">
                <Button size="lg" onClick={handleConvert} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  开始 AI 转换
                </Button>
                <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
                  预计耗时约 {Math.ceil(chapters.length * 30)}-{Math.ceil(chapters.length * 90)} 秒
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ConvertPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-4xl px-6 py-12 text-zinc-500 dark:text-zinc-400">加载中...</div>}>
      <ConvertContent />
    </Suspense>
  );
}
