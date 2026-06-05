'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createProject, saveNovelText } from '@/lib/utils/storage';
import { toast } from '@/lib/utils/toast';
import jschardet from 'jschardet';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['.txt', '.md'];
const ACCEPTED_MIMES = ['text/plain', 'text/markdown'];

interface FileInfo {
  name: string;
  size: number;
  charCount: number;
  text: string;
  encoding: string;
}

/**
 * 编码名称映射：jschardet 检测结果 → TextDecoder 可用的编码名
 */
const ENCODING_MAP: Record<string, string> = {
  'GB2312': 'gbk',
  'GB18030': 'gbk',
  'gb2312': 'gbk',
  'gb18030': 'gbk',
  'ascii': 'utf-8',
  'UTF-8': 'utf-8',
  'UTF-16LE': 'utf-16le',
  'UTF-16BE': 'utf-16be',
};

/**
 * 使用 jschardet 自动检测编码并解码文件内容
 * 先以 ArrayBuffer 读取二进制数据，检测编码后用 TextDecoder 解码
 */
async function readFileWithAutoEncoding(file: File): Promise<{ text: string; encoding: string }> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // 使用 jschardet 检测编码
  const detected = jschardet.detect(Buffer.from(bytes));

  // 将检测结果映射为 TextDecoder 可用的编码名
  const rawEncoding = detected.encoding ?? 'utf-8';
  const encoding = ENCODING_MAP[rawEncoding] ?? rawEncoding.toLowerCase();

  // 用检测到的编码解码文本
  const decoder = new TextDecoder(encoding, { fatal: false });
  const text = decoder.decode(bytes);

  return { text, encoding: rawEncoding };
}

export function FileUploader() {
  const router = useRouter();
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [reading, setReading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);

    // 验证文件类型
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_TYPES.includes(ext) && !ACCEPTED_MIMES.includes(file.type)) {
      setError(`仅支持 ${ACCEPTED_TYPES.join('、')} 格式文件`);
      return;
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      setError('文件大小超过 10MB 限制');
      return;
    }

    // 读取文件内容（自动检测编码）
    setReading(true);
    try {
      const { text, encoding } = await readFileWithAutoEncoding(file);
      if (!text || !text.trim()) {
        setError('文件内容为空');
        return;
      }
      setFileInfo({
        name: file.name,
        size: file.size,
        charCount: text.length,
        text,
        encoding,
      });
    } catch {
      setError('文件读取失败，请确认文件编码格式');
    } finally {
      setReading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleNext = () => {
    if (!fileInfo) return;

    try {
      // 创建项目并存储文本
      const project = createProject(fileInfo.name);
      saveNovelText(project.id, fileInfo.text);

      // 跳转到转换页
      router.push(`/convert?fileId=${project.id}`);
    } catch (e) {
      // 捕获 localStorage 容量不足等错误
      const message = e instanceof Error ? e.message : '创建项目失败';
      setError(message);
      toast.error(message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>步骤 1：上传小说文件</CardTitle>
        <CardDescription>支持 .txt / .md 纯文本，需包含 3 个以上章节，单文件 ≤ 10MB</CardDescription>
      </CardHeader>
      <CardContent>
        {/* 拖拽上传区 */}
        <label
          data-testid="upload-zone"
          className={`flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <Upload className="h-10 w-10 text-slate-400 mb-2" />
          <span className="text-sm font-medium text-slate-700">
            点击选择文件或拖拽到此处
          </span>
          <span className="text-xs text-slate-400 mt-1">.txt / .md 格式，自动检测编码（UTF-8 / GBK / GB2312）</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>

        {/* 错误提示 */}
        {error && (
          <div data-testid="error-message" className="mt-4 flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 读取中 */}
        {reading && (
          <div className="mt-4 text-center text-sm text-slate-500">
            正在读取文件并检测编码...
          </div>
        )}

        {/* 文件信息 */}
        {fileInfo && (
          <div data-testid="file-info" className="mt-4 rounded-lg bg-slate-50 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span data-testid="file-name" className="font-medium text-slate-900">
                {fileInfo.name}
              </span>
            </div>
            <div className="flex gap-4 text-sm text-slate-500">
              <span>大小：{formatSize(fileInfo.size)}</span>
              <span>字符数：{fileInfo.charCount.toLocaleString()}</span>
              <span>编码：{fileInfo.encoding}</span>
            </div>
            <Button onClick={handleNext} className="w-full gap-2 mt-3" data-testid="next-btn" disabled={reading}>
              下一步：章节切分
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
