'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import yaml from 'js-yaml';
import { Edit3, Download, Save, FileJson, FileText, CloudUpload, CloudDownload, Wand2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { YamlEditor } from '@/components/editor/YamlEditor';
import { YamlPreview } from '@/components/editor/YamlPreview';
import { loadYamlContent, saveYamlContent, loadProject, saveProject } from '@/lib/utils/storage';
import { uploadToQiniu } from '@/lib/qiniu/upload';
import { downloadFromQiniu } from '@/lib/qiniu/download';
import { toast } from '@/lib/utils/toast';

function EditorContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('id');

  const [yamlContent, setYamlContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<'idle' | 'uploading' | 'downloading' | 'success' | 'error'>('idle');
  const [cloudMessage, setCloudMessage] = useState<string>('');
  // 保存状态定时器引用（避免组件卸载后仍触发状态更新）
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 加载 YAML 内容
  useEffect(() => {
    if (!projectId) return;
    const yamlText = loadYamlContent(projectId);
    if (yamlText) {
      setYamlContent(yamlText);
    }
  }, [projectId]);

  // 自动保存（每 5 秒）
  useEffect(() => {
    if (!projectId || !yamlContent) return;
    const timer = setTimeout(() => {
      saveYamlContent(projectId, yamlContent);
      setSaveStatus('saved');
      const project = loadProject(projectId);
      if (project) {
        project.status = 'edited';
        saveProject(project);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [yamlContent, projectId]);

  const handleManualSave = useCallback(() => {
    if (!projectId) return;
    saveYamlContent(projectId, yamlContent);
    setSaveStatus('saved');
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

  // 七牛云下载
  const handleCloudDownload = useCallback(async () => {
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

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* 顶部工具栏 */}
      <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">YAML 剧本编辑器</h1>
          <p className="text-sm text-slate-500">在线编辑 · 实时校验 · 多格式导出 · 云端同步</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {saveStatus === 'saved' && (
            <span className="text-xs text-green-600">已保存</span>
          )}
          {cloudMessage && (
            <span data-testid="cloud-status" className={`text-xs ${cloudStatus === 'error' ? 'text-red-600' : cloudStatus === 'success' ? 'text-green-600' : 'text-blue-600'}`}>
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
          {/* 导出下拉 */}
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setShowExportMenu(!showExportMenu)} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              导出
            </Button>
            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-44 rounded-md border border-slate-200 bg-white shadow-lg z-10">
                <button
                  onClick={handleExportYaml}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <FileText className="h-4 w-4 text-slate-400" />
                  导出 YAML
                </button>
                <button
                  onClick={handleExportJson}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 border-t border-slate-100"
                >
                  <FileJson className="h-4 w-4 text-slate-400" />
                  导出 JSON
                </button>
              </div>
            )}
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
            onClick={handleCloudDownload}
            disabled={cloudStatus === 'uploading' || cloudStatus === 'downloading'}
            className="gap-1.5"
            title="从七牛云载入"
          >
            <CloudDownload className="h-3.5 w-3.5" />
            {cloudStatus === 'downloading' ? '下载中...' : '云端载入'}
          </Button>
        </div>
      </div>

      {/* 编辑 + 预览 双栏：小屏单栏堆叠，lg 及以上双栏并排 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:h-[calc(100vh-200px)]">
        {/* 移动端给每个卡片一个合适的高度，桌面端由 grid 高度驱动 */}
        {/* 编辑区 */}
        <Card className="flex flex-col overflow-hidden h-[60vh] lg:h-auto">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-slate-400" />
              <CardTitle className="text-base">编辑区</CardTitle>
            </div>
            <CardDescription>实时语法校验 + Schema 结构校验（Ctrl+S 保存）</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <YamlEditor value={yamlContent} onChange={setYamlContent} onSave={handleManualSave} />
          </CardContent>
        </Card>

        {/* 预览区 */}
        <Card className="flex flex-col overflow-hidden h-[60vh] lg:h-auto">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">预览区</CardTitle>
            <CardDescription>结构化树形预览 + 统计信息</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <YamlPreview yamlContent={yamlContent} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-8">加载中...</div>}>
      <EditorContent />
    </Suspense>
  );
}
