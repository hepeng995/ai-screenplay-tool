'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
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
  Play,
  Download,
  Upload,
  Copy,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { toast } from '@/lib/utils/toast';
import { deleteProject, renameProject, listProjects, createProject, saveYamlContent, exportProjects, importProjects, getStorageUsage, cloneProject, type ImportStrategy, type Project } from '@/lib/utils/storage';

interface RecentProject {
  id: string;
  title: string;
  updatedAt: string;
  status: Project['status'];
  chapterCount: number;
  qiniuKey?: string;
}

/** 项目状态标签样式映射 */
const STATUS_LABELS: Record<Project['status'], { text: string; color: string }> = {
  uploaded: { text: '已上传', color: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' },
  split: { text: '已切分', color: 'bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400' },
  converted: { text: '已转换', color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400' },
  edited: { text: '已编辑', color: 'bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400' },
};

/** 示例 YAML 数据：点击「体验示例」时按需加载 */
const loadDemoYaml = () => import('@/lib/data/demo-yaml').then((m) => m.DEMO_YAML);

/** Bento 特性展示数据 */
const features = [
  {
    icon: Scissors,
    title: '智能章节切分',
    desc: '自动识别中英文章节边界，支持多种格式，用户预览确认后再转换。',
    href: '/convert',
    span: 'md:col-span-2',
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
    span: 'md:col-span-3',
    variant: 'wide' as const,
  },
];

/** 工作流步骤数据 */
const workflowSteps = [
  { icon: Upload, label: '上传小说' },
  { icon: Scissors, label: '智能切分' },
  { icon: Sparkles, label: 'AI 转换' },
  { icon: Edit3, label: '编辑导出' },
];

export default function Home() {
  const reduce = useReducedMotion();
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  // 存储空间使用情况
  const [storageUsed, setStorageUsed] = useState(0);
  // 搜索与筛选
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<Project['status'] | 'all'>('all');
  // 批量选择
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // 删除确认弹窗状态
  const [deleteId, setDeleteId] = useState<string | null>(null);
  // 重命名状态
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  // 导入文件 ref
  const importInputRef = useRef<HTMLInputElement>(null);

  const loadProjects = useCallback(() => {
    const projects: Project[] = listProjects();
    const mapped: RecentProject[] = projects.map((p) => ({
      id: p.id,
      title: p.name,
      updatedAt: p.updatedAt,
      status: p.status,
      chapterCount: p.chapterCount,
      qiniuKey: p.qiniuKey,
    }));
    setRecentProjects(mapped);
    const { used } = getStorageUsage();
    setStorageUsed(used);
  }, []);

  // 搜索与筛选后的项目列表
  const filteredProjects = useMemo(() => {
    return recentProjects.filter((p) => {
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      if (searchText && !p.title.toLowerCase().includes(searchText.toLowerCase())) return false;
      return true;
    });
  }, [recentProjects, filterStatus, searchText]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  /** 开始重命名 */
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

  /** 导出所有项目 */
  const handleExportAll = () => {
    const ids = recentProjects.map((p) => p.id);
    if (ids.length === 0) {
      toast.info('没有可导出的项目');
      return;
    }
    const json = exportProjects(ids);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-screenplay-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`已导出 ${ids.length} 个项目`);
  };

  /** 导入项目 */
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>, strategy: ImportStrategy = 'clone') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const result = importProjects(text, strategy);
        loadProjects();
        const parts: string[] = [];
        if (result.imported > 0) parts.push(`导入 ${result.imported} 个`);
        if (result.overwritten > 0) parts.push(`覆盖 ${result.overwritten} 个`);
        if (result.skipped > 0) parts.push(`跳过 ${result.skipped} 个`);
        toast.success(parts.length > 0 ? parts.join('，') : '没有新项目需要导入');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '导入失败，文件格式无效');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 动画配置
  const animConfig = (delay = 0) =>
    reduce
      ? false
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <div className="mx-auto max-w-6xl px-6">
      {/* ─── Hero 区域 ─── */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-20">
        <div className="max-w-2xl">
          <motion.h1
            {...animConfig(0)}
            className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-[1.1]"
          >
            将小说变为剧本
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
              onClick={async () => {
                const demoYaml = await loadDemoYaml();
                const project = createProject('示例剧本 - 桃花源记');
                saveYamlContent(project.id, demoYaml);
                window.location.href = `/editor?id=${project.id}`;
              }}
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
      </section>

      {/* ─── 工作流步骤 ─── */}
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
              <div
                key={step.label}
                className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-950/30">
                  <Icon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500">第 {i + 1} 步</span>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{step.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.section>

      {/* ─── Bento 特性展示 ─── */}
      <motion.section
        initial={reduce ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="pb-16"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    ${variant === 'accent'
                      ? 'border-teal-200 bg-teal-50/60 hover:border-teal-300 hover:shadow-md dark:border-teal-800 dark:bg-teal-950/20 dark:hover:border-teal-700'
                      : variant === 'wide'
                        ? 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700'
                        : 'border-zinc-200 bg-white hover:border-teal-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-teal-800'
                    }
                  `}
                >
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        variant === 'accent'
                          ? 'bg-teal-600 dark:bg-teal-500'
                          : 'bg-zinc-100 dark:bg-zinc-800'
                      }`}>
                        <Icon className={`h-5 w-5 ${
                          variant === 'accent'
                            ? 'text-white'
                            : 'text-teal-600 dark:text-teal-400'
                        }`} />
                      </div>
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{desc}</p>
                    <div className="mt-4 flex items-center gap-1 text-sm font-medium text-teal-600 dark:text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      了解更多 <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ─── 最近项目 ─── */}
      <section className="pb-12">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">最近项目</h2>
          </div>
          {recentProjects.length > 0 && (
            <div className="flex items-center gap-2">
              {/* 搜索框 */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="搜索项目..."
                  aria-label="搜索项目"
                  className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-zinc-200 bg-white outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 w-36 transition-colors dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-teal-500"
                />
              </div>
              {/* 状态筛选 */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                aria-label="按状态筛选"
                className="text-sm rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 outline-none focus:border-teal-400 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:focus:border-teal-500"
              >
                <option value="all">全部状态</option>
                <option value="uploaded">已上传</option>
                <option value="split">已切分</option>
                <option value="converted">已转换</option>
                <option value="edited">已编辑</option>
              </select>
              <Button variant="ghost" size="sm" onClick={handleExportAll} className="gap-1.5 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">导出备份</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => importInputRef.current?.click()} className="gap-1.5 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
                <Upload className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">导入项目</span>
              </Button>
              <input
                ref={importInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
              />
            </div>
          )}
        </div>
        {recentProjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 py-16 text-center">
            <FileText className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-600" />
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
              尚未创建项目
            </p>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              点击上方「开始创作」上传小说，或「体验示例」快速预览效果
            </p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 py-12 text-center">
            <Search className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-600" />
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
              未找到匹配的项目
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* 批量操作工具条 */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 text-sm text-teal-800 bg-teal-50 rounded-lg px-3 py-2 dark:bg-teal-950/20 dark:text-teal-200">
                <span className="font-medium">已选 {selectedIds.size} 项</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1 dark:text-red-400 dark:hover:bg-red-950/30"
                  onClick={() => {
                    for (const id of selectedIds) deleteProject(id);
                    setSelectedIds(new Set());
                    loadProjects();
                    toast.success(`已删除 ${selectedIds.size} 个项目`);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  批量删除
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 gap-1 dark:text-teal-400 dark:hover:bg-teal-950/20"
                  onClick={() => {
                    const ids = [...selectedIds];
                    const json = exportProjects(ids);
                    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `ai-screenplay-backup-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success(`已导出 ${ids.length} 个项目`);
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                  批量导出
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-teal-700 hover:bg-teal-100 dark:text-teal-300 dark:hover:bg-teal-950/30"
                  onClick={() => setSelectedIds(new Set())}
                >
                  取消选择
                </Button>
              </div>
            )}
            {filteredProjects.map((proj) => (
              <div
                key={proj.id}
                className="group flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 hover:border-teal-300 hover:shadow-sm transition-all duration-200 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-teal-800"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(proj.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(proj.id)) next.delete(proj.id);
                      else next.add(proj.id);
                      return next;
                    });
                  }}
                  aria-label={`选择 ${proj.title}`}
                  className="h-4 w-4 rounded border-zinc-300 text-teal-600 mr-3 flex-shrink-0 cursor-pointer dark:border-zinc-600 dark:bg-zinc-800"
                />
                <Link
                  href={`/editor?id=${proj.id}`}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <FileText className="h-4 w-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
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
                      className="font-medium text-zinc-900 dark:text-zinc-100 bg-transparent border border-teal-300 dark:border-teal-600 rounded-lg px-2 py-0.5 outline-none focus:border-teal-500"
                      onClick={(e) => e.preventDefault()}
                    />
                  ) : (
                    <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {proj.title}
                    </span>
                  )}
                </Link>
                <div className="flex items-center gap-2 ml-2">
                  {/* 状态标签 */}
                  {(() => {
                    const label = STATUS_LABELS[proj.status];
                    return (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${label.color}`}>
                        {label.text}
                      </span>
                    );
                  })()}
                  {proj.chapterCount > 0 && (
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 hidden sm:inline">{proj.chapterCount} 章</span>
                  )}
                  {proj.qiniuKey && (
                    <span className="text-xs text-sky-400 dark:text-sky-500">☁</span>
                  )}
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 hidden sm:inline">{proj.updatedAt}</span>
                  {/* 操作按钮：移动端始终可见，桌面端 hover 显示 */}
                  {renameId === proj.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleRenameConfirm(proj.id)}
                        className="p-1 rounded-lg hover:bg-emerald-50 text-emerald-600 dark:hover:bg-emerald-950/30 dark:text-emerald-400"
                        aria-label="确认重命名"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleRenameCancel}
                        className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-500 dark:hover:bg-zinc-800 dark:text-zinc-400"
                        aria-label="取消重命名"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const cloned = cloneProject(proj.id);
                          if (cloned) {
                            loadProjects();
                            toast.success('已复制项目');
                          }
                        }}
                        className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-500 dark:hover:bg-zinc-800 dark:text-zinc-400"
                        aria-label="复制项目"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRenameStart(proj);
                        }}
                        className="p-1 rounded-lg hover:bg-teal-50 text-teal-600 dark:hover:bg-teal-950/20 dark:text-teal-400"
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
                        className="p-1 rounded-lg hover:bg-red-50 text-red-600 dark:hover:bg-red-950/30 dark:text-red-400"
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

      {/* 存储空间指示 */}
      <section className="pb-12">
        <StorageBar used={storageUsed} total={5 * 1024 * 1024} />
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

/** 存储空间指示条 */
function StorageBar({ used, total }: { used: number; total: number }) {
  const pct = Math.min(Math.round((used / total) * 100), 100);
  const usedMB = (used / (1024 * 1024)).toFixed(2);
  const totalMB = (total / (1024 * 1024)).toFixed(0);
  const isWarning = pct > 80;

  if (used === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">本地存储空间</span>
        <span className={`text-xs ${isWarning ? 'text-red-600 dark:text-red-400 font-medium' : 'text-zinc-400 dark:text-zinc-500'}`}>
          {usedMB} MB / {totalMB} MB（{pct}%）
        </span>
      </div>
      <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${isWarning ? 'bg-red-500' : 'bg-teal-500 dark:bg-teal-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isWarning && (
        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
          存储空间不足，建议导出备份后清理旧项目
        </p>
      )}
    </div>
  );
}
