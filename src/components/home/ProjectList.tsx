'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  FileText,
  ArrowRight,
  FolderOpen,
  Pencil,
  Trash2,
  X,
  Check,
  Download,
  Upload,
  Copy,
  Search,
  Trash,
  RotateCcw,
  CloudUpload,
  CloudDownload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { toast } from '@/lib/utils/toast';
import {
  deleteProject,
  renameProject,
  listProjects,
  createProject,
  saveYamlContent,
  exportProjects,
  importProjects,
  cloneProject,
  listTrash,
  restoreProject,
  permanentlyDelete,
  emptyTrash,
  serializeAllProjects,
  type ImportStrategy,
  type Project,
  type TrashedProject,
} from '@/lib/utils/storage';
import { uploadToQiniu } from '@/lib/qiniu/upload';
import { downloadFromQiniu } from '@/lib/qiniu/download';

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

interface ProjectListProps {
  projects: RecentProject[];
  onProjectsChange: () => void;
}

export function ProjectList({ projects, onProjectsChange }: ProjectListProps) {
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
  // 回收站面板
  const [showTrash, setShowTrash] = useState(false);
  const [trashItems, setTrashItems] = useState<TrashedProject[]>([]);
  // 云端备份/恢复状态
  const [cloudBusy, setCloudBusy] = useState(false);
  // 彻底删除确认
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null);
  // 清空回收站确认
  const [showEmptyTrashConfirm, setShowEmptyTrashConfirm] = useState(false);
  // 云端恢复确认
  const [showCloudRestoreConfirm, setShowCloudRestoreConfirm] = useState(false);
  const reduce = useReducedMotion();

  // 搜索与筛选后的项目列表
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      if (searchText && !p.title.toLowerCase().includes(searchText.toLowerCase())) return false;
      return true;
    });
  }, [projects, filterStatus, searchText]);

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
    onProjectsChange();
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
    onProjectsChange();
    setDeleteId(null);
    toast.success('已删除');
  };

  /** 导出所有项目 */
  const handleExportAll = () => {
    const ids = projects.map((p) => p.id);
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
        onProjectsChange();
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

  /** 打开回收站 */
  const handleOpenTrash = () => {
    setTrashItems(listTrash());
    setShowTrash(true);
  };

  /** 还原项目 */
  const handleRestore = (id: string) => {
    if (restoreProject(id)) {
      setTrashItems(listTrash());
      onProjectsChange();
      toast.success('已还原');
    }
  };

  /** 彻底删除确认 */
  const handlePermanentDeleteConfirm = () => {
    if (!permanentDeleteId) return;
    permanentlyDelete(permanentDeleteId);
    setTrashItems(listTrash());
    setPermanentDeleteId(null);
    toast.success('已彻底删除');
  };

  /** 清空回收站确认 */
  const handleEmptyTrashConfirm = () => {
    const count = emptyTrash();
    setTrashItems([]);
    setShowEmptyTrashConfirm(false);
    toast.success(`已彻底删除 ${count} 个项目`);
  };

  /** 云端备份全部项目 */
  const handleCloudBackup = async () => {
    setCloudBusy(true);
    try {
      const json = serializeAllProjects();
      const result = await uploadToQiniu(json, `backups/all-projects-${new Date().toISOString().slice(0, 10)}.json`);
      if (result.success) {
        toast.success('全部项目已备份到云端');
      } else {
        toast.error(result.error ?? '备份失败');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '备份失败');
    } finally {
      setCloudBusy(false);
    }
  };

  /** 从云端恢复 */
  const handleCloudRestore = async () => {
    setShowCloudRestoreConfirm(false);
    setCloudBusy(true);
    try {
      const result = await downloadFromQiniu('backups/latest.json');
      if (result.success && result.content) {
        const stats = importProjects(result.content, 'overwrite');
        onProjectsChange();
        const parts: string[] = [];
        if (stats.imported > 0) parts.push(`导入 ${stats.imported} 个`);
        if (stats.overwritten > 0) parts.push(`覆盖 ${stats.overwritten} 个`);
        toast.success(parts.length > 0 ? parts.join('，') : '云端无新数据');
      } else {
        toast.error(result.error ?? '云端无备份数据');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '恢复失败');
    } finally {
      setCloudBusy(false);
    }
  };

  return (
    <section className="pb-12">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">最近项目</h2>
        </div>
        {projects.length > 0 && (
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
                className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-zinc-200 bg-white outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 w-36 focus:w-48 transition-all duration-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-teal-500"
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
            <Button variant="ghost" size="sm" onClick={handleCloudBackup} disabled={cloudBusy} className="gap-1.5 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
              <CloudUpload className={`h-3.5 w-3.5 ${cloudBusy ? 'animate-pulse' : ''}`} />
              <span className="hidden sm:inline">云端备份</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowCloudRestoreConfirm(true)} disabled={cloudBusy} className="gap-1.5 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
              <CloudDownload className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">云端恢复</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleOpenTrash} className="gap-1.5 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
              <Trash className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">回收站</span>
            </Button>
          </div>
        )}
      </div>
      {projects.length === 0 ? (
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
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={reduce ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2 text-sm text-teal-800 bg-teal-50 rounded-lg px-3 py-2 dark:bg-teal-950/20 dark:text-teal-200"
              >
                <span className="font-medium">已选 {selectedIds.size} 项</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1 dark:text-red-400 dark:hover:bg-red-950/30"
                  onClick={() => {
                    for (const id of selectedIds) deleteProject(id);
                    setSelectedIds(new Set());
                    onProjectsChange();
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
              </motion.div>
            )}
          </AnimatePresence>
          {filteredProjects.map((proj, idx) => (
            <motion.div
              key={proj.id}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] as const }}
              className="group flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-teal-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-teal-800"
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
                          onProjectsChange();
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
            </motion.div>
          ))}
        </div>
      )}

      {/* 删除确认弹窗（软删除，进回收站） */}
      <Dialog
        open={deleteId !== null}
        title="确认删除"
        description="项目将移入回收站，可随时还原。确定要删除吗？"
        confirmText="删除"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />

      {/* 彻底删除确认 */}
      <Dialog
        open={permanentDeleteId !== null}
        title="彻底删除"
        description="此操作不可恢复，项目和所有关联数据将被永久删除。确定吗？"
        confirmText="彻底删除"
        variant="danger"
        onConfirm={handlePermanentDeleteConfirm}
        onCancel={() => setPermanentDeleteId(null)}
      />

      {/* 清空回收站确认 */}
      <Dialog
        open={showEmptyTrashConfirm}
        title="清空回收站"
        description="将彻底删除回收站中的所有项目，此操作不可恢复。确定吗？"
        confirmText="全部删除"
        variant="danger"
        onConfirm={handleEmptyTrashConfirm}
        onCancel={() => setShowEmptyTrashConfirm(false)}
      />

      {/* 云端恢复确认 */}
      <Dialog
        open={showCloudRestoreConfirm}
        title="从云端恢复"
        description="将从云端下载最新的备份并覆盖本地项目数据（已存在的同名项目会被覆盖）。确定继续吗？"
        confirmText="确认恢复"
        variant="danger"
        onConfirm={handleCloudRestore}
        onCancel={() => setShowCloudRestoreConfirm(false)}
      />

      {/* 回收站面板 */}
      <AnimatePresence>
        {showTrash && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="mt-6 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Trash className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">回收站</h3>
                <span className="text-xs text-zinc-400">（{trashItems.length} 项）</span>
              </div>
              <div className="flex items-center gap-2">
                {trashItems.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setShowEmptyTrashConfirm(true)} className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30">
                    清空
                  </Button>
                )}
                <button type="button" onClick={() => setShowTrash(false)} className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            {trashItems.length === 0 ? (
              <div className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">回收站为空</div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {trashItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{item.name}</p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500">删除于 {new Date(item.deletedAt).toLocaleString('zh-CN')}</p>
                    </div>
                    <div className="flex items-center gap-1 ml-3">
                      <Button variant="ghost" size="sm" onClick={() => handleRestore(item.id)} className="gap-1 text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-950/20">
                        <RotateCcw className="h-3.5 w-3.5" />
                        还原
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setPermanentDeleteId(item.id)} className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30">
                        <Trash2 className="h-3.5 w-3.5" />
                        删除
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
