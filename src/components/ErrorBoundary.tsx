'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * 全局错误边界组件
 * 捕获子组件树中的未处理异常，展示友好的错误页面
 * 提供"返回首页"和"重新加载"按钮
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 输出到控制台，方便调试（Vercel 会收集这些日志）
    console.error('[ErrorBoundary] 组件崩溃:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30 mb-6">
            <AlertCircle className="h-8 w-8 text-red-500 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            页面出了点问题
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mb-6">
            抱歉，页面遇到了意外错误。请尝试刷新页面或返回首页。
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="mb-6 max-w-lg w-full rounded-lg bg-zinc-900 p-4 text-xs text-red-300 text-left overflow-auto max-h-40">
              {this.state.error.message}
              {this.state.error.stack && (
                <>
                  {'\n\n'}
                  {this.state.error.stack}
                </>
              )}
            </pre>
          )}
          <div className="flex gap-3">
            <Button onClick={this.handleGoHome} variant="outline">
              返回首页
            </Button>
            <Button onClick={this.handleReload}>
              重新加载
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
