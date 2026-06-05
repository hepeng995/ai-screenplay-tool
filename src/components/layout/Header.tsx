'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PenLine, Home, FileText, Edit3, Menu, X, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const navItems = [
  { href: '/', label: '首页', icon: Home },
  { href: '/convert', label: '转换', icon: FileText },
  { href: '/editor', label: '编辑器', icon: Edit3 },
];

/** 快捷键列表 */
const shortcuts = [
  { keys: 'Ctrl + S', desc: '保存' },
  { keys: 'Ctrl + F', desc: '搜索' },
  { keys: 'Ctrl + Z', desc: '撤销' },
  { keys: 'Ctrl + Y', desc: '重做' },
  { keys: 'Ctrl + Shift + Z', desc: '重做（备选）' },
  { keys: 'Esc', desc: '关闭弹窗/搜索' },
  { keys: 'Enter', desc: '搜索下一个' },
  { keys: 'Shift + Enter', desc: '搜索上一个' },
  { keys: 'Ctrl + /', desc: '快捷键帮助' },
];

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const shortcutsRef = useRef<HTMLDivElement>(null);

  // Ctrl+/ 打开快捷键帮助
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // 快捷键面板点击外部关闭
  useEffect(() => {
    if (!shortcutsOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (shortcutsRef.current && !shortcutsRef.current.contains(e.target as Node)) {
        setShortcutsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [shortcutsOpen]);

  // Escape 关闭快捷键面板
  const handleShortcutsKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setShortcutsOpen(false);
  }, []);
  useEffect(() => {
    if (shortcutsOpen) {
      document.addEventListener('keydown', handleShortcutsKeyDown);
      return () => document.removeEventListener('keydown', handleShortcutsKeyDown);
    }
  }, [shortcutsOpen, handleShortcutsKeyDown]);

  // 路由变化时关闭移动端菜单
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <PenLine className="h-6 w-6 text-indigo-600" />
          <span className="text-lg font-bold text-slate-900">AI 剧本工坊</span>
        </Link>

        {/* 桌面端导航 */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'text-indigo-600 bg-indigo-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
                )}
                aria-label={label}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            );
          })}
          {/* 快捷键帮助按钮 */}
          <div className="relative" ref={shortcutsRef}>
            <button
              type="button"
              onClick={() => setShortcutsOpen(!shortcutsOpen)}
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="快捷键帮助 (Ctrl+/)"
            >
              <Keyboard className="h-4 w-4" />
            </button>
            {shortcutsOpen && (
              <div className="absolute right-0 mt-1 w-64 rounded-lg border border-slate-200 bg-white shadow-lg z-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">键盘快捷键</h3>
                <div className="space-y-2">
                  {shortcuts.map(({ keys, desc }) => (
                    <div key={keys} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">{desc}</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500 font-mono">
                        {keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* 移动端汉堡菜单按钮 */}
        <button
          type="button"
          className="md:hidden p-2 rounded-md text-slate-600 hover:bg-slate-100"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="菜单"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* 移动端下拉菜单 */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white shadow-sm">
          <nav className="flex flex-col p-2">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'text-indigo-600 bg-indigo-50'
                      : 'text-slate-600 hover:bg-slate-50',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
            {/* 移动端快捷键入口 */}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setShortcutsOpen(true);
              }}
              className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors text-left"
            >
              <Keyboard className="h-4 w-4" />
              快捷键帮助
            </button>
          </nav>
        </div>
      )}

      {/* 移动端快捷键面板（全屏覆盖） */}
      {shortcutsOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-900/50" onClick={() => setShortcutsOpen(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl p-6 max-h-[60vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900">键盘快捷键</h3>
              <button type="button" onClick={() => setShortcutsOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              {shortcuts.map(({ keys, desc }) => (
                <div key={keys} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{desc}</span>
                  <kbd className="px-2 py-1 rounded bg-slate-100 border border-slate-200 text-xs text-slate-500 font-mono">
                    {keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
