'use client';

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import yaml from 'js-yaml';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Edit3, Download, Save, FileJson, FileText, CloudUpload, CloudDownload, Wand2, Eye, Users, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { YamlEditor } from '@/components/editor/YamlEditor';
import { YamlPreview, type RegenerateTarget } from '@/components/editor/YamlPreview';
import { CharacterGraph } from '@/components/editor/CharacterGraph';
import { SourceTextView } from '@/components/editor/SourceTextView';
import { EditorSkeleton } from '@/components/skeleton/EditorSkeleton';
import { loadYamlContent, saveYamlContent, loadProject, saveProject, loadNovelText } from '@/lib/utils/storage';
import { uploadToQiniu } from '@/lib/qiniu/upload';
import { downloadFromQiniu } from '@/lib/qiniu/download';
import { validateYaml } from '@/lib/utils/yaml-validator';
import { exportToDocx } from '@/lib/export/docx-exporter';
import { toast } from '@/lib/utils/toast';

/** 预览区 Tab 定义 */
const PREVIEW_TABS = [
  { id: 'preview' as const, label: '结构', icon: Eye },
  { id: 'graph' as const, label: '图谱', icon: Users },
  { id: 'source' as const, label: '原文', icon: BookOpen },
];

function EditorContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('id');
  const reduce = useReducedMotion();

  const [yamlContent, setYamlContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<'idle' | 'uploading' | 'downloading' | 'success' | 'error'>('idle');
  const [cloudMessage, setCloudMessage] = useState<string>('');
  // 局部重新生成状态
  const [regenerating, setRegenerating] = useState(false);
  // 保存状态定时器引用（避免组件卸载后仍触发状态更新）
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 导出菜单引用（用于点击外部关闭）
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // 共享的 YAML 校验结果（编辑器和预览区共用，单一事实来源）
  const validationResult = useMemo(() => {
    if (!yamlContent || !yamlContent.trim()) return null;
    return validateYaml(yamlContent);
  }, [yamlContent]);
  // 移动端编辑/预览切换（lg 及以上忽略此状态，始终双栏）
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor');
  // 预览区 Tab：结构预览 / 角色图谱 / 原文对照
  const [previewTab, setPreviewTab] = useState<'preview' | 'graph' | 'source'>('preview');
  // 小说原文（用于原文对照 Tab，按需加载一次）
  const [novelText, setNovelText] = useState<string | null>(null);

  // 记录上次保存的内容，避免无变化时触发保存
  const lastSavedContentRef = useRef<string>('');

  // 加载项目信息和 YAML 内容
  useEffect(() => {
    if (!projectId) return;
    const project = loadProject(projectId);
    if (project) {
      setProjectName(project.name);
    }
    const yamlText = loadYamlContent(projectId);
    if (yamlText) {
      setYamlContent(yamlText);
      // 初始加载时同步 ref，避免立即触发无意义的保存
      lastSavedContentRef.current = yamlText;
    }
    // 加载小说原文（原文对照 Tab 使用，可能为 null）
    setNovelText(loadNovelText(projectId));
  }, [projectId]);
  useEffect(() => {
    if (!projectId || !yamlContent) return;
    // 内容与上次保存一致，跳过
    if (yamlContent === lastSavedContentRef.current) return;
    const timer = setTimeout(() => {
      saveYamlContent(projectId, yamlContent);
      lastSavedContentRef.current = yamlContent;
      setSaveStatus('saved');
      setLastSavedAt(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      const project = loadProject(projectId);
      if (project) {
        project.status = 'edited';
        saveProject(project);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [yamlContent, projectId]);

  const handleManualSave = useCallback(() => {
    if (!projectId) return;
    saveYamlContent(projectId, yamlContent);
    setSaveStatus('saved');
    setLastSavedAt(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    // 清除上一次的定时器，避免多次触发叠加；卸载时由 useEffect 兜底清理
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
  }, [projectId, yamlContent]);

  // 组件卸载时清理定时器，防止内存泄漏与对已卸载组件的状态更新
  useEffect(() => {
    return () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  }, []);

  // 导出菜单：点击外部关闭
  useEffect(() => {
    if (!showExportMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);

  /** 格式化 YAML：解析后重新序列化，统一缩进和换行 */
  const handleFormatYaml = useCallback(() => {
    if (!yamlContent.trim()) {
      toast.info('内容为空，无需格式化');
      return;
    }
    try {
      const parsed = yaml.load(yamlContent);
      const formatted = yaml.dump(parsed, { indent: 2, lineWidth: 120 });
      setYamlContent(formatted);
      toast.success('YAML 格式化完成');
    } catch (e) {
      toast.error('YAML 格式化失败：' + (e instanceof Error ? e.message : '语法错误'));
    }
  }, [yamlContent]);

  const handleExportYaml = useCallback(() => {
    const blob = new Blob([yamlContent], { type: 'text/yaml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `script-${projectId ?? 'export'}-${new Date().toISOString().slice(0, 10)}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }, [yamlContent, projectId]);

  const handleExportJson = useCallback(() => {
    try {
      const parsed = yaml.load(yamlContent);
      const jsonStr = JSON.stringify(parsed, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `script-${projectId ?? 'export'}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('YAML 解析失败，无法导出 JSON：' + (e instanceof Error ? e.message : String(e)));
    }
    setShowExportMenu(false);
  }, [yamlContent, projectId]);

  /** 导出 Word 文档 */
  const handleExportWord = useCallback(() => {
    if (!validationResult?.success || !validationResult.data) {
      toast.error('请先确保 YAML 校验通过后再导出 Word');
      setShowExportMenu(false);
      return;
    }
    exportToDocx(validationResult.data, {
      filename: `剧本-${validationResult.data.script.title || 'export'}-${new Date().toISOString().slice(0, 10)}.docx`,
    })
      .then(() => toast.success('Word 文档已导出'))
      .catch((e) => toast.error('导出 Word 失败：' + (e instanceof Error ? e.message : String(e))));
    setShowExportMenu(false);
  }, [validationResult]);

  // 七牛云上传
  const handleCloudUpload = useCallback(async () => {
    if (!projectId || !yamlContent) return;
    setCloudStatus('uploading');
    setCloudMessage('正在上传到七牛云...');

    const fileName = `scripts/${projectId}/script-${new Date().toISOString().slice(0, 10)}.yaml`;
    const result = await uploadToQiniu(yamlContent, fileName, {
      onProgress: (pct) => {
        setCloudMessage(`上传进度: ${pct}%`);
      },
    });

    if (result.success) {
      setCloudStatus('success');
      setCloudMessage(`上传成功！文件Key: ${result.key}`);
      toast.success('上传成功！');
      // 更新项目的 qiniuKey
      const project = loadProject(projectId);
      if (project) {
        project.qiniuKey = result.key;
        saveProject(project);
      }
      setTimeout(() => { setCloudStatus('idle'); setCloudMessage(''); }, 3000);
    } else {
      setCloudStatus('error');
      setCloudMessage(result.error ?? '上传失败');
      toast.error(result.error ?? '上传失败');
      setTimeout(() => { setCloudStatus('idle'); setCloudMessage(''); }, 5000);
    }
  }, [projectId, yamlContent]);

  // 七牛云下载确认（本地有内容时先确认）
  const [showCloudDownloadConfirm, setShowCloudDownloadConfirm] = useState(false);

  const handleCloudDownload = useCallback(async () => {
    setShowCloudDownloadConfirm(false);
    if (!projectId) return;
    const project = loadProject(projectId);
    if (!project?.qiniuKey) {
      setCloudStatus('error');
      setCloudMessage('未找到云端文件记录');
      setTimeout(() => { setCloudStatus('idle'); setCloudMessage(''); }, 3000);
      return;
    }

    setCloudStatus('downloading');
    setCloudMessage('正在从七牛云下载...');

    const result = await downloadFromQiniu(project.qiniuKey);

    if (result.success && result.content) {
      setYamlContent(result.content);
      saveYamlContent(projectId, result.content);
      setCloudStatus('success');
      setCloudMessage('下载成功！已载入编辑器。');
      toast.success('下载成功！已载入编辑器。');
      setTimeout(() => { setCloudStatus('idle'); setCloudMessage(''); }, 3000);
    } else {
      setCloudStatus('error');
      setCloudMessage(result.error ?? '下载失败');
      toast.error(result.error ?? '下载失败');
      setTimeout(() => { setCloudStatus('idle'); setCloudMessage(''); }, 5000);
    }
  }, [projectId]);

  const handleCloudDownloadClick = useCallback(() => {
    // 本地有内容时先弹出确认，防止覆盖
    if (yamlContent.trim()) {
      setShowCloudDownloadConfirm(true);
    } else {
      handleCloudDownload();
    }
  }, [yamlContent, handleCloudDownload]);

  /** 局部重新生成（场景/台词）：调用 AI 后按定位就地替换对应节点 */
  const handleRegenerate = useCallback(async (type: 'scene' | 'dialogue', context: string, target: RegenerateTarget) => {
    if (regenerating) return;
    setRegenerating(true);
    toast.info(`正在重新生成${type === 'scene' ? '场景' : '台词'}，请稍候...`);

    try {
      const res = await fetch('/api/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, context }),
      });
      const data = await res.json();

      if (!data.success || !data.yaml) {
        toast.error(data.error ?? '重新生成失败');
        return;
      }

      // 解析 AI 返回的片段（可能是 { scene: {...} } / { dialogue: {...} } / 直接节点对象）
      let fragment: unknown;
      try {
        fragment = yaml.load(data.yaml);
      } catch {
        toast.error('重新生成结果解析失败，已忽略');
        return;
      }
      const frag = fragment && typeof fragment === 'object' ? (fragment as Record<string, unknown>) : null;
      const candidate =
        type === 'scene'
          ? frag?.scene && typeof frag.scene === 'object' ? frag.scene : frag
          : frag?.dialogue && typeof frag.dialogue === 'object' ? frag.dialogue : frag;
      if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
        toast.error('重新生成结果格式不正确，已忽略');
        return;
      }
      const newNode = candidate as Record<string, unknown>;

      // 按 target 路径就地替换，再回写到编辑器
      const doc = yaml.load(yamlContent);
      if (!doc || typeof doc !== 'object') {
        toast.error('当前剧本无法解析，无法替换');
        return;
      }
      const acts = (doc as { acts?: unknown }).acts;
      const act = Array.isArray(acts) ? (acts[target.actIdx] as Record<string, unknown> | undefined) : undefined;
      const scenes = act && Array.isArray(act.scenes) ? (act.scenes as unknown[]) : null;
      if (!scenes || !scenes[target.sceneIdx]) {
        toast.error('未定位到目标场景，已忽略');
        return;
      }
      if (type === 'scene') {
        // 保留原场景编号，避免 AI 重新编号打乱顺序
        const original = scenes[target.sceneIdx] as Record<string, unknown>;
        if (typeof original.scene_number === 'number') newNode.scene_number = original.scene_number;
        scenes[target.sceneIdx] = newNode;
      } else {
        const scene = scenes[target.sceneIdx] as Record<string, unknown>;
        const dialogues = Array.isArray(scene.dialogues) ? (scene.dialogues as unknown[]) : null;
        if (!dialogues || target.dlgIdx === undefined || !dialogues[target.dlgIdx]) {
          toast.error('未定位到目标台词，已忽略');
          return;
        }
        dialogues[target.dlgIdx] = newNode;
      }
      setYamlContent(yaml.dump(doc, { indent: 2, lineWidth: 120, sortKeys: false }));
      toast.success(`已就地替换${type === 'scene' ? '场景' : '台词'}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '重新生成请求失败');
    } finally {
      setRegenerating(false);
    }
  }, [regenerating, yamlContent]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* 无项目时的空状态引导 */}
      {!projectId ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <motion.div
            animate={reduce ? {} : { y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Edit3 className="h-16 w-16 text-zinc-200 dark:text-zinc-700 mb-4" />
          </motion.div>
          <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300 mb-2">未选择项目</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">请先从首页选择或创建一个项目</p>
          <Link href="/">
            <Button className="gap-2">
              <FileText className="h-4 w-4" />
              返回首页
            </Button>
          </Link>
        </div>
      ) : (
      <>
      {/* 面包屑 */}
      <nav className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/" className="hover:text-teal-600 dark:hover:text-teal-400">首页</Link>
        <span className="mx-1.5">/</span>
        <span className="text-zinc-900 dark:text-zinc-100 font-medium">YAML 剧本编辑器</span>
        {projectName && (
          <>
            <span className="mx-1.5">/</span>
            <span className="text-teal-600 dark:text-teal-400">{projectName}</span>
          </>
        )}
      </nav>
      {/* 顶部工具栏 */}
      <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            YAML 剧本编辑器
            {projectName && (
              <span className="ml-2 text-base font-normal text-teal-600 dark:text-teal-400">· {projectName}</span>
            )}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">在线编辑 · 实时校验 · 多格式导出 · 云端同步</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {saveStatus === 'saved' && lastSavedAt && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">✓ 已保存 {lastSavedAt}</span>
          )}
          {cloudMessage && (
            <span data-testid="cloud-status" className={`text-xs ${cloudStatus === 'error' ? 'text-red-600 dark:text-red-400' : cloudStatus === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-sky-600 dark:text-sky-400'}`}>
              {cloudMessage}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleManualSave} className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            保存
          </Button>
          <Button variant="outline" size="sm" onClick={handleFormatYaml} className="gap-1.5" title="格式化 YAML">
            <Wand2 className="h-3.5 w-3.5" />
            格式化
          </Button>
          {/* 导出下拉 - 带入场动画 */}
          <div className="relative" ref={exportMenuRef}>
            <Button variant="outline" size="sm" onClick={() => setShowExportMenu(!showExportMenu)} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              导出
            </Button>
            <AnimatePresence>
              {showExportMenu && (
                <motion.div
                  initial={reduce ? false : { opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="absolute right-0 mt-1 w-44 rounded-lg border border-zinc-200 bg-white shadow-lg z-10 dark:border-zinc-700 dark:bg-zinc-900 origin-top-right"
                >
                  <button
                    onClick={handleExportYaml}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-t-lg"
                  >
                    <FileText className="h-4 w-4 text-zinc-400" />
                    导出 YAML
                  </button>
                  <button
                    onClick={handleExportJson}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-t border-zinc-100 dark:border-zinc-800"
                  >
                    <FileJson className="h-4 w-4 text-zinc-400" />
                    导出 JSON
                  </button>
                  <button
                    onClick={handleExportWord}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-t border-zinc-100 dark:border-zinc-800 rounded-b-lg"
                  >
                    <FileText className="h-4 w-4 text-teal-500" />
                    导出 Word
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCloudUpload}
            disabled={cloudStatus === 'uploading' || cloudStatus === 'downloading' || !yamlContent}
            className="gap-1.5"
            title="上传到七牛云"
          >
            <CloudUpload className="h-3.5 w-3.5" />
            {cloudStatus === 'uploading' ? '上传中...' : '上传云端'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCloudDownloadClick}
            disabled={cloudStatus === 'uploading' || cloudStatus === 'downloading'}
            className="gap-1.5"
            title="从七牛云载入"
          >
            <CloudDownload className="h-3.5 w-3.5" />
            {cloudStatus === 'downloading' ? '下载中...' : '云端载入'}
          </Button>
        </div>
      </div>

      {/* 云端载入确认弹窗 */}
      <Dialog
        open={showCloudDownloadConfirm}
        title="确认载入云端内容"
        description="载入云端内容将覆盖当前编辑器的本地内容，此操作不可撤销。确定要继续吗？"
        confirmText="确认载入"
        variant="danger"
        onConfirm={handleCloudDownload}
        onCancel={() => setShowCloudDownloadConfirm(false)}
      />

      {/* 移动端编辑/预览切换按钮 - 带滑动背景 */}
      <div className="flex lg:hidden mb-2 relative">
        <div className="flex flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 p-0.5 gap-0.5 relative">
          <motion.div
            layoutId="mobile-view-indicator"
            className="absolute top-0.5 bottom-0.5 rounded-md bg-teal-600 dark:bg-teal-500"
            style={{ width: 'calc(50% - 2px)' }}
            animate={{ left: mobileView === 'editor' ? '2px' : 'calc(50%)' }}
            transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileView('editor')}
            className={`flex-1 gap-1.5 relative z-10 ${mobileView === 'editor' ? 'text-white' : ''}`}
          >
            <Edit3 className="h-3.5 w-3.5" />
            编辑
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileView('preview')}
            className={`flex-1 gap-1.5 relative z-10 ${mobileView === 'preview' ? 'text-white' : ''}`}
          >
            <Eye className="h-3.5 w-3.5" />
            预览
          </Button>
        </div>
      </div>

      {/* 编辑 + 预览 双栏：小屏按 mobileView 切换显示，lg 及以上双栏并排 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:h-[calc(100vh-200px)]">
        {/* 编辑区 */}
        <Card className={`flex flex-col overflow-hidden h-[70vh] lg:h-auto ${mobileView !== 'editor' ? 'hidden lg:flex' : ''}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
              <CardTitle className="text-base">编辑区</CardTitle>
            </div>
            <CardDescription>实时语法校验 + Schema 结构校验（Ctrl+S 保存）</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <YamlEditor value={yamlContent} onChange={setYamlContent} onSave={handleManualSave} />
          </CardContent>
        </Card>

        {/* 预览区（含 Tab 切换：结构预览 / 角色图谱 / 原文对照） */}
        <Card className={`flex flex-col overflow-hidden h-[70vh] lg:h-auto ${mobileView !== 'preview' ? 'hidden lg:flex' : ''}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">预览区</CardTitle>
              {/* Tab 切换 - layoutId 滑块 */}
              <div className="relative flex border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                {PREVIEW_TABS.map((tab) => {
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPreviewTab(tab.id)}
                      className={`relative px-2.5 py-1 text-xs font-medium transition-colors duration-200 ${
                        previewTab === tab.id
                          ? 'text-white'
                          : 'bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {previewTab === tab.id && (
                        <motion.span
                          layoutId="preview-tab-indicator"
                          className="absolute inset-0 bg-teal-600 dark:bg-teal-500 rounded-[calc(0.375rem-1px)]"
                          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10">
                        <TabIcon className="h-3 w-3 inline mr-1" />{tab.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <CardDescription>
              {previewTab === 'preview' ? '结构化树形预览 + 统计信息' : previewTab === 'graph' ? '角色共现关系图谱' : '对照原始小说文本'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            {previewTab === 'preview' ? (
              <YamlPreview yamlContent={yamlContent} validationResult={validationResult} onRegenerate={handleRegenerate} onContentChange={setYamlContent} />
            ) : previewTab === 'graph' ? (
              validationResult?.success && validationResult.data ? (
                <CharacterGraph data={validationResult.data} />
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-400 dark:text-zinc-500 text-sm">
                  YAML 校验通过后才能查看角色图谱
                </div>
              )
            ) : (
              <SourceTextView text={novelText} />
            )}
          </CardContent>
        </Card>
      </div>
      </>
      )}
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <EditorContent />
    </Suspense>
  );
}
