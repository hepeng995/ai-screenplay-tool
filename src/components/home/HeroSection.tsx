'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Play, Scissors, Sparkles, Edit3, Upload, FileText, Braces, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** 工作流步骤数据 */
const workflowSteps = [
  { icon: Upload, label: '上传小说' },
  { icon: Scissors, label: '智能切分' },
  { icon: Sparkles, label: 'AI 转换' },
  { icon: Edit3, label: '编辑导出' },
];

interface HeroSectionProps {
  onTryDemo: () => void;
}

export function HeroSection({ onTryDemo }: HeroSectionProps) {
  const reduce = useReducedMotion();

  const animConfig = (delay = 0) =>
    reduce
      ? false
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <>
      {/* Hero 区域 */}
      <section className="relative pt-24 pb-16 md:pt-28 md:pb-20 overflow-hidden">
        {/* 微妙的动态渐变背景 */}
        <div
          className="absolute inset-0 -z-10"
          aria-hidden="true"
        >
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-teal-100/60 via-teal-50/30 to-transparent dark:from-teal-950/30 dark:via-teal-900/10 dark:to-transparent rounded-full blur-3xl translate-x-1/3 -translate-y-1/4" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-teal-50/40 via-transparent to-transparent dark:from-teal-950/20 dark:via-transparent dark:to-transparent rounded-full blur-3xl -translate-x-1/4 translate-y-1/4" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-8 items-center">
          {/* 左侧文字内容 */}
          <div className="max-w-xl">
            <motion.h1
              {...animConfig(0)}
              className="text-4xl md:text-5xl lg:text-[3.4rem] font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-[1.1]"
            >
              将小说变为
              <span className="text-teal-600 dark:text-teal-400">剧本</span>
            </motion.h1>
            <motion.p
              {...animConfig(0.08)}
              className="mt-6 text-lg text-zinc-500 dark:text-zinc-400 max-w-[480px] leading-relaxed"
            >
              上传小说文本，AI 自动完成章节切分与剧本转换，专注创作即可
            </motion.p>
            <motion.div
              {...animConfig(0.16)}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Link href="/convert">
                <Button size="lg" className="gap-2">
                  开始创作 <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="gap-2"
                onClick={onTryDemo}
              >
                <Play className="h-4 w-4" />
                体验示例
              </Button>
            </motion.div>
            <motion.p
              {...animConfig(0.24)}
              className="mt-5 text-xs text-zinc-400 dark:text-zinc-500"
            >
              无需注册 · 完全免费 · 数据仅存于本地浏览器
            </motion.p>
          </div>

          {/* 右侧抽象流程示意图（md+ 断点显示） */}
          <motion.div
            initial={reduce ? false : { opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="hidden md:flex items-center justify-center"
            aria-hidden="true"
          >
            <div className="relative w-full max-w-sm">
              {/* 流程卡片：文档 → AI → YAML */}
              <div className="flex items-center justify-center gap-3">
                {/* 文档图标 */}
                <motion.div
                  animate={reduce ? {} : { y: [0, -4, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-zinc-200 bg-white/80 backdrop-blur-sm px-6 py-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80"
                >
                  <FileText className="h-10 w-10 text-zinc-400 dark:text-zinc-500" />
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">小说文本</span>
                  <div className="flex flex-col gap-0.5 mt-1">
                    <div className="w-16 h-1 rounded bg-zinc-200 dark:bg-zinc-700" />
                    <div className="w-12 h-1 rounded bg-zinc-200 dark:bg-zinc-700" />
                    <div className="w-14 h-1 rounded bg-zinc-200 dark:bg-zinc-700" />
                  </div>
                </motion.div>

                {/* 箭头 + AI */}
                <div className="flex flex-col items-center gap-1">
                  <ArrowLeftRight className="h-5 w-5 text-teal-400 dark:text-teal-500" />
                  <motion.div
                    animate={reduce ? {} : { scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-600 dark:bg-teal-500"
                  >
                    <Sparkles className="h-4 w-4 text-white" />
                  </motion.div>
                </div>

                {/* YAML 输出 */}
                <motion.div
                  animate={reduce ? {} : { y: [0, 4, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-teal-200 bg-teal-50/80 backdrop-blur-sm px-6 py-5 shadow-sm dark:border-teal-800 dark:bg-teal-950/30"
                >
                  <Braces className="h-10 w-10 text-teal-500 dark:text-teal-400" />
                  <span className="text-xs font-medium text-teal-600 dark:text-teal-400">YAML 剧本</span>
                  <div className="flex flex-col gap-0.5 mt-1 font-mono">
                    <div className="text-[9px] text-teal-500/70 dark:text-teal-400/60">script:</div>
                    <div className="text-[9px] text-teal-500/70 dark:text-teal-400/60 pl-2">title: ...</div>
                    <div className="text-[9px] text-teal-500/70 dark:text-teal-400/60 pl-2">acts:</div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 工作流步骤 */}
      <motion.section
        initial={reduce ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="pb-16"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {workflowSteps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.label}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.4, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] as const }}
                className="group flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-teal-50 transition-colors duration-200 group-hover:bg-teal-100 dark:bg-teal-950/30 dark:group-hover:bg-teal-950/50">
                  <Icon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500">第 {i + 1} 步</span>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{step.label}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.section>
    </>
  );
}
