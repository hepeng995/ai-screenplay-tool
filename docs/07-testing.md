# 测试策略文档

> 本文档将包含完整的测试策略定义。

## 测试金字塔

```
         /\
        /E2E\        ← Playwright (10%)
       /------\
      /Integ. \      ← API 路由测试 (20%)
     /----------\
    /   Unit     \   ← Vitest (70%)
   /--------------\
```

## 工具

- **单元测试**：Vitest + React Testing Library
- **E2E 测试**：Playwright
- **Schema 校验**：Zod + AJV

> 📌 详细测试用例将在 Wave 5 开发时补充
