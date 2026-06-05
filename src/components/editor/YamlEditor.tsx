'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle2, AlertCircle, Loader2, Undo2, Redo2 } from 'lucide-react';
import { validateYaml } from '@/lib/utils/yaml-validator';

interface YamlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
}

/** 撤销/重做历史栈最大长度 */
const MAX_HISTORY = 50;
/** 历史记录防抖间隔（ms） */
const HISTORY_DEBOUNCE = 1000;

export function YamlEditor({ value, onChange, onSave }: YamlEditorProps) {
  const [validationStatus, setValidationStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // 撤销/重做历史
  const historyRef = useRef<string[]>([value]);
  const historyIdxRef = useRef(0);
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  /** 记录编辑历史（防抖，避免每次按键都记录） */
  const recordHistory = useCallback((newValue: string) => {
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(() => {
      // 如果值没变化就不记录
      const idx = historyIdxRef.current;
      if (historyRef.current[idx] === newValue) return;
      // 截断 redo 部分
      historyRef.current = historyRef.current.slice(0, idx + 1);
      historyRef.current.push(newValue);
      // 限制栈深度
      if (historyRef.current.length > MAX_HISTORY) {
        historyRef.current.shift();
      }
      historyIdxRef.current = historyRef.current.length - 1;
      setCanUndo(historyIdxRef.current > 0);
      setCanRedo(false);
    }, HISTORY_DEBOUNCE);
  }, []);

  /** 撤销 */
  const handleUndo = useCallback(() => {
    if (historyIdxRef.current <= 0) return;
    historyIdxRef.current--;
    const prev = historyRef.current[historyIdxRef.current];
    onChange(prev);
    setCanUndo(historyIdxRef.current > 0);
    setCanRedo(historyIdxRef.current < historyRef.current.length - 1);
  }, [onChange]);

  /** 重做 */
  const handleRedo = useCallback(() => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return;
    historyIdxRef.current++;
    const next = historyRef.current[historyIdxRef.current];
    onChange(next);
    setCanUndo(historyIdxRef.current > 0);
    setCanRedo(historyIdxRef.current < historyRef.current.length - 1);
  }, [onChange]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    };
  }, []);

  // 计算行号数组（行号从 1 开始；尾部换行不产生幽灵行号）
  const lineCount = value === '' ? 1 : value.split('\n').length - (value.endsWith('\n') ? 1 : 0);
  const lineNumbers = Array.from({ length: Math.max(lineCount, 1) }, (_, i) => i + 1);

  // textarea 滚动同步到行号列（直接操作 DOM，避免 React state 渲染延迟）
  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.style.transform = `translateY(${-textareaRef.current.scrollTop}px)`;
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

  // onChange 防抖触发校验 + 记录历史
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runValidation(value), 500);
    recordHistory(value);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, runValidation, recordHistory]);

  // Ctrl+S 保存 + Ctrl+Z 撤销 + Ctrl+Y 重做
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave?.();
      }
      // Ctrl+Z 撤销（仅在编辑器聚焦时）
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (document.activeElement === textareaRef.current) {
          // 让浏览器原生撤销处理，历史栈由 onChange 同步
        }
      }
      // Ctrl+Y / Ctrl+Shift+Z 重做
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        if (document.activeElement === textareaRef.current) {
          // 让浏览器原生重做处理
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSave]);

  const statusDisplay = {
    idle: { icon: null, text: '', color: '', spin: false },
    checking: { icon: Loader2, text: '校验中...', color: 'text-slate-500', spin: true },
    valid: { icon: CheckCircle2, text: '校验通过', color: 'text-green-600', spin: false },
    invalid: { icon: AlertCircle, text: '校验失败', color: 'text-red-600', spin: false },
  }[validationStatus];

  const StatusIcon = statusDisplay.icon;

  return (
    <div className="flex flex-col h-full">
      {/* 状态栏 */}
      <div data-testid="validation-status" className="flex items-center justify-between px-3 py-2 border-b border-slate-700 bg-slate-800">
        <div className="flex items-center gap-2">
          {StatusIcon && (
            <StatusIcon className={`h-4 w-4 ${statusDisplay.color} ${statusDisplay.spin ? 'animate-spin' : ''}`} />
          )}
          <span className={`text-sm ${statusDisplay.color}`}>{statusDisplay.text}</span>
        </div>
        <div className="flex items-center gap-3">
          {/* 撤销/重做按钮 */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              className={`p-1 rounded ${canUndo ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 cursor-not-allowed'}`}
              title="撤销 (Ctrl+Z)"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={!canRedo}
              className={`p-1 rounded ${canRedo ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 cursor-not-allowed'}`}
              title="重做 (Ctrl+Y)"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <span className="text-xs text-slate-500">{value.length} 字符</span>
        </div>
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
          ref={lineNumbersRef}
          aria-hidden="true"
          className="flex-shrink-0 select-none pointer-events-none overflow-hidden bg-slate-800 text-slate-500 font-mono text-sm text-right pr-2 pl-2 pt-4"
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
