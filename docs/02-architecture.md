# 技术架构文档

> 本文档将包含完整的技术架构设计。

## 技术栈

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 前端框架 | Next.js 14 (App Router) | 全栈一体 |
| 样式 | Tailwind CSS + shadcn/ui | 原子化 CSS |
| AI | mimo-v2.5 | 七牛云指定模型 |
| 存储 | 七牛云对象存储 | 大文件托管 |
| 部署 | Vercel Hobby | 零成本 |
| 测试 | Vitest + Playwright | 全链路覆盖 |

## 架构图

```
用户浏览器 ←→ Next.js Edge API ←→ mimo AI API
                   ↓
              七牛云存储
```

> 📌 详细架构图和数据流将在后续 PR 中补充
