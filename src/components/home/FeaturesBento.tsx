'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { Scissors, Sparkles, Edit3, ArrowRight } from 'lucide-react';

/** Bento 特性展示数据 */
const features = [
  {
    icon: Scissors,
    title: '智能章节切分',
    desc: '自动识别中英文章节边界，支持多种格式，用户预览确认后再转换。',
    href: '/convert',
    span: 'md:col-span-1',
    variant: 'default' as const,
  },
  {
    icon: Sparkles,
    title: 'AI 自动转换',
    desc: '基于 mimo-v2.5 大模型，逐章转换为结构化 YAML 剧本。',
    href: '/convert',
    span: 'md:col-span-1',
    variant: 'accent' as const,
  },
  {
    icon: Edit3,
    title: '在线编辑校验',
    desc: '实时 YAML 语法校验 + Zod Schema 结构校验，编辑即见即得，多格式导出。',
    href: '/editor',
    span: 'md:col-span-2',
    variant: 'wide' as const,
  },
];

export function FeaturesBento() {
  const reduce = useReducedMotion();

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="pb-16"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map(({ icon: Icon, title, desc, href, span, variant }, idx) => (
          <motion.div
            key={title}
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.4, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] as const }}
            className={span}
          >
            <Link href={href} className="block h-full">
              <div
                className={`
                  group h-full rounded-xl border p-6 transition-all duration-200 cursor-pointer
                  hover:-translate-y-1 hover:shadow-lg
                  ${variant === 'accent'
                    ? 'border-teal-200 bg-gradient-to-br from-teal-50/60 to-teal-100/40 hover:border-teal-300 dark:border-teal-800 dark:from-teal-950/30 dark:to-teal-950/10 dark:hover:border-teal-700'
                    : variant === 'wide'
                      ? 'border-zinc-200 bg-gradient-to-br from-zinc-900 to-zinc-800 hover:border-zinc-600 dark:from-zinc-800 dark:to-zinc-900 dark:hover:border-zinc-600'
                      : 'border-zinc-200 bg-white hover:border-teal-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-teal-800'
                  }
                `}
              >
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110 ${
                      variant === 'accent'
                        ? 'bg-teal-600 dark:bg-teal-500'
                        : variant === 'wide'
                          ? 'bg-zinc-700 dark:bg-zinc-600'
                          : 'bg-zinc-100 dark:bg-zinc-800'
                    }`}>
                      <Icon className={`h-5 w-5 ${
                        variant === 'accent'
                          ? 'text-white'
                          : variant === 'wide'
                            ? 'text-teal-400'
                            : 'text-teal-600 dark:text-teal-400'
                      }`} />
                    </div>
                    <h3 className={`text-lg font-semibold ${
                      variant === 'wide'
                        ? 'text-white'
                        : 'text-zinc-900 dark:text-zinc-100'
                    }`}>{title}</h3>
                  </div>
                  <p className={`text-sm leading-relaxed ${
                    variant === 'wide'
                      ? 'text-zinc-400'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }`}>{desc}</p>
                  <div className={`mt-4 flex items-center gap-1 text-sm font-medium transition-opacity duration-200 opacity-0 group-hover:opacity-100 ${
                    variant === 'wide'
                      ? 'text-teal-400'
                      : 'text-teal-600 dark:text-teal-400'
                  }`}>
                    了解更多 <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
