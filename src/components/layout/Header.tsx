'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PenLine, Home, FileText, Edit3, Menu, X, Keyboard, Sun, Moon } from 'lucide-react';
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
  // 暗色模式
  const [darkMode, setDarkMode] = useState(false);

  // 初始化暗色模式（从 localStorage 或系统偏好读取）
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      setDarkMode(true);
    }
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return next;
    });
  }, []);

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
    <header className="sticky top-0 z-40 h-16 border-b border-zinc-200 bg-white/80 backdrop-blur-lg dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white transition-colors group-hover:bg-teal-700 dark:bg-teal-500 dark:group-hover:bg-teal-400">
            <PenLine className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-tight">AI 剧本工坊</span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-tight hidden sm:block">小说 → YAML 剧本</span>
          </div>
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
                  'relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                  active
                    ? 'text-teal-600 dark:text-teal-400'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100',
                )}
                aria-label={label}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                {/* 底部指示器 */}
                {active && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-teal-600 dark:bg-teal-400" />
                )}
              </Link>
            );
          })}

          {/* 分隔线 */}
          <div className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-800" />

          {/* 暗色模式切换 */}
          <button
            type="button"
            onClick={toggleDarkMode}
            className="flex items-center justify-center rounded-lg p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-all duration-200 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
            title={darkMode ? '切换到亮色模式' : '切换到暗色模式'}
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* 快捷键帮助按钮 */}
          <div className="relative" ref={shortcutsRef}>
            <button
              type="button"
              onClick={() => setShortcutsOpen(!shortcutsOpen)}
              className="flex items-center justify-center rounded-lg p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-all duration-200 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
              title="快捷键帮助 (Ctrl+/)"
            >
              <Keyboard className="h-4 w-4" />
            </button>
            {shortcutsOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900 z-50 p-4">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">键盘快捷键</h3>
                <div className="space-y-2">
                  {shortcuts.map(({ keys, desc }) => (
                    <div key={keys} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-600 dark:text-zinc-400">{desc}</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-500 font-mono dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400">
                        {keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* 移动端：暗色模式 + 汉堡菜单 */}
        <div className="flex md:hidden items-center gap-1">
          <button
            type="button"
            onClick={toggleDarkMode}
            className="flex items-center justify-center rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            title={darkMode ? '切换到亮色模式' : '切换到暗色模式'}
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className="p-2 rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="菜单"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* 移动端下拉菜单 */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <nav className="flex flex-col p-2">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    active
                      ? 'text-teal-600 bg-teal-50 dark:text-teal-400 dark:bg-teal-950/30'
                      : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800',
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
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors text-left dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              <Keyboard className="h-4 w-4" />
              快捷键帮助
            </button>
          </nav>
        </div>
      )}

      {/* 移动端快捷键面板（全屏覆盖） */}
      {shortcutsOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-zinc-900/50" onClick={() => setShortcutsOpen(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 max-h-[60vh] overflow-auto dark:bg-zinc-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">键盘快捷键</h3>
              <button type="button" onClick={() => setShortcutsOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              {shortcuts.map(({ keys, desc }) => (
                <div key={keys} className="flex items-center justify-between">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">{desc}</span>
                  <kbd className="px-2 py-1 rounded-lg bg-zinc-100 border border-zinc-200 text-xs text-zinc-500 font-mono dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400">
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
