'use client';

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';

/** 主题类型 */
type Theme = 'light' | 'dark';

/** Hook 返回值 */
interface UseThemeReturn {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'theme';

/** 主题 Context，供子树消费 */
const ThemeContext = createContext<UseThemeReturn>({
  theme: 'light',
  isDark: false,
  toggleTheme: () => {},
});

/** 读取初始主题（SSR 安全） */
function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** 应用主题到 DOM */
function applyTheme(theme: Theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  localStorage.setItem(STORAGE_KEY, theme);
}

/**
 * useTheme Hook
 *
 * 统一管理暗色模式状态，提供 theme / isDark / toggleTheme。
 * 所有使用此 hook 的组件共享同一状态（通过 ThemeProvider）。
 */
export function useTheme(): UseThemeReturn {
  return useContext(ThemeContext);
}

/**
 * ThemeProvider 组件
 *
 * 包裹在应用根部，让所有子组件通过 useTheme() 感知主题状态。
 * 同时监听系统 prefers-color-scheme 变化。
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  // 初始应用
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // 监听系统主题变化（用户未手动设置时跟随系统）
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      // 只有用户没有手动设置时才跟随系统
      if (!localStorage.getItem(STORAGE_KEY)) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
