import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  esbuild: {
    // 与 Next.js 一致：使用 React 17+ 的 automatic JSX runtime
    // 避免在测试 .tsx 组件时出现 "React is not defined"
    jsx: 'automatic',
  },
  test: {
    environment: 'node',
    globals: true,
    // 排除 Playwright E2E 测试目录（用 npm run test:e2e 单独运行）
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
