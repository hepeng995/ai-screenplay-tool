# 七牛云集成文档

## 1. 架构概述

```
浏览器                    Edge API (Vercel)           七牛云
  │                           │                         │
  │  1. GET /api/upload-token │                         │
  │ ─────────────────────────>│                         │
  │                           │  2. HMAC-SHA1 签名      │
  │  { token, uploadUrl }     │  generateUploadToken()  │
  │ <─────────────────────────│                         │
  │                                                     │
  │  3. POST upload.qiniup.com (FormData + token)       │
  │ ────────────────────────────────────────────────────>│
  │                                                     │
  │  4. { key, hash }                                   │
  │ <───────────────────────────────────────────────────│
```

## 2. 安全设计

| 安全要求 | 实现方式 |
|---------|---------|
| SK 不暴露到客户端 | SK 仅在 Edge API Route 中使用（`src/lib/qiniu/token.ts`） |
| Token 短期有效 | 1 小时过期（`deadline: now + 3600`） |
| 文件大小限制 | PutPolicy 中 `fsizeLimit: 10MB` |
| 下载签名 URL | 私有 Bucket 下载需要 HMAC-SHA1 签名 |

## 3. 文件结构

| 文件 | 作用 | 运行环境 |
|------|------|---------|
| `src/lib/qiniu/token.ts` | Token 生成 + 下载 URL 签名 | Edge (服务端) |
| `src/app/api/upload-token/route.ts` | 上传 Token API | Edge (服务端) |
| `src/app/api/download-url/route.ts` | 下载签名 URL API | Edge (服务端) |
| `src/lib/qiniu/upload.ts` | 客户端直传 + 进度回调 | 浏览器 |
| `src/lib/qiniu/download.ts` | 客户端下载 | 浏览器 |

## 4. Token 生成原理（无 qiniu SDK 依赖）

七牛云上传凭证格式：`AccessKey:EncodedSign:EncodedPolicy`

1. 构建 PutPolicy JSON：`{ scope: "bucket:key", deadline: timestamp }`
2. URL-safe Base64 编码 PutPolicy
3. HMAC-SHA1(SecretKey, EncodedPolicy) → URL-safe Base64 编码签名
4. 拼接：`AK:Sign:Policy`

使用 **Web Crypto API** 的 `crypto.subtle.sign('HMAC', key, data)` 实现，完全兼容 Edge Runtime。

## 5. 环境变量

```env
QINIU_ACCESS_KEY=你的AccessKey
QINIU_SECRET_KEY=你的SecretKey
QINIU_BUCKET=你的Bucket名称
QINIU_DOMAIN=你的CDN域名（如 cdn-example.qiniudn.com）
```

## 6. API 接口

### 6.1 获取上传 Token

```
GET /api/upload-token?key=scripts/project-001/output.yaml
```

响应：
```json
{
  "success": true,
  "token": "AK:Sign:Policy",
  "expiresAt": 1717900000,
  "uploadUrl": "https://upload.qiniup.com"
}
```

### 6.2 获取下载 URL

```
GET /api/download-url?key=scripts/project-001/output.yaml
```

响应：
```json
{
  "success": true,
  "url": "https://cdn-example.qiniudn.com/file.yaml?e=1717900000&token=AK:Sign"
}
```

## 7. 客户端使用

```typescript
import { uploadToQiniu } from '@/lib/qiniu/upload';
import { downloadFromQiniu } from '@/lib/qiniu/download';

// 上传
const result = await uploadToQiniu(yamlContent, 'scripts/output.yaml', {
  onProgress: (pct) => console.log(`上传进度: ${pct}%`),
});

// 下载
const downloaded = await downloadFromQiniu('scripts/output.yaml');
```

## 8. 测试覆盖

10 个集成测试（Mock 方式）覆盖：
- Token 格式验证
- 环境变量缺失错误处理
- 上传成功/失败/网络错误场景
- 下载成功/404/空 key 场景
- 安全隔离验证（SK 不泄露）

## 9. 配置步骤

1. 注册七牛云账号 → 实名认证
2. 对象存储 Kodo → 新建 Bucket
3. 密钥管理 → 获取 AK/SK
4. 填入 `.env.local` 或 Vercel 环境变量
5. 完成 — 代码自动生效
