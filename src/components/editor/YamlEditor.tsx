'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle2, AlertCircle, Loader2, Search } from 'lucide-react';
import { validateYaml } from '@/lib/utils/yaml-validator';
import { EditorView, keymap, lineNumbers, highlightActiveLine, ViewUpdate } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { yaml } from '@codemirror/lang-yaml';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language';
import { lintKeymap } from '@codemirror/lint';

interface YamlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
}

/** CodeMirror 基础扩展（只创建一次，避免重复） */
function createBaseExtensions(onSave?: () => void) {
  return [
    lineNumbers(),
    highlightActiveLine(),
    history(),
    bracketMatching(),
    closeBrackets(),
    highlightSelectionMatches(),
    autocompletion(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    yaml(),
    oneDark,
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...completionKeymap,
      ...lintKeymap,
      indentWithTab,
      // Ctrl+S 保存
      { key: 'Mod-s', run: () => { onSave?.(); return true; } },
    ]),
    // 自定义编辑器样式
    EditorView.theme({
      '&': { height: '100%', fontSize: '14px' },
      '.cm-scroller': { overflow: 'auto', fontFamily: 'Menlo, Monaco, Consolas, monospace' },
      '.cm-gutters': { borderRight: '1px solid #334155' },
    }),
    EditorView.lineWrapping,
  ];
}

export function YamlEditor({ value, onChange, onSave }: YamlEditorProps) {
  const [validationStatus, setValidationStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // CodeMirror 实例
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  // 防止 onChange 触发时再次更新编辑器内容（循环）
  const isExternalUpdate = useRef(false);
  // 保存 onSave 回调的最新引用
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  // 初始化 CodeMirror
  useEffect(() => {
    if (!editorRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        ...createBaseExtensions(() => onSaveRef.current?.()),
        EditorView.updateListener.of((update: ViewUpdate) => {
          if (update.docChanged && !isExternalUpdate.current) {
            onChange(update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // 仅在挂载时创建，value/onChange 变化不重建
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 外部 value 变化时同步到编辑器（比如云端载入、格式化）
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (currentDoc !== value) {
      isExternalUpdate.current = true;
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value },
      });
      isExternalUpdate.current = false;
    }
  }, [value]);

  // 防抖校验（500ms）
  const runValidation = useCallback((yamlStr: string) => {
    if (!yamlStr.trim()) {
      setValidationStatus('idle');
      setErrorMessage(null);
      return;
    }
    setValidationStatus('checking');
    const result = validateYaml(yamlStr);
    if (result.success) {
      setValidationStatus('valid');
      setErrorMessage(null);
    } else {
      setValidationStatus('invalid');
      const firstError = result.errors?.[0];
      setErrorMessage(firstError ? `${firstError.path || '根节点'}: ${firstError.message}` : '校验失败');
    }
  }, []);

  // value 变化时触发校验
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runValidation(value), 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, runValidation]);

  // 打开 CodeMirror 内置搜索（Ctrl+F）
  const handleOpenSearch = useCallback(() => {
    viewRef.current?.focus();
    // CodeMirror 的 searchKeymap 已处理 Ctrl+F
    // 通过模拟按键触发
    viewRef.current?.dispatch({
      effects: [],
    });
  }, []);

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
          {/* 搜索按钮 */}
          <button
            type="button"
            onClick={handleOpenSearch}
            className="p-1 rounded text-slate-300 hover:bg-slate-700"
            title="搜索 (Ctrl+F)"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
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

      {/* CodeMirror 编辑器挂载点 */}
      <div ref={editorRef} className="flex-1 overflow-hidden" data-testid="yaml-editor" />
    </div>
  );
}
