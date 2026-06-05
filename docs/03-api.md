# API 接口文档

## 1. API 总览

| 路径 | 方法 | 运行环境 | 说明 |
|------|------|---------|------|
| `/api/convert` | POST | Edge | AI 章节转换 |
| `/api/upload-token` | GET | Edge | 获取七牛云上传 Token |
| `/api/download-url` | GET | Edge | 获取七牛云下载签名 URL |

## 2. POST /api/convert

**AI 驱动的章节 → YAML 剧本转换**

### 请求

```json
{
  "chapterTitle": "第一章 风起",
  "chapterText": "凌天站在山门前，仰望着高耸的石柱..."
}
```

| 字段 | 类型 | 必填 | 限制 |
|------|------|------|------|
| chapterTitle | string | 否 | 默认 "未命名章节" |
| chapterText | string | 是 | ≤10,000 字符 |

### 响应（200）

```json
{
  "success": true,
  "yaml": "script:\n  title: ..."
}
```

### 错误响应

| 状态码 | 原因 |
|--------|------|
| 400 | 章节文本为空 / 超过 10,000 字 |
| 500 | AI 转换失败 / 并发超限 |

### 特点

- **Edge Runtime**：25 秒超时（vs Node.js 10 秒）
- **并发限制**：最多 3 个同时请求（`withConcurrencyLimit`）
- **自动重试**：失败后重试 1 次

---

## 3. GET /api/upload-token

**获取七牛云上传凭证（客户端直传用）**

### 请求参数

```
GET /api/upload-token?key=scripts/project-001/output.yaml
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| key | string | 否 | 文件存储路径，不传则允许客户端自定义 |

### 响应（200）

```json
{
  "success": true,
  "token": "AccessKey:Sign:Policy",
  "expiresAt": 1717900000,
  "uploadUrl": "https://upload.qiniup.com"
}
```

### 错误响应

| 状态码 | 原因 |
|--------|------|
| 500 | 七牛云环境变量未配置 |

### 安全设计

- Token 有效期：1 小时
- SK 仅在服务端使用，不返回给客户端
- PutPolicy 限制文件大小 ≤10MB

---

## 4. GET /api/download-url

**获取七牛云签名下载 URL（私有 Bucket）**

### 请求参数

```
GET /api/download-url?key=scripts/project-001/output.yaml
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| key | string | 是 | 文件在 Bucket 中的 key |

### 响应（200）

```json
{
  "success": true,
  "url": "https://cdn.example.com/file.yaml?e=1717900000&token=AK:Sign"
}
```

### 错误响应

| 状态码 | 原因 |
|--------|------|
| 400 | 缺少 key 参数 |
| 500 | 环境变量未配置 |

---

## 5. 客户端使用示例

```typescript
// 1. AI 转换
const res = await fetch('/api/convert', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ chapterTitle: '第一章', chapterText: '...' }),
});
const { yaml } = await res.json();

// 2. 上传到七牛云
const tokenRes = await fetch('/api/upload-token?key=output.yaml');
const { token, uploadUrl } = await tokenRes.json();
const formData = new FormData();
formData.append('key', 'output.yaml');
formData.append('token', token);
formData.append('file', new Blob([yaml]));
await fetch(uploadUrl, { method: 'POST', body: formData });

// 3. 从七牛云下载
const dlRes = await fetch('/api/download-url?key=output.yaml');
const { url } = await dlRes.json();
const content = await (await fetch(url)).text();
```
