'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Edit3, Download, Save, Upload as UploadIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { YamlEditor } from '@/components/editor/YamlEditor';
import { YamlPreview } from '@/components/editor/YamlPreview';
import { loadYamlContent, saveYamlContent, loadProject, saveProject } from '@/lib/utils/storage';

function EditorContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('id');

  const [yamlContent, setYamlContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  // 加载 YAML 内容
  useEffect(() => {
    if (!projectId) return;
    const yaml = loadYamlContent(projectId);
    if (yaml) {
      setYamlContent(yaml);
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
    setTimeout(() => setSaveStatus('idle'), 2000);
  }, [projectId, yamlContent]);

  const handleExport = useCallback(() => {
    const blob = new Blob([yamlContent], { type: 'text/yaml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `script-${projectId ?? 'export'}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  }, [yamlContent, projectId]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* 顶部工具栏 */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">YAML 剧本编辑器</h1>
          <p className="text-sm text-slate-500">在线编辑 · 实时校验 · 多格式导出</p>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === 'saved' && (
            <span className="text-xs text-green-600">已保存</span>
          )}
          <Button variant="outline" size="sm" onClick={handleManualSave} className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            保存
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            导出 YAML
          </Button>
          <Button variant="outline" size="sm" disabled className="gap-1.5" title="七牛云上传（待实现）">
            <UploadIcon className="h-3.5 w-3.5" />
            上传云端
          </Button>
        </div>
      </div>

      {/* 编辑 + 预览 双栏 */}
      <div className="grid grid-cols-2 gap-4 h-[calc(100vh-200px)]">
        {/* 编辑区 */}
        <Card className="flex flex-col overflow-hidden">
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
        <Card className="flex flex-col overflow-hidden">
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
