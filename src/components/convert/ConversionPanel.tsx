'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Sparkles, Loader2, AlertCircle, ArrowRight, RefreshCw, XCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ConversionPanelProps {
  totalChapters: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  converting: boolean;
  hasFailures: boolean;
  allDone: boolean;
  hasAnySuccess: boolean;
  resumableCount: number;
  onStart: () => void;
  onRetry: () => void;
  onFinish: () => void;
  onCancel: () => void;
  onDismissResume: () => void;
}

export function ConversionPanel({
  totalChapters,
  successCount,
  failedCount,
  skippedCount,
  converting,
  hasFailures,
  allDone,
  hasAnySuccess,
  resumableCount,
  onStart,
  onRetry,
  onFinish,
  onCancel,
  onDismissResume,
}: ConversionPanelProps) {
  const reduce = useReducedMotion();

  return (
    <Card>
      <CardHeader>
        <CardTitle>步骤 3：AI 转换</CardTitle>
        <CardDescription>
          将 {totalChapters} 个章节发送给 AI 转换为 YAML 剧本（每章约 30-90 秒）
          {hasAnySuccess && ` — 已完成 ${successCount} / ${totalChapters} 章`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* 断点续转提示 */}
        {resumableCount > 0 && !converting && !hasFailures && !allDone && (
          <div className="mb-4 rounded-lg bg-sky-50 border border-sky-200 p-3 flex items-center justify-between dark:bg-sky-950/20 dark:border-sky-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-sky-600 dark:text-sky-400 flex-shrink-0" />
              <span className="text-sm text-sky-700 dark:text-sky-300">
                检测到上次未完成的转换任务（已完成 {resumableCount}/{totalChapters} 章），点击「开始 AI 转换」将从断点继续
              </span>
            </div>
            <button
              type="button"
              onClick={onDismissResume}
              className="text-xs text-sky-500 hover:text-sky-700 dark:text-sky-500 dark:hover:text-sky-300 ml-2 flex-shrink-0"
            >
              忽略
            </button>
          </div>
        )}

        {/* 转换中：进度条 */}
        {converting ? (
          <div className="text-center py-6">
            <motion.div
              animate={reduce ? {} : { rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="inline-block mb-3"
            >
              <Loader2 className="h-8 w-8 text-teal-600 dark:text-teal-400" />
            </motion.div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              正在转换... {successCount} / {totalChapters} 章完成
              {failedCount > 0 && `，${failedCount} 章失败`}
            </p>
            <div className="mt-4 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-teal-600 dark:bg-teal-400 h-full transition-all duration-500 relative overflow-hidden"
                style={{
                  width: `${((successCount + failedCount + skippedCount) / totalChapters) * 100}%`,
                }}
              >
                {/* 进度条流光效果 */}
                <div className="absolute inset-0 animate-shimmer" />
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onCancel} className="mt-4 gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30">
              <XCircle className="h-4 w-4" />
              取消转换
            </Button>
          </div>
        ) : allDone && hasAnySuccess ? (
          /* 全部处理完毕且有成功数据 */
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="text-center space-y-3"
          >
            <motion.div
              initial={reduce ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
            </motion.div>
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
            <Button size="lg" onClick={onFinish} className="gap-2">
              <ArrowRight className="h-4 w-4" />
              完成转换（{successCount} 章）
            </Button>
          </motion.div>
        ) : hasFailures && !converting ? (
          /* 有失败但未全部完成 */
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span>部分章节转换失败（{failedCount} 章失败，{successCount} 章成功）</span>
            </div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              可以在上方章节列表中单独重试或跳过失败章节，也可以直接完成已有章节
            </p>
            <div className="flex gap-2">
              <Button onClick={onRetry} variant="outline" className="gap-1.5">
                <RefreshCw className="h-4 w-4" />
                重试失败章节
              </Button>
              {hasAnySuccess && (
                <Button onClick={onFinish} variant="default" className="gap-1.5">
                  <ArrowRight className="h-4 w-4" />
                  跳过失败，完成转换
                </Button>
              )}
            </div>
          </div>
        ) : allDone && !hasAnySuccess ? (
          /* 全部失败或跳过 */
          <div className="text-center space-y-3">
            <p className="text-sm text-red-600 dark:text-red-400">
              所有章节转换均失败，无法生成剧本
            </p>
            <Button onClick={onRetry} variant="outline" className="gap-1.5">
              <RefreshCw className="h-4 w-4" />
              全部重试
            </Button>
          </div>
        ) : (
          /* 初始状态 */
          <div className="text-center">
            <Button size="lg" onClick={onStart} className="gap-2">
              <Sparkles className="h-4 w-4" />
              开始 AI 转换
            </Button>
            <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
              预计耗时约 {Math.ceil(totalChapters * 30)}-{Math.ceil(totalChapters * 90)} 秒
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
