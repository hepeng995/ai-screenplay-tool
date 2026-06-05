'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { validateYaml } from '@/lib/utils/yaml-validator';

interface YamlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
}

export function YamlEditor({ value, onChange, onSave }: YamlEditorProps) {
  const [validationStatus, setValidationStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 计算行号数组（行号从 1 开始）
  const lineCount = value.split('\n').length;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 1) }, (_, i) => i + 1);

  // textarea 滚动同步到行号列
  const handleScroll = useCallback(() => {
    if (textareaRef.current) {
      setScrollTop(textareaRef.current.scrollTop);
    }
  }, []);

  // 防抖校验（500ms）
  const runValidation = useCallback(
    (yaml: string) => {
      if (!yaml.trim()) {
        setValidationStatus('idle');
        setErrorMessage(null);
        return;
      }

      setValidationStatus('checking');

      const result = validateYaml(yaml);
      if (result.success) {
        setValidationStatus('valid');
        setErrorMessage(null);
      } else {
        setValidationStatus('invalid');
        const firstError = result.errors?.[0];
        setErrorMessage(firstError ? `${firstError.path || '根节点'}: ${firstError.message}` : '校验失败');
      }
    },
    [],
  );

  // onChange 防抖触发
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runValidation(value), 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, runValidation]);

  // Ctrl+S 保存
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSave]);

  const statusDisplay = {
    idle: { icon: null, text: '', color: '' },
    checking: { icon: Loader2, text: '校验中...', color: 'text-slate-500', spin: true },
    valid: { icon: CheckCircle2, text: '校验通过', color: 'text-green-600' },
    invalid: { icon: AlertCircle, text: '校验失败', color: 'text-red-600' },
  }[validationStatus];

  const StatusIcon = statusDisplay.icon;

  return (
    <div className="flex flex-col h-full">
      {/* 状态栏 */}
      <div data-testid="validation-status" className="flex items-center justify-between px-3 py-2 border-b border-slate-700 bg-slate-800">
        <div className="flex items-center gap-2">
          {StatusIcon && (
            <StatusIcon className={`h-4 w-4 ${statusDisplay.color} ${(statusDisplay as { spin?: boolean }).spin ? 'animate-spin' : ''}`} />
          )}
          <span className={`text-sm ${statusDisplay.color}`}>{statusDisplay.text}</span>
        </div>
        <span className="text-xs text-slate-500">{value.length} 字符</span>
      </div>

      {/* 错误消息 */}
      {validationStatus === 'invalid' && errorMessage && (
        <div className="px-3 py-2 bg-red-950/50 border-b border-red-800">
          <pre data-testid="error-detail" className="text-xs text-red-300 whitespace-pre-wrap font-mono">
            {errorMessage}
          </pre>
        </div>
      )}

      {/* 编辑区 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 行号列 */}
        <div
          aria-hidden="true"
          className="flex-shrink-0 select-none pointer-events-none overflow-hidden bg-slate-800 text-slate-500 font-mono text-sm text-right pr-2 pl-2 pt-4"
          style={{ transform: `translateY(${-scrollTop}px)` }}
        >
          {lineNumbers.map((num) => (
            <div key={num} className="leading-6">
              {num}
            </div>
          ))}
        </div>
        {/* 文本区 */}
        <textarea
          ref={textareaRef}
          data-testid="yaml-editor"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          className="flex-1 w-full bg-slate-900 text-slate-100 font-mono text-sm p-4 outline-none resize-none"
          placeholder="# 在此输入或粘贴 YAML 剧本内容"
          spellCheck={false}
          style={{ lineHeight: '1.5rem' }}
        />
      </div>
    </div>
  );
}
