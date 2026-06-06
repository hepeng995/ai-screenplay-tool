'use client';

import { useEffect } from 'react';

/**
 * Service Worker 注册组件
 * 在客户端挂载后注册 SW，实现 PWA 离线支持
 */
export function SWRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW 注册失败不影响应用正常运行
      });
    }
  }, []);

  return null;
}
