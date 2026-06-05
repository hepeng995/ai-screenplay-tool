# AGENTS.md

中文交流，代码注释使用中文。

## 开发命令

```bash
npm run dev           # 开发服务器（localhost:3000）
npm run build         # 生产构建
npm run lint          # ESLint（next lint）
npm run typecheck     # tsc --noEmit（不含 .next/types 之外的类型生成）
npm test              # Vitest 单元测试（run 模式，不 watch）
npm run test:e2e      # Playwright E2E（自动启动 dev server，仅 chromium）
```

**建议执行顺序**：`lint → typecheck → test → test:e2e`。CI（`.github/workflows/ci.yml`）执行相同链路，但所有步骤 `continue-on-error: true`，CI 通过不代表零错误。

## 关键架构约束

- **Edge Runtime**：所有 API Route（`src/app/api/**/route.ts`）必须 `export const runtime = 'edge'`。`/api/convert` 有 `maxDuration = 25`（Vercel Hobby 限制）。
- **AI 并发限制**：`src/lib/ai/mimo.ts` 内部 in-memory 队列限制最多 **3 个并发** mimo 请求。多实例部署（Vercel）下每个实例独立计数。
- **无数据库**：项目索引存浏览器 `localStorage`（key: `novel-${id}` / `script-${id}`）。七牛云对象存储仅用于大文件托管，不是元数据存储。
- **上传链路**：客户端 → `GET /api/upload-token` 获取短期 Token → 客户端直传七牛云（`https://upload-z2.qiniup.com`，华南 z2 区）。不要在服务端中转文件流。
- **Schema 单一来源**：`src/schema/script.schema.ts`（Zod）是源头，`script.schema.json` 由此推导。修改 Schema 必须同步两处。

## 路径别名

`@/*` → `./src/*`（tsconfig + vitest 均已配置）。

## 环境变量

参考 `.env.example`。**禁止硬编码** AI 相关配置（URL/key/model）到源码——必须从 `process.env` 读取。`作业要求.md`（gitignore）包含真实 key，仅供本地开发参考。

必需变量：
- `MIMO_API_URL`、`MIMO_API_KEY`、`MIMO_MODEL`（AI 转换）
- `QINIU_ACCESS_KEY`、`QINIU_SECRET_KEY`、`QINIU_BUCKET`、`QINIU_REGION`（云端存储）

## Git 与 PR 规范

- **Conventional Commits**：`<type>(<scope>): <subject>`，subject 用中文。type 见 `docs/09-commit-convention.md`。
- **一个 PR 只做一件事**：模板见 `.github/pull_request_template.md`，需包含功能描述、实现思路、测试方式。
- **主分支**：`master`（不是 `main`）。
- **Squash and Merge**：保持主分支历史整洁。
- **合并后必须可运行**：主分支任何时候都应能 `npm run build` 通过。

## 目录约定

| 目录 | 说明 |
|---|---|
| `src/app/` | Next.js App Router（页面 + API Routes） |
| `src/app/api/` | Edge API Routes（convert / upload-token / download-url） |
| `src/components/{ui,layout,upload,editor}/` | UI 组件按功能分组，非 shadcn CLI 生成 |
| `src/lib/ai/` | mimo 调用 + Prompt（原创，禁止引入其他 AI SDK） |
| `src/lib/qiniu/` | 七牛云 Token / 上传 / 下载封装 |
| `src/lib/utils/` | 章节切分、YAML 校验、localStorage 管理、`cn()` |
| `src/schema/` | Zod Schema + JSON Schema（剧本结构定义） |
| `e2e/` | Playwright 测试，baseURL `http://localhost:3000` |
| `docs/` | 项目文档（架构、API、Schema、部署、提交规范等） |
| `poc/` | PoC 验证脚本（**不参与 tsconfig 编译**） |
| `scripts/` | 辅助脚本（如 `validate-yaml.ts`，**不参与 tsconfig 编译**） |

## 测试约束

- **Vitest**：`environment: 'node'`，`globals: true`。测试文件放在对应模块的 `__tests__/` 子目录（如 `src/lib/utils/__tests__/`）。
- **Playwright**：E2E 测试启动真实 dev server，运行前确保端口 3000 可用或让 Playwright 自动启动。仅配置了 chromium。

## 竞赛背景（影响决策）

七牛云校园编程大赛项目。评分包含「开发过程与质量」（40%）——**持续小粒度提交**，严禁临尾突击。每个 PR 都应有明确目的和测试证据。第三方依赖必须在 README 列明并标注原创部分。
