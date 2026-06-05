# 安全模型

> 本文档系统记录 AI 剧本工坊的安全设计，作为 `docs/06-qiniu-integration.md` 的安全补充。
> 集成流程请参考 06 文档，本文专注于：Token 生命周期、速率限制、XSS 防御。

## Token 生命周期

### 1.1 凭证类型

项目使用两种短期凭证，均由服务端 Edge API 签发，**SecretKey 从不离开服务端**：

| 凭证 | 用途 | 签发端点 | 消费端 |
|------|------|---------|--------|
| Upload Token | 客户端直传文件到七牛 Bucket | `GET /api/upload-token` | `POST https://upload-z2.qiniup.com` |
| Download URL | 客户端从私有 Bucket 下载文件 | `GET /api/download-url` | `GET <signed-url>` |

### 1.2 上传 Token 生成流程

源码位置：`src/lib/qiniu/token.ts` `generateUploadToken()`（第 88-126 行）

```
1. 读取环境变量 AK / SK / Bucket（缺失则抛错，第 96-98 行）
2. 计算 deadline = now + 3600（默认 1 小时，可配置，第 101 行）
3. 构建 PutPolicy JSON：
   {
     "scope": "bucket" 或 "bucket:key",
     "deadline": <unix-timestamp>,
     "fsizeLimit": 10485760  // 10MB 硬编码，第 107 行
   }
4. URL-safe Base64 编码 PutPolicy（保留 = 填充，第 28-58 行）
5. HMAC-SHA1(SK, EncodedPolicy) → URL-safe Base64 编码签名（第 63-79 行）
6. 拼接 Token：AK:EncodedSign:EncodedPolicy（第 120 行）
```

**关键安全约束：**

- **SK 不暴露**：SK 仅在 `src/lib/qiniu/token.ts` 内部使用，从不写入响应、日志或客户端可见字段
- **有效期 1 小时**：客户端必须在此窗口内完成上传，超时后七牛拒绝写入
- **文件大小硬限制 10MB**：`fsizeLimit: 10 * 1024 * 1024`（第 107 行），七牛服务端强制
- **Scope 隔离**：Token 绑定具体 Bucket（或 Bucket:Key），跨 Bucket 写入会被七牛拒绝

### 1.3 下载签名 URL 生成流程

源码位置：`src/lib/qiniu/token.ts` `generateDownloadUrl()`（第 135-160 行）

```
1. 构建基础 URL：http://<QINIU_DOMAIN>/<encoded-key>
2. 拼接过期时间戳：?e=<unix-deadline>
3. HMAC-SHA1(SK, urlToSign) → URL-safe Base64 编码
4. 返回完整签名 URL：baseUrl?e=deadline&token=AK:Sign
```

下载 URL 同样 **1 小时有效期**（默认 `expiresInSeconds = 3600`）。过期后客户端需重新调用 `/api/download-url` 获取新 URL。

### 1.4 Token 过期处理

**客户端职责**：

- 上传/下载前检查本地缓存的 `expiresAt` 字段
- 若已过期，必须先调用 `/api/upload-token` 或 `/api/download-url` 重新获取
- **禁止**在客户端缓存 SK 或自行签名

**服务端策略**：

- 不提供 Token 续期接口，过期 Token 由七牛服务端拒绝
- 也不提供 Token 撤销机制（短期有效 + 不复用 即可，撤销无实际收益）

### 1.5 Edge Runtime 兼容性

签名实现严格使用 **Web Crypto API**（`crypto.subtle.importKey` + `crypto.subtle.sign`，第 63-79 行），**不引入** 七牛官方 npm SDK（其依赖 Node `crypto` 模块，Edge Runtime 不可用）。所有 API Route 均声明 `export const runtime = 'edge'`。

## 速率限制

### 2.1 当前状态

**截至本文档创建时（PR-39），项目未对七牛 Token API 部署速率限制**。任何能访问到部署域名的客户端均可无限次调用：

- `GET /api/upload-token`
- `GET /api/download-url`
- `POST /api/convert`（AI 转换，参见 `src/lib/ai/mimo.ts` 内的 in-memory 队列，限制 **3 个并发**但限制每秒请求数）

### 2.2 已知限制：多实例不可靠

Vercel 等平台采用 **Serverless 多实例**部署，每个 Edge Function 实例的内存互相隔离：

- 单实例内的内存计数器（如 `Map`、模块级变量）**无法跨实例同步**
- 攻击者若命中不同实例，可绕过单实例的速率限制
- `src/lib/ai/mimo.ts` 的 `MAX_CONCURRENT = 3` 同样存在此限制

**结论**：纯内存方案适用于「防御意外流量峰值」，**不适用于**「对抗恶意攻击」。

### 2.3 改进路径

| 阶段 | 方案 | 适用场景 |
|------|------|---------|
| 当前 | 无速率限制 | MVP 阶段，依赖七牛/AI 供应商自身的限流 |
| PR-37（规划中） | in-memory 令牌桶 | 防止单实例流量峰值，每实例独立计数 |
| 长期 | Upstash Redis / Vercel KV / Cloudflare KV | 分布式计数，多实例共享，对抗真实攻击 |

### 2.4 七牛云侧防御

即使本端无速率限制，七牛云服务端仍有以下保护：

- AccessKey 维度的请求频率监控（详见七牛控制台）
- 单 Bucket 写入 QPS 限制
- 异常 IP 自动封禁

但**不应**依赖供应商侧防御——应假设攻击者能绕过任意客户端可见的限制。

## XSS 防御

### 3.1 防御策略：React 默认转义

项目所有用户可见的内容均通过 React JSX 表达式 `{value}` 渲染，**不使用** `dangerouslySetInnerHTML`（已在 `src/` 目录全局搜索确认，零命中）。

React 在渲染 `{expression}` 时会自动转义以下字符为 HTML 实体：

| 原字符 | 转义后 |
|--------|--------|
| `<` | `&lt;` |
| `>` | `&gt;` |
| `&` | `&amp;` |
| `"` | `&quot;` |
| `'` | `&#x27;` |

因此用户输入的 `<script>alert(1)</script>` 会被作为纯文本显示，**不会**作为 HTML 执行。

### 3.2 覆盖的渲染路径

项目内所有用户输入的渲染路径均走 React 文本节点：

| 输入源 | 渲染位置 | 安全机制 |
|--------|---------|---------|
| 上传的小说原文 | 编辑器组件（`src/components/editor/`） | React `{content}` |
| AI 转换的 YAML | YAML 预览树（`src/components/editor/YamlPreview.tsx`） | React 文本节点 |
| 用户编辑的 YAML | 在线编辑器 | textarea 受控组件 |
| localStorage 项目元数据 | 项目列表渲染 | React `{project.name}` |
| 错误信息 | Toast / Alert 组件 | React `{message}` |

### 3.3 YAML 渲染安全

YAML 内容的处理链路：

```
用户输入 → js-yaml.load() → JS 对象 → Zod 校验 → React 组件树渲染
```

- `js-yaml.load()` 解析为纯 JS 对象（不执行任意代码）
- Zod Schema（`src/schema/script.schema.ts`）校验结构
- React 组件以文本形式展示字段值（幕/场/台词等）
- 即使 YAML 内嵌 `<script>` 标签，React 也会转义为文本

### 3.4 不引入额外 sanitizer 的理由

由于 React 默认转义已覆盖全部渲染路径，且**未使用** `dangerouslySetInnerHTML`、`eval()`、`new Function()`，项目**当前不引入** DOMPurify 等额外 sanitizer：

- 增加 bundle 体积（DOMPurify ≈ 20KB minified）
- 重复的转义逻辑可能引入 bug
- 与 Edge Runtime 的兼容性需要单独验证

但**若未来**需要支持 Markdown 渲染、HTML 富文本等功能，**必须**引入 sanitizer 并限制输入白名单。

### 3.5 CSP 建议

生产部署建议在 `next.config.js` 或 Vercel 端配置 Content-Security-Policy 响应头：

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
connect-src 'self' https://upload-z2.qiniup.com https://*.qiniucdn.com;
```

当前阶段未配置 CSP（Wave 6+ 任务），依赖 React 转义作为主要 XSS 防线。

## 参考文档

- [七牛云集成文档](./06-qiniu-integration.md) — 集成流程、API 接口、客户端使用
- [项目结构](../README.md) — 模块划分
- 源码索引：
  - `src/lib/qiniu/token.ts` — Token 签名核心
  - `src/app/api/upload-token/route.ts` — 上传 Token 颁发
  - `src/app/api/download-url/route.ts` — 下载 URL 签名
  - `src/lib/ai/mimo.ts` — AI 并发限制（`MAX_CONCURRENT = 3`）
  - `src/schema/script.schema.ts` — YAML 输入校验
