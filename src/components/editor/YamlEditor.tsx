'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { CheckCircle2, AlertCircle, Loader2, Undo2, Redo2, Search, X, ChevronUp, ChevronDown } from 'lucide-react';
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

  // 搜索状态
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchCurrentIdx, setSearchCurrentIdx] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  /** 计算所有匹配位置 */
  const searchMatches = useMemo(() => {
    if (!searchText || !value) return [];
    const indices: number[] = [];
    let searchFrom = 0;
    const lower = value.toLowerCase();
    const term = searchText.toLowerCase();
    while (searchFrom < lower.length) {
      const found = lower.indexOf(term, searchFrom);
      if (found === -1) break;
      indices.push(found);
      searchFrom = found + 1;
    }
    return indices;
  }, [value, searchText]);

  /** 搜索匹配数量 */
  const matchCount = searchMatches.length;

  /** 跳转到指定匹配位置（滚动 textarea 到对应位置） */
  const scrollToMatch = useCallback((idx: number) => {
    if (idx < 0 || idx >= searchMatches.length) return;
    const pos = searchMatches[idx];
    // 计算目标位置所在行
    const textBefore = value.substring(0, pos);
    const lineNumber = textBefore.split('\n').length;
    const lineHeight = 24; // 1.5rem = 24px
    if (textareaRef.current) {
      textareaRef.current.scrollTop = (lineNumber - 3) * lineHeight;
      // 选中匹配文本
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(pos, pos + searchText.length);
    }
  }, [searchMatches, value, searchText]);

  /** 搜索下一个 */
  const searchNext = useCallback(() => {
    if (matchCount === 0) return;
    const next = searchCurrentIdx >= matchCount - 1 ? 0 : searchCurrentIdx + 1;
    setSearchCurrentIdx(next);
    scrollToMatch(next);
  }, [matchCount, searchCurrentIdx, scrollToMatch]);

  /** 搜索上一个 */
  const searchPrev = useCallback(() => {
    if (matchCount === 0) return;
    const prev = searchCurrentIdx <= 0 ? matchCount - 1 : searchCurrentIdx - 1;
    setSearchCurrentIdx(prev);
    scrollToMatch(prev);
  }, [matchCount, searchCurrentIdx, scrollToMatch]);

  /** 打开搜索栏 */
  const openSearch = useCallback(() => {
    setShowSearch(true);
    // 如果 textarea 有选中文本，自动填入搜索框
    if (textareaRef.current) {
      const selected = textareaRef.current.value.substring(
        textareaRef.current.selectionStart,
        textareaRef.current.selectionEnd,
      );
      if (selected) setSearchText(selected);
    }
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, []);

  /** 关闭搜索栏 */
  const closeSearch = useCallback(() => {
    setShowSearch(false);
    setSearchText('');
    setSearchCurrentIdx(-1);
    textareaRef.current?.focus();
  }, []);

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

  // 搜索文本变化时重置索引并跳转到第一个匹配
  useEffect(() => {
    if (matchCount > 0) {
      setSearchCurrentIdx(0);
      scrollToMatch(0);
    } else {
      setSearchCurrentIdx(-1);
    }
  // 仅在 searchText 变化时触发，避免 scrollToMatch 依赖导致的循环
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  // 键盘快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+S 保存
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave?.();
      }
      // Ctrl+F 打开搜索
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        if (showSearch) {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        } else {
          openSearch();
        }
      }
      // Escape 关闭搜索
      if (e.key === 'Escape' && showSearch) {
        e.preventDefault();
        closeSearch();
      }
      // Enter 在搜索框中跳转下一个
      if (e.key === 'Enter' && document.activeElement === searchInputRef.current) {
        e.preventDefault();
        if (e.shiftKey) {
          searchPrev();
        } else {
          searchNext();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSave, showSearch, openSearch, closeSearch, searchNext, searchPrev]);

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
          {/* 搜索按钮 */}
          <button
            type="button"
            onClick={openSearch}
            className="p-1 rounded text-slate-300 hover:bg-slate-700"
            title="搜索 (Ctrl+F)"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
          <span className="text-xs text-slate-500">{value.length} 字符</span>
        </div>
      </div>

      {/* 搜索栏 */}
      {showSearch && (
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-750 border-b border-slate-600 bg-slate-700">
          <Search className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="搜索..."
            className="flex-1 bg-slate-800 text-slate-100 text-sm px-2 py-1 rounded border border-slate-600 outline-none focus:border-indigo-500"
          />
          <span className="text-xs text-slate-400 whitespace-nowrap">
            {matchCount > 0 ? `${searchCurrentIdx + 1}/${matchCount}` : '无匹配'}
          </span>
          <button
            type="button"
            onClick={searchPrev}
            disabled={matchCount === 0}
            className={`p-0.5 rounded ${matchCount > 0 ? 'text-slate-300 hover:bg-slate-600' : 'text-slate-600 cursor-not-allowed'}`}
            title="上一个 (Shift+Enter)"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={searchNext}
            disabled={matchCount === 0}
            className={`p-0.5 rounded ${matchCount > 0 ? 'text-slate-300 hover:bg-slate-600' : 'text-slate-600 cursor-not-allowed'}`}
            title="下一个 (Enter)"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={closeSearch}
            className="p-0.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-600"
            title="关闭 (Esc)"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

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
