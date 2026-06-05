# 贡献指南

感谢你对 AI 剧本工坊项目的关注！本文档帮助你快速参与开发。

## 开发环境搭建

### 环境要求

- Node.js ≥ 18.17
- npm ≥ 10

### 步骤

1. Fork 仓库
2. 克隆到本地：`git clone https://github.com/<your-username>/ai-screenplay-tool.git`
3. 安装依赖：`npm install`
4. 复制环境变量：`cp .env.example .env.local`
5. 启动开发服务器：`npm run dev`
6. 打开 http://localhost:3000

### 环境变量

参考 `.env.example`，需配置：

- `MIMO_API_URL` / `MIMO_API_KEY` / `MIMO_MODEL` — AI 转换（必需）
- `QINIU_ACCESS_KEY` / `QINIU_SECRET_KEY` / `QINIU_BUCKET` / `QINIU_REGION` — 云存储（可选，Wave 3 后启用）

> 禁止将真实 API Key 提交到代码仓库。`作业要求.md` 已加入 `.gitignore`，仅供本地参考。

## 分支策略

- `master` — 主分支，始终保持可运行状态（`npm run build` 通过）
- `feat/<scope>` — 新功能开发
- `fix/<scope>` — Bug 修复
- `docs/<scope>` — 文档更新
- `test/<scope>` — 测试相关
- `ci/<scope>` — CI/CD 相关

## 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>(<scope>): <中文描述>
```

### Type 列表

| Type     | 说明             |
| -------- | ---------------- |
| feat     | 新功能           |
| fix      | Bug 修复         |
| docs     | 文档变更         |
| test     | 测试相关         |
| refactor | 代码重构         |
| chore    | 构建/工具链变更  |
| ci       | CI/CD 变更       |
| style    | 代码格式调整     |

### 示例

```
feat(editor): 添加 YAML 一键格式化按钮
fix(preview): YamlPreview 类型定义与 Zod Schema 对齐
test(api): 添加三个 API Route 的单元测试
docs: 添加 CONTRIBUTING.md 贡献指南
```

## PR 流程

1. 从 `master` 创建功能分支
2. 开发并编写测试
3. 本地验证：`npm run lint && npm run typecheck && npm test && npm run build`
4. 提交代码（遵循提交规范）
5. 推送到远程
6. 创建 PR 到 `master`
7. PR 模板需填写：功能描述、实现思路、测试方式
8. 等待 CI 检查通过
9. Squash and Merge

### PR 注意事项

- **一个 PR 只做一件事**，保持变更范围最小
- PR 合并后主分支需保持可运行状态
- 持续小粒度提交，避免一次性大规模提交（竞赛评分考察「开发过程与质量」）
- PR 模板参考 `.github/pull_request_template.md`，需勾选检查清单

## 代码风格

- **框架**：React + Next.js 14（App Router，Edge Runtime）
- **样式**：Tailwind CSS（原子化 CSS）
- **语言**：TypeScript（严格模式）
- **注释**：中文
- **图标**：Lucide React
- **路径别名**：`@/*` → `./src/*`（tsconfig + vitest 均已配置）
- **组件风格**：参考 `src/components/ui/` 下的 Button/Card 组件，shadcn/ui 风格手写组件

### 关键架构约束

- 所有 API Route 必须 `export const runtime = 'edge'`
- `/api/convert` 的 `maxDuration = 25`（Vercel Hobby 限制）
- AI 相关配置（URL/key/model）禁止硬编码，必须从 `process.env` 读取
- `src/schema/script.schema.ts`（Zod）是 Schema 单一来源，修改需同步 `script.schema.json`
- 客户端直传七牛云，不在服务端中转文件流

## 测试约定

### 单元测试

- **框架**：Vitest（globals 模式，node 环境）
- **位置**：对应模块的 `__tests__/` 子目录（如 `src/lib/utils/__tests__/`）
- **命令**：`npm test`

### 组件测试

- **环境**：jsdom（文件顶部添加 `// @vitest-environment jsdom`）
- **框架**：@testing-library/react

### E2E 测试

- **框架**：Playwright（仅 chromium）
- **位置**：`e2e/` 目录
- **命令**：`npm run test:e2e`（自动启动 dev server）
- **baseURL**：http://localhost:3000

### 建议执行顺序

```
npm run lint → npm run typecheck → npm test → npm run test:e2e
```

CI（`.github/workflows/ci.yml`）执行相同链路。

## 项目结构

```
src/
├── app/                    # Next.js App Router（页面 + API Routes）
│   ├── api/                # Edge API Routes（convert / upload-token / download-url）
│   ├── convert/            # 上传+切分+转换页
│   └── editor/             # YAML 编辑器页
├── components/
│   ├── ui/                 # 基础组件（Button/Card/Input）
│   ├── layout/             # 布局组件（Header/Footer）
│   ├── upload/             # 上传组件
│   └── editor/             # 编辑/预览组件
├── lib/
│   ├── ai/                 # mimo 调用 + Prompt（原创，禁止引入其他 AI SDK）
│   ├── qiniu/              # 七牛云 Token / 上传 / 下载封装
│   └── utils/              # 章节切分、YAML 校验、localStorage、cn()
└── schema/                 # Zod Schema + JSON Schema（剧本结构定义）

e2e/                        # Playwright 测试
docs/                       # 项目文档
poc/                        # PoC 验证脚本（不参与 tsconfig 编译）
scripts/                    # 辅助脚本（不参与 tsconfig 编译）
```

## 问题反馈

如有问题，请通过 [GitHub Issues](https://github.com/hepeng995/ai-screenplay-tool/issues) 反馈。
