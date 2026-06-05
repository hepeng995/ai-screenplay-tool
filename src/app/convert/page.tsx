'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, FileText, Loader2, CheckCircle2, AlertCircle, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUploader } from '@/components/upload/FileUploader';
import { splitChapters, type Chapter } from '@/lib/utils/chapter-splitter';
import { loadNovelText, saveYamlContent, saveProject, loadProject } from '@/lib/utils/storage';
import { mergeYamlChapters } from '@/lib/utils/yaml-merger';

function ConvertContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileId = searchParams.get('fileId');

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [splitError, setSplitError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [convertProgress, setConvertProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [convertError, setConvertError] = useState<string | null>(null);

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

  // AI 转换
  const handleConvert = async () => {
    if (chapters.length === 0) return;
    setConverting(true);
    setConvertError(null);
    setConvertProgress({ done: 0, total: chapters.length });

    const allYaml: string[] = [];

    for (let i = 0; i < chapters.length; i++) {
      try {
        const res = await fetch('/api/convert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chapterTitle: chapters[i].title,
            chapterText: chapters[i].content,
          }),
        });
        const data = await res.json();

        if (data.success && data.yaml) {
          allYaml.push(data.yaml);
          setConvertProgress({ done: i + 1, total: chapters.length });
        } else {
          throw new Error(data.error ?? 'AI 转换失败');
        }
      } catch (err) {
        setConvertError(err instanceof Error ? err.message : String(err));
        setConverting(false);
        return;
      }
    }

    // 合并所有章节的 YAML
    const mergedYaml = mergeYamlChapters(allYaml);
    if (fileId) {
      saveYamlContent(fileId, mergedYaml);
      const project = loadProject(fileId);
      if (project) {
        project.status = 'converted';
        project.chapterCount = chapters.length;
        saveProject(project);
      }
    }

    setConverting(false);
    router.push(`/editor?id=${fileId}`);
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
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {chapters.map((ch, idx) => (
                  <div
                    key={idx}
                    data-testid={`chapter-${idx + 1}`}
                    className="flex items-center justify-between rounded-md border border-slate-200 p-3 hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-slate-400" />
                      <span className="font-medium text-slate-900">{ch.title}</span>
                    </div>
                    <span className="text-sm text-slate-500">{ch.charCount.toLocaleString()} 字</span>
                  </div>
                ))}
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
              </div>
            ) : convertError ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>转换失败：{convertError}</span>
                </div>
                <Button onClick={handleConvert} variant="outline">
                  重试
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
