'use client';

import { FileText, Edit3, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function EditorPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">YAML 剧本编辑器</h1>
      <p className="text-slate-500 mb-8">在线编辑、校验、预览和导出 YAML 剧本</p>

      <div className="grid grid-cols-2 gap-6">
        {/* 编辑区（占位） */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-slate-400" />
                <CardTitle>编辑区</CardTitle>
              </div>
              <span className="text-xs text-slate-400">YAML</span>
            </div>
            <CardDescription>实时语法校验 + Schema 结构校验</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-96 rounded-md bg-slate-900 p-4 font-mono text-sm text-slate-300 overflow-auto">
              <pre>{`# YAML 剧本内容将显示在此处
# 上传并转换后自动填充`}</pre>
            </div>
          </CardContent>
        </Card>

        {/* 预览区（占位） */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-400" />
                <CardTitle>预览区</CardTitle>
              </div>
              <Button variant="outline" size="sm" disabled>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                导出
              </Button>
            </div>
            <CardDescription>结构化预览剧本内容</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-96 rounded-md bg-slate-50 flex items-center justify-center">
              <div className="text-center text-slate-400">
                <FileText className="mx-auto h-8 w-8 mb-2" />
                <p className="text-sm">预览将在编辑时实时更新</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
