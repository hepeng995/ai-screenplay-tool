# AI 剧本工坊 (AI Screenplay Workshop)

> 将小说文本自动转换为结构化 YAML 剧本的 AI 辅助创作工具。

## 📺 Demo 视频

> 📌 视频录制中，完成后将在此放置链接

## ✨ 功能概览

| 功能 | 说明 |
|------|------|
| 📤 文件上传 | 支持 .txt/.md 格式，拖拽上传，10MB 以内 |
| ✂️ 章节切分 | 自动识别中英文章节标记（第X章/Chapter N），≥3 章自动检测 |
| 🤖 AI 转换 | 基于 mimo-v2.5 大模型，Edge Runtime 加速，每章独立转换 |
| 👁️ YAML 预览 | 树形结构展示（幕/场/台词），实时统计 |
| ✏️ 在线编辑 | 语法高亮 + 实时校验（Zod Schema + YAML 语法），自动保存 |
| 💾 多格式导出 | 支持 YAML / JSON 格式下载 |
| ☁️ 云端存储 | 七牛云对象存储集成（Token 鉴权 + 客户端直传） |

## 🛠️ 技术栈

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 前端框架 | [Next.js](https://nextjs.org/) | 14.2 | 全栈一体（App Router） |
| UI 框架 | [Tailwind CSS](https://tailwindcss.com/) | 3.4 | 原子化 CSS |
| UI 组件 | shadcn/ui 风格 | - | 自建组件（Button/Card/Input） |
| 图标 | [Lucide React](https://lucide.dev/) | 0.460 | SVG 图标库 |
| YAML 解析 | [js-yaml](https://github.com/nodeca/js-yaml) | 4.1 | YAML 解析与序列化 |
| Schema 校验 | [Zod](https://zod.dev/) | 3.23 | TypeScript-first Schema |
| AI 模型 | mimo-v2.5 | - | 七牛云指定 AI 模型 |
| 云存储 | 七牛云对象存储 | - | 大文件托管 |
| 部署 | [Vercel](https://vercel.com/) | Hobby | 零成本部署（Edge Runtime） |
| 单元测试 | [Vitest](https://vitest.dev/) | 2.1 | Vite 原生测试框架 |
| E2E 测试 | [Playwright](https://playwright.dev/) | 1.48 | 跨浏览器自动化 |
| 代码质量 | ESLint + TypeScript | 5.x / 5.x | 严格类型检查 |

## 🚀 快速开始

### 环境要求

- Node.js ≥ 18.17
- npm ≥ 10

### 安装

```bash
git clone https://github.com/hepeng995/ai-screenplay-tool.git
cd ai-screenplay-tool
npm install
```

### 配置环境变量

创建 `.env.local` 文件：

```env
MIMO_API_KEY=your_mimo_api_key
MIMO_API_URL=https://token-plan-cn.xiaomimimo.com/v1
MIMO_MODEL=mimo-v2.5

# 七牛云配置（可选，Wave 3 后启用）
QINIU_ACCESS_KEY=your_access_key
QINIU_SECRET_KEY=your_secret_key
QINIU_BUCKET=your_bucket_name
QINIU_DOMAIN=your_cdn_domain
```

### 运行

```bash
npm run dev          # 开发模式
npm run build        # 生产构建
npm run start        # 生产运行
npm run test         # 运行测试
npm run test:coverage # 测试覆盖率
npx playwright test  # E2E 测试
```

## 🌐 部署地址

**https://ai-screenplay-tool.vercel.app/**

## 📦 第三方依赖列表

> **作业评分要求声明**：以下为项目使用的第三方依赖，均在 README 中列明。

### 生产依赖
| 依赖 | 说明 | 原创/第三方 |
|------|------|-------------|
| next | Next.js 全栈框架 | 第三方 |
| react / react-dom | React 核心库 | 第三方 |
| tailwindcss | CSS 框架 | 第三方 |
| lucide-react | 图标库 | 第三方 |
| clsx / tailwind-merge | CSS 类名合并工具 | 第三方 |
| js-yaml | YAML 解析库 | 第三方 |
| zod | Schema 校验库 | 第三方 |
| ajv | JSON Schema 校验 | 第三方 |

### 开发依赖
| 依赖 | 说明 |
|------|------|
| typescript | TypeScript 编译器 |
| eslint | 代码规范检查 |
| vitest | 单元测试框架 |
| @playwright/test | E2E 测试框架 |

### 原创部分

以下模块为 **100% 原创** 代码：
- 📂 `src/lib/ai/` — AI Prompt 设计 + mimo 调用封装
- 📂 `src/lib/utils/chapter-splitter.ts` — 中英文章节切分算法
- 📂 `src/lib/utils/yaml-validator.ts` — Zod Schema 校验器
- 📂 `src/lib/utils/storage.ts` — localStorage 项目管理
- 📂 `src/components/` — 全部 UI 组件
- 📂 `src/schema/` — YAML Schema 定义
- 📂 `src/app/` — 页面与 API 路由

## 📁 项目结构

```
ai-screenplay-tool/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/convert/        # AI 转换 Edge API
│   │   ├── convert/            # 上传+切分+转换页
│   │   ├── editor/             # YAML 编辑器页
│   │   └── layout.tsx          # 根布局
│   ├── components/
│   │   ├── ui/                 # 基础组件（Button/Card/Input）
│   │   ├── layout/             # 布局组件（Header/Footer）
│   │   ├── upload/             # 文件上传组件
│   │   └── editor/             # 编辑/预览组件
│   ├── lib/
│   │   ├── ai/                 # AI 调用封装
│   │   └── utils/              # 工具函数
│   └── schema/                 # Zod + JSON Schema
├── docs/                       # 项目文档
├── poc/                        # PoC 验证脚本
├── .github/                    # GitHub 配置
│   ├── pull_request_template.md
│   ├── CODEOWNERS
│   └── workflows/ci.yml
└── .sisyphus/                  # 开发计划与笔记
```

## 📄 License

MIT License

## 🔗 相关链接

- [GitHub 仓库](https://github.com/hepeng995/ai-screenplay-tool)
- [七牛云校园编程大赛](https://www.qiniu.com)
- [mimo AI](https://www.xiaomimimo.com)
