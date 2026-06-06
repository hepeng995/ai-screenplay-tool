'use client';

import { useMemo, useState } from 'react';
import { Search, BookOpen } from 'lucide-react';

interface SourceTextViewProps {
  /** 小说原文（无则显示占位） */
  text: string | null;
}

/**
 * 原文对照视图：在编辑剧本时核对 AI 是否漏掉/改错情节。
 * 支持关键词搜索高亮（无搜索时零开销，仅渲染纯文本）。
 */
export function SourceTextView({ text }: SourceTextViewProps) {
  const [query, setQuery] = useState('');

  const matchCount = useMemo(() => {
    if (!text || !query.trim()) return 0;
    return text.toLowerCase().split(query.toLowerCase()).length - 1;
  }, [text, query]);

  const rendered = useMemo(() => {
    if (!text) return null;
    const q = query.trim();
    if (!q) return text;
    // 高亮所有匹配（上限 5000 处，超出后原样输出，避免极端卡顿）
    const parts: React.ReactNode[] = [];
    const lower = text.toLowerCase();
    const ql = q.toLowerCase();
    let i = 0;
    let n = 0;
    while (true) {
      const idx = lower.indexOf(ql, i);
      if (idx < 0) {
        parts.push(text.slice(i));
        break;
      }
      if (idx > i) parts.push(text.slice(i, idx));
      parts.push(
        <mark key={`${idx}-${n}`} className="bg-amber-200 text-amber-900 dark:bg-amber-600/50 dark:text-amber-100 rounded-sm">
          {text.slice(idx, idx + ql.length)}
        </mark>,
      );
      i = idx + ql.length;
      n += 1;
      if (n > 5000) {
        parts.push(text.slice(i));
        break;
      }
    }
    return parts;
  }, [text, query]);

  if (!text) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-400 dark:text-zinc-500 text-sm text-center px-6">
        <div>
          <BookOpen className="mx-auto h-8 w-8 mb-2" />
          <p>该项目没有保存原文</p>
          <p className="mt-1 text-xs">示例剧本或直接导入的项目不含小说原文</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-700 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="在原文中搜索关键词…"
            aria-label="搜索原文"
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
          />
        </div>
        {query.trim() && (
          <span className="text-xs text-zinc-400 dark:text-zinc-500 whitespace-nowrap">{matchCount} 处</span>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4">
        <pre className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-words font-sans leading-relaxed">{rendered}</pre>
      </div>
    </div>
  );
}
