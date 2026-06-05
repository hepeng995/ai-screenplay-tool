'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, FileText, Loader2, CheckCircle2, AlertCircle, Upload, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
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

function ConvertContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileId = searchParams.get('fileId');

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [splitError, setSplitError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [convertProgress, setConvertProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [convertError, setConvertError] = useState<string | null>(null);
  // 取消控制
  const abortRef = useRef<AbortController | null>(null);
  // 章节预览展开状态
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);

  // 从 URL 参数加载已上传的文件文本
  useEffect(() => {
    if (!fileId) return;
    const text = loadNovelText(fileId);
    if (text) {
      const result = splitChapters(text);
      if (result.success) {
        setChapters(result.chapters);
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

  /** 清除指定项目的所有中间 YAML 数据 */
  const clearPartialYamls = (projectId: string) => {
    for (let i = 0; i < 100; i++) {
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

  // AI 转换（分批并发 + 断点续转 + 可取消）
  const handleConvert = async () => {
    if (chapters.length === 0 || !fileId) return;
    setConverting(true);
    setConvertError(null);

    const abort = new AbortController();
    abortRef.current = abort;

    // 检查是否有断点续传的中间数据
    const existingYamls = collectPartialYamls(fileId, chapters.length);
    const startIndex = existingYamls.length;

    if (startIndex > 0) {
      setConvertProgress({ done: startIndex, total: chapters.length });
    } else {
      setConvertProgress({ done: 0, total: chapters.length });
    }

    // 分批并发处理
    for (let batchStart = startIndex; batchStart < chapters.length; batchStart += BATCH_SIZE) {
      if (abort.signal.aborted) break;

      const batchEnd = Math.min(batchStart + BATCH_SIZE, chapters.length);
      const batch = chapters.slice(batchStart, batchEnd);

      const results = await Promise.allSettled(
        batch.map(async (chapter, batchIdx) => {
          const globalIdx = batchStart + batchIdx;
          const res = await fetch('/api/convert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chapterTitle: chapter.title,
              chapterText: chapter.content,
            }),
            signal: abort.signal,
          });
          const data = await res.json();

          if (data.success && data.yaml) {
            // 每章成功后立即持久化到 localStorage（断点续转保障）
            localStorage.setItem(`${PARTIAL_PREFIX}${fileId}-${globalIdx}`, data.yaml);
            return data.yaml;
          }
          throw new Error(data.error ?? `第 ${globalIdx + 1} 章 AI 转换失败`);
        }),
      );

      // 处理本批结果
      let batchFailed = false;
      for (const result of results) {
        if (result.status === 'rejected') {
          // 取消导致的不算失败
          if (abort.signal.aborted) break;
          setConvertError(result.reason instanceof Error ? result.reason.message : String(result.reason));
          batchFailed = true;
          break;
        }
      }

      if (batchFailed || abort.signal.aborted) break;

      setConvertProgress({ done: batchEnd, total: chapters.length });
    }

    // 转换完成（非取消状态）
    if (!abort.signal.aborted) {
      const allYamls = collectPartialYamls(fileId, chapters.length);

      if (allYamls.length === chapters.length) {
        // 全部成功 → 合并并跳转
        const mergedYaml = mergeYamlChapters(allYamls);
        saveYamlContent(fileId, mergedYaml);
        const project = loadProject(fileId);
        if (project) {
          project.status = 'converted';
          project.chapterCount = chapters.length;
          saveProject(project);
        }
        clearPartialYamls(fileId);
        setConverting(false);
        router.push(`/editor?id=${fileId}`);
        return;
      }

      // 部分成功（前面已设置 convertError）
      setConverting(false);
    } else {
      setConverting(false);
      setConvertError('转换已取消');
    }
  };

  /** 取消正在进行的转换 */
  const handleCancel = () => {
    abortRef.current?.abort();
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">上传与转换</h1>
      <p className="text-slate-500 mb-8">上传小说文本，自动切分章节并调用 AI 转换为 YAML 剧本</p>

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
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span>{splitError}</span>
              </div>
            ) : (
              <div className="space-y-2">
                {chapters.map((ch, idx) => {
                  const isExpanded = expandedChapter === idx;
                  // 预览内容：取前 200 字，超出则截断
                  const previewText = ch.content.length > 200
                    ? ch.content.slice(0, 200) + '...'
                    : ch.content;
                  return (
                    <div
                      key={idx}
                      data-testid={`chapter-${idx + 1}`}
                      className="rounded-md border border-slate-200 hover:border-indigo-300 transition-colors overflow-hidden"
                    >
                      <button
                        type="button"
                        className="flex items-center justify-between w-full p-3 text-left"
                        onClick={() => setExpandedChapter(isExpanded ? null : idx)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          )}
                          <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <span className="font-medium text-slate-900 truncate">{ch.title}</span>
                        </div>
                        <span className="text-sm text-slate-500 ml-2 flex-shrink-0">{ch.charCount.toLocaleString()} 字</span>
                      </button>
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-0 border-t border-slate-100 bg-slate-50">
                          <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">
                            {previewText}
                          </pre>
                          {ch.content.length > 200 && (
                            <p className="text-xs text-slate-400 mt-1">（共 {ch.charCount.toLocaleString()} 字，仅显示前 200 字）</p>
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
            <CardDescription>将 {chapters.length} 个章节发送给 AI 转换为 YAML 剧本（每章约 30-90 秒）</CardDescription>
          </CardHeader>
          <CardContent>
            {converting ? (
              <div className="text-center py-6">
                <Loader2 className="mx-auto h-8 w-8 text-indigo-600 animate-spin mb-3" />
                <p className="text-sm text-slate-600">
                  正在转换... {convertProgress.done} / {convertProgress.total} 章完成
                </p>
                <div className="mt-4 w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full transition-all"
                    style={{
                      width: `${(convertProgress.done / convertProgress.total) * 100}%`,
                    }}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={handleCancel} className="mt-4 gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50">
                  <XCircle className="h-4 w-4" />
                  取消转换
                </Button>
              </div>
            ) : convertError ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>转换失败：{convertError}</span>
                </div>
                <p className="text-xs text-slate-400">
                  已完成 {convertProgress.done} / {convertProgress.total} 章，点击重试将从断点继续
                </p>
                <Button onClick={handleConvert} variant="outline">
                  重试（断点续转）
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <Button size="lg" onClick={handleConvert} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  开始 AI 转换
                </Button>
                <p className="mt-3 text-xs text-slate-400">
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
    <Suspense fallback={<div className="mx-auto max-w-4xl px-6 py-12">加载中...</div>}>
      <ConvertContent />
    </Suspense>
  );
}
