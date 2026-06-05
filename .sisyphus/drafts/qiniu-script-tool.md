# Draft: 七牛云AI辅助剧本创作工具 - 需求记录

## 已确认需求（来自用户原始描述）

### 项目基础信息
- **项目本地根目录**：`F:\program\qiniu_dome\`
- **作业要求文件**：`F:\program\qiniu_dome\作业要求.md`
- **开发周期**：2周（单人开发）
- **部署要求**：零成本、可真实上线生产运行
- **核心技术约束**：七牛云对象存储 + 指定AI接口

### 评分规则
- 40% 作品完整度与创新性
- 40% 开发过程与质量（PR/Commit规范、代码质量）
- 20% 演示与表达（Demo视频）

### 强制提交规则
1. 公开 Github/Gitee 仓库 + Demo视频 + 完整README
2. 全周期持续提交，禁止突击
3. PR：一PR一事，需含标题/功能描述/实现思路/测试方式
4. 第三方依赖必须在README列明
5. 独立交付：YAML Schema 文档 + 设计原因
6. Demo视频：语音讲解、覆盖核心功能、公开链接放README
7. 100%原创，重复率<50%

### 核心功能需求
1. 手动输入/文件上传 ≥3 章节小说文本
2. 调用AI接口自动转换为YAML剧本
3. 剧本在线编辑、预览
4. 剧本文件导出、七牛云存储
5. 独立交付YAML Schema文档

### AI固定配置（来自作业要求文档）
- URL：`https://token-plan-cn.xiaomimimo.com/v1`
- Model：`mimo-v2.5`
- APIKey：作业文档中已给出（生产中按用户配置）

## 已确认决策（访谈结论）

### 1. 技术栈：Next.js 14 全栈
- React 18 + TypeScript
- App Router + API Routes
- Tailwind CSS + shadcn/ui（轻量UI库）
- Prisma + SQLite（本地开发）/ PostgreSQL（生产：Neon/Supabase免费版）
- 部署：Vercel（零成本）

### 2. 测试策略：完整测试体系
- 单元测试：Vitest + React Testing Library
- API集成测试：Vitest + supertest
- E2E测试：Playwright
- Schema校验：Zod

### 3. 工作模式：先生成完整计划文档
- 先输出 `.sisyphus/plans/qiniu-script-tool-mvp.md`
- 用户审阅后运行 `/start-work` 启动执行

### 4. 七牛云集成
- qiniu-js SDK（浏览器端上传）
- 服务端生成上传Token（API Route）
- 存储桶：小说原文 + 剧本导出文件

### 5. AI接口集成
- 服务端API Route代理调用（保护API Key）
- 调用地址：https://token-plan-cn.xiaomimimo.com/v1/chat/completions
- 模型：mimo-v2.5
- 使用OpenAI兼容协议

## Metis 关键发现（差距分析）

### 关键风险（必须在计划中处理）
1. **Vercel 10秒超时风险**：AI生成可能超时 → 改用 Edge Runtime 或流式响应或拆分请求
2. **mimo PoC 未验证**：Wave 0 必须包含 PoC 任务
3. **测试样本未准备**：作为前置条件
4. **七牛云账号状态未知**：作为 Day 0 前置任务

### Scope 砍除决策（默认应用）
- ❌ 数据库（Neon）— 改用本地文件 + 七牛云存储
- ❌ 用户登录系统 — 单用户模式
- ❌ 富文本编辑器 — 改用 textarea
- ❌ AI 流式响应 — Loading 状态足够
- ❌ 版本历史/批注/多模板/i18n/移动端/PDF导出

### 关键 Guardrails（写入 Must NOT Have）
- API Key 隔离（仅服务端）
- YAML 必须经过 Schema 校验
- 章节切分必须有用户预览确认
- 单文件 10MB 上限
- AI 并发 ≤3、超时 60s、重试 2 次

### 计划结构调整
- 增加 Wave 0（环境准备 + PoC）
- 共 8 个 Wave（0-7 + Final）
- 文档生成贯穿所有 Wave（交叉进行）

## 研究发现

### 作业要求文档关键信息
- 题目：开发AI辅助剧本创作工具，降低小说改编门槛
- 要求：3章节以上 → YAML剧本 + Schema定义文档
- API已在作业文档中给出（不是用户填写）

## 开放问题
1. 技术栈选型？
2. 测试策略？
3. 用户是否已有七牛云账号？
4. 是否已有Github账号？仓库是否已创建？
5. 是否已有演示视频录制能力（OBS等）？
