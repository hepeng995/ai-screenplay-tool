'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import {
  Scissors,
  Sparkles,
  Edit3,
  FileText,
  ArrowRight,
  FolderOpen,
  Pencil,
  Trash2,
  X,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { toast } from '@/lib/utils/toast';
import { deleteProject, renameProject, listProjects, type Project } from '@/lib/utils/storage';

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
  // 删除确认弹窗状态：当前选中要删除的项目 ID
  const [deleteId, setDeleteId] = useState<string | null>(null);
  // 重命名状态：当前正在重命名的项目 ID
  const [renameId, setRenameId] = useState<string | null>(null);
  // 重命名输入值
  const [renameValue, setRenameValue] = useState('');

  /**
   * 从 localStorage 加载项目列表
   * 复用 storage.ts 的 listProjects 抽象层，避免重复常量和手动 JSON.parse
   * 注意：storage 的 Project 用 `name` 字段，UI 的 RecentProject 用 `title` 字段
   */
  const loadProjects = useCallback(() => {
    const projects: Project[] = listProjects();
    // 字段映射：name -> title
    const mapped: RecentProject[] = projects.map((p) => ({
      id: p.id,
      title: p.name,
      updatedAt: p.updatedAt,
    }));
    // listProjects 已按 updatedAt 降序排列，无需再排
    setRecentProjects(mapped);
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  /** 开始重命名：进入编辑态，预填当前项目名 */
  const handleRenameStart = (proj: RecentProject) => {
    setRenameId(proj.id);
    setRenameValue(proj.title);
  };

  /** 确认重命名 */
  const handleRenameConfirm = (id: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      toast.error('项目名称不能为空');
      return;
    }
    renameProject(id, trimmed);
    loadProjects();
    setRenameId(null);
    setRenameValue('');
    toast.success('已重命名');
  };

  /** 取消重命名 */
  const handleRenameCancel = () => {
    setRenameId(null);
    setRenameValue('');
  };

  /** 确认删除 */
  const handleDeleteConfirm = () => {
    if (!deleteId) return;
    deleteProject(deleteId);
    loadProjects();
    setDeleteId(null);
    toast.success('已删除');
  };

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
      <section className="grid grid-cols-1 gap-6 mt-8 md:grid-cols-3">
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
              <div
                key={proj.id}
                className="group flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <Link
                  href={`/editor?id=${proj.id}`}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  {renameId === proj.id ? (
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameConfirm(proj.id);
                        if (e.key === 'Escape') handleRenameCancel();
                      }}
                      autoFocus
                      className="font-medium text-slate-900 bg-transparent border border-indigo-300 rounded px-2 py-0.5 outline-none focus:border-indigo-500"
                      onClick={(e) => e.preventDefault()}
                    />
                  ) : (
                    <span className="font-medium text-slate-900 truncate">
                      {proj.title}
                    </span>
                  )}
                </Link>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-xs text-slate-500">{proj.updatedAt}</span>
                  {/* 悬停显示的操作按钮 */}
                  {renameId === proj.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleRenameConfirm(proj.id)}
                        className="p-1 rounded hover:bg-green-50 text-green-600"
                        aria-label="确认重命名"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleRenameCancel}
                        className="p-1 rounded hover:bg-slate-100 text-slate-500"
                        aria-label="取消重命名"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <div className="hidden group-hover:flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRenameStart(proj);
                        }}
                        className="p-1 rounded hover:bg-indigo-50 text-indigo-600"
                        aria-label="重命名"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeleteId(proj.id);
                        }}
                        className="p-1 rounded hover:bg-red-50 text-red-600"
                        aria-label="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 删除确认弹窗 */}
      <Dialog
        open={deleteId !== null}
        title="确认删除"
        description="删除后不可恢复，确定要删除这个项目吗？"
        confirmText="删除"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
