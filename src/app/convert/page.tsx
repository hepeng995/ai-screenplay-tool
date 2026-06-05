'use client';

import { useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ConvertPage() {
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">上传与转换</h1>
      <p className="text-slate-500 mb-8">上传小说文本，自动切分章节并调用 AI 转换为 YAML 剧本</p>

      {/* 上传区域 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>步骤 1：上传小说文件</CardTitle>
          <CardDescription>支持 .txt 纯文本，需包含 3 个以上章节，单文件 ≤ 10MB</CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all">
            <Upload className="h-10 w-10 text-slate-400 mb-2" />
            <span className="text-sm font-medium text-slate-700">
              {fileName ?? '点击选择文件或拖拽到此处'}
            </span>
            <span className="text-xs text-slate-400 mt-1">.txt 格式，UTF-8 编码</span>
            <input
              type="file"
              accept=".txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setFileName(f.name);
              }}
            />
          </label>
        </CardContent>
      </Card>

      {/* 章节切分预览（占位） */}
      <Card className="mb-6 opacity-50">
        <CardHeader>
          <CardTitle>步骤 2：章节切分预览</CardTitle>
          <CardDescription>上传文件后自动识别章节边界</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-400">
            <FileText className="mx-auto h-8 w-8 mb-2" />
            <p className="text-sm">请先上传文件</p>
          </div>
        </CardContent>
      </Card>

      {/* AI 转换按钮（占位） */}
      <div className="text-center">
        <Button size="lg" disabled>
          开始 AI 转换
        </Button>
        <p className="mt-3 text-xs text-slate-400">
          转换过程可能需要 30-90 秒，请耐心等待
        </p>
      </div>
    </div>
  );
}
