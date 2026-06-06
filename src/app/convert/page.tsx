'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileUploader } from '@/components/upload/FileUploader';
import { ChapterList } from '@/components/convert/ChapterList';
import { ConversionPanel } from '@/components/convert/ConversionPanel';
import { ConvertSkeleton } from '@/components/skeleton/ConvertSkeleton';
import { useChapterConversion } from '@/hooks/useChapterConversion';
import { TEMPLATES, type TemplateType } from '@/lib/ai/templates';
import { saveYamlContent, saveProject, loadProject } from '@/lib/utils/storage';
import { mergeYamlChapters } from '@/lib/utils/yaml-merger';

function ConvertContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileId = searchParams.get('fileId');

  const {
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
    hasFailures,
    allDone,
    hasAnySuccess,
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
  } = useChapterConversion(fileId);

  /** 完成转换：合并所有已成功章节（按 chapter.id 有序收集，避免删章错位） */
  const onFinish = () => {
    if (!fileId) return;
    const successYamls = getOrderedSuccessYamls();
    if (successYamls.length === 0) return;

    const mergedYaml = mergeYamlChapters(successYamls);
    saveYamlContent(fileId, mergedYaml);
    const project = loadProject(fileId);
    if (project) {
      project.status = 'converted';
      project.chapterCount = successYamls.length;
      saveProject(project);
    }
    // 清除中间数据与持久化状态
    clearAllPartials();
    router.push(`/editor?id=${fileId}`);
  };

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

      {/* 模板选择（转换前选择，转换中锁定） */}
      {fileId && chapters.length > 0 && !splitError && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">选择剧本模板</CardTitle>
            <CardDescription>不同模板会影响 AI 生成剧本的风格和结构</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  disabled={converting}
                  onClick={() => setTemplateId(tpl.id)}
                  className={`text-left rounded-xl border p-3 transition-all duration-200 ${
                    templateId === tpl.id
                      ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-500/20 dark:border-teal-400 dark:bg-teal-950/20 dark:ring-teal-400/20'
                      : 'border-zinc-200 bg-white hover:border-teal-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-teal-700'
                  } ${converting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="text-lg mb-1">{tpl.icon}</div>
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{tpl.name}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{tpl.description}</div>
                </button>
              ))}
            </div>
            {/* 自定义转换要求 */}
            <div className="mt-4">
              <label htmlFor="custom-instruction" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                自定义要求（可选）
              </label>
              <textarea
                id="custom-instruction"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                disabled={converting}
                rows={2}
                maxLength={500}
                placeholder="例如：多用心理独白、台词更口语化、每章控制在 5 个场景以内…"
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 resize-y transition-colors disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">该要求会附加到每一章的转换提示中（最多 500 字）</p>
            </div>
          </CardContent>
        </Card>
      )}

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
              <ChapterList
                chapters={chapters}
                chapterStatuses={chapterStatuses}
                chapterErrors={chapterErrors}
                converting={converting}
                expandedChapter={expandedChapter}
                editingTitle={editingTitle}
                editTitleValue={editTitleValue}
                canRemove={chapters.length > 3}
                onToggleExpand={setExpandedChapter}
                onRenameStart={(idx) => {
                  setEditingTitle(idx);
                  setEditTitleValue(chapters[idx].title);
                }}
                onRenameConfirm={handleRenameConfirm}
                onRenameCancel={handleRenameCancel}
                onEditTitleChange={setEditTitleValue}
                onRetry={handleRetryChapter}
                onSkip={handleSkipChapter}
                onRemove={handleRemoveChapter}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* 步骤 3：AI 转换 */}
      {fileId && chapters.length > 0 && !splitError && (
        <ConversionPanel
          totalChapters={chapters.length}
          successCount={successCount}
          failedCount={failedCount}
          skippedCount={skippedCount}
          converting={converting}
          hasFailures={hasFailures}
          allDone={allDone}
          hasAnySuccess={hasAnySuccess}
          resumableCount={resumableCount}
          onStart={handleConvert}
          onRetry={handleConvert}
          onFinish={onFinish}
          onCancel={handleCancel}
          onDismissResume={() => {}}
        />
      )}
    </div>
  );
}

export default function ConvertPage() {
  return (
    <Suspense fallback={<ConvertSkeleton />}>
      <ConvertContent />
    </Suspense>
  );
}
