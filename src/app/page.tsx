'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Scissors, Sparkles, Edit3, FileText, ArrowRight, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface RecentProject {
  id: string;
  title: string;
  updatedAt: string;
}

const features = [
  {
    icon: Scissors,
    title: '智能章节切分',
    desc: '自动识别小说章节边界，支持多种格式（第X章/Chapter N/卷X），用户预览确认。',
  },
  {
    icon: Sparkles,
    title: 'AI 自动转换',
    desc: '基于 mimo-v2.5 大模型，将小说文本一键转换为结构化 YAML 剧本格式。',
  },
  {
    icon: Edit3,
    title: '在线编辑校验',
    desc: '实时 YAML 语法校验 + Zod Schema 结构校验，编辑即见即得。',
  },
];

export default function Home() {
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('ai-script-projects');
      if (raw) {
        setRecentProjects(JSON.parse(raw));
      }
    } catch {
      // localStorage 不可用或数据损坏，忽略
    }
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      {/* Hero 区域 */}
      <section className="text-center py-12">
        <h1 className="text-5xl font-bold tracking-tight text-slate-900">
          AI 辅助剧本创作
        </h1>
        <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
          将小说章节文本自动转换为结构化 YAML 剧本初稿，降低改编门槛，提升创作效率
        </p>
        <div className="mt-8">
          <Link href="/convert">
            <Button size="lg" className="gap-2">
              开始创作 <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* 特性卡片 */}
      <section className="grid grid-cols-3 gap-6 mt-8">
        {features.map(({ icon: Icon, title, desc }) => (
          <Card key={title}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                  <Icon className="h-5 w-5 text-indigo-600" />
                </div>
                <CardTitle>{title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="leading-relaxed">{desc}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* 最近项目 */}
      <section className="mt-12">
        <div className="flex items-center gap-2 mb-4">
          <FolderOpen className="h-5 w-5 text-slate-400" />
          <h2 className="text-xl font-semibold text-slate-900">最近项目</h2>
        </div>
        {recentProjects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">
              尚未创建项目，点击上方「开始创作」开始
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentProjects.map((proj) => (
              <Link
                key={proj.id}
                href={`/editor?id=${proj.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <span className="font-medium text-slate-900">{proj.title}</span>
                </div>
                <span className="text-xs text-slate-500">{proj.updatedAt}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
