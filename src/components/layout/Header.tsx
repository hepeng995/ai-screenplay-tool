'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PenLine, Home, FileText, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const navItems = [
  { href: '/', label: '首页', icon: Home },
  { href: '/convert', label: '转换', icon: FileText },
  { href: '/editor', label: '编辑器', icon: Edit3 },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <PenLine className="h-6 w-6 text-indigo-600" />
          <span className="text-lg font-bold text-slate-900">AI 剧本工坊</span>
        </Link>

        {/* 导航 */}
        <nav className="flex items-center gap-1">
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
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
