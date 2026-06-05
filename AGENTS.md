# AGENTS.md

中文交流，代码注释使用中文。

## 开发命令

```bash
npm run dev           # 开发服务器（localhost:3000）
npm run build         # 生产构建
npm run lint          # ESLint（next lint）
npm run typecheck     # tsc --noEmit
npm test              # Vitest 单元测试（run 模式，不 watch）
npm run test:e2e      # Playwright E2E（自动启动 dev server，仅 chromium）
```

CI（`.github/workflows/ci.yml`）执行顺序：`typecheck → lint → test → build`（失败会真实阻塞，无 `continue-on-error`）。CI 不跑 `test:e2e`。

运行单个测试文件：`npm test -- src/lib/utils/__tests__/chapter-splitter.test.ts`

## 关键架构约束

- **Edge Runtime**：所有 API Route（`src/app/api/**/route.ts`）必须 `export const runtime = 'edge'`。`/api/convert` 有 `maxDuration = 25`（Vercel Hobby 限制）。
- **AI 并发限制**：`src/lib/ai/mimo.ts` 内部 in-memory 队列限制最多 **3 个并发** mimo 请求（`MAX_CONCURRENT = 3`）。多实例部署（Vercel）下每个实例独立计数。
- **无数据库**：项目索引存浏览器 localStorage，key 为 `ai-script-projects`（项目列表）、`novel-${id}`（小说原文）、`yaml-${id}`（YAML 内容）。七牛云对象存储仅用于大文件托管，不是元数据存储。
- **上传链路**：客户端 → `GET /api/upload-token` 获取短期 Token → 客户端直传七牛云（`https://upload-z2.qiniup.com`，华南 z2 区，URL 硬编码在 `src/app/api/upload-token/route.ts`）。**不要**在服务端中转文件流。
- **七牛 Token 签名**：使用 Web Crypto API 实现 HMAC-SHA1（`src/lib/qiniu/token.ts`），**不要**引入 `qiniu` npm 包（Edge Runtime 不兼容 Node SDK）。
- **Schema 单一来源**：`src/schema/script.schema.ts`（Zod）是源头，`script.schema.json` 由此推导。修改 Schema 必须同步两处。

## 路径别名

`@/*` → `./src/*`（`tsconfig.json` + `vitest.config.ts` 均已配置）。

## 环境变量

参考 `.env.example`，但注意**已知错误**：`.env.example` 写的是 `QINIU_REGION`，实际代码用的是 `QINIU_DOMAIN`。

**禁止硬编码** AI 相关配置（URL/key/model）到源码——必须从 `process.env` 读取。

必需变量（以代码实际读取为准，见 `src/lib/ai/mimo.ts` + `src/lib/qiniu/token.ts`）：
- `MIMO_API_URL`、`MIMO_API_KEY`、`MIMO_MODEL`（AI 转换）
- `QINIU_ACCESS_KEY`、`QINIU_SECRET_KEY`、`QINIU_BUCKET`（上传 Token）
- `QINIU_DOMAIN`（下载签名 URL，**不是** `QINIU_REGION`）

`作业要求.md`（gitignore）包含真实 key，仅供本地开发参考。

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
| `src/lib/qiniu/` | 七牛云 Token / 上传 / 下载封装（Web Crypto，无 SDK） |
| `src/lib/utils/` | 章节切分、YAML 校验、localStorage 管理、`cn()` |
| `src/schema/` | Zod Schema + JSON Schema（剧本结构定义） |
| `e2e/` | Playwright 测试，baseURL `http://localhost:3000` |
| `docs/` | 项目文档（架构、API、Schema、部署、提交规范等） |
| `poc/` | PoC 验证脚本（**不参与 tsconfig 编译**，有独立 `package.json`） |
| `scripts/` | 辅助脚本（如 `validate-yaml.ts`，**不参与 tsconfig 编译**） |

`tsconfig.json` 的 `exclude` 除 `node_modules` 外还包含 `poc`、`scripts`。

## 测试约束

- **Vitest**：默认 `environment: 'node'`，`globals: true`。React 组件测试需在文件顶部加 `// @vitest-environment jsdom` 注解（见 `src/components/editor/__tests__/YamlEditor.test.tsx`）。测试文件放在对应模块的 `__tests__/` 子目录。
- **Playwright**：E2E 测试启动真实 dev server，运行前确保端口 3000 可用或让 Playwright 自动启动。仅配置了 chromium。

## 竞赛背景（影响决策）

七牛云校园编程大赛项目。评分包含「开发过程与质量」（40%）——**持续小粒度提交**，严禁临尾突击。每个 PR 都应有明确目的和测试证据。第三方依赖必须在 README 列明并标注原创部分。
