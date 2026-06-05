# 部署指南

## 1. 部署平台

| 组件 | 平台 | 费用 |
|------|------|------|
| 前端 + API | Vercel Hobby | 免费 |
| 存储 | 七牛云免费额度（10GB） | 免费 |
| AI | mimo-v2.5（七牛云） | 按调用量计费 |
| 域名 | Vercel 自动分配 `.vercel.app` | 免费 |

## 2. 本地开发环境

### 2.1 前置要求

- Node.js ≥ 18.17
- npm ≥ 10
- Git

### 2.2 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/hepeng995/ai-screenplay-tool.git
cd ai-screenplay-tool

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入实际的 API Key

# 4. 启动开发服务器
npm run dev
```

访问 http://localhost:3000

### 2.3 环境变量

创建 `.env.local` 文件：

```env
# AI 配置（必需）
MIMO_API_KEY=your_mimo_api_key
MIMO_API_URL=https://token-plan-cn.xiaomimimo.com/v1
MIMO_MODEL=mimo-v2.5

# 七牛云配置（Wave 3 后启用）
QINIU_ACCESS_KEY=your_access_key
QINIU_SECRET_KEY=your_secret_key
QINIU_BUCKET=your_bucket_name
QINIU_DOMAIN=your_cdn_domain
```

## 3. 生产部署（Vercel）

### 3.1 创建 Vercel 项目

1. 访问 [vercel.com](https://vercel.com)，用 GitHub 账号登录
2. 点击 "New Project"
3. 选择 `ai-screenplay-tool` 仓库
4. Framework Preset 自动识别为 "Next.js"

### 3.2 配置环境变量

在 Vercel Dashboard → Settings → Environment Variables 中添加：

| 变量名 | 环境 | 说明 |
|--------|------|------|
| `MIMO_API_KEY` | Production + Preview | mimo API 密钥 |
| `MIMO_API_URL` | Production + Preview | `https://token-plan-cn.xiaomimimo.com/v1` |
| `MIMO_MODEL` | Production + Preview | `mimo-v2.5` |
| `QINIU_ACCESS_KEY` | Production | 七牛云 AK |
| `QINIU_SECRET_KEY` | Production | 七牛云 SK |
| `QINIU_BUCKET` | Production | 存储空间名 |
| `QINIU_DOMAIN` | Production | CDN 域名 |

### 3.3 部署

```bash
# 方式一：推送代码自动部署
git push origin master

# 方式二：Vercel CLI
npm i -g vercel
vercel --prod
```

### 3.4 自定义域名（可选）

1. Vercel Dashboard → Settings → Domains
2. 输入自定义域名
3. 按提示添加 DNS 记录（CNAME）

## 4. 七牛云配置

### 4.1 创建存储空间

1. 登录七牛云控制台
2. 创建对象存储空间（Bucket）
3. 记录 Bucket 名称和测试域名

### 4.2 获取密钥

1. 控制台 → 密钥管理
2. 复制 Access Key 和 Secret Key
3. 填入 `.env.local` 或 Vercel 环境变量

## 5. 常见问题

### Q1: AI 转换超时怎么办？

**原因**：mimo-v2.5 处理长文本可能需要 20-90 秒，超过 Vercel Edge Runtime 限制。

**解决**：系统已实现章节切分（每章 ≤4000 字），确保单次请求不超时。如仍超时，检查网络连接。

### Q2: localStorage 容量不够？

**原因**：localStorage 约 5MB 限制。

**解决**：大文件通过七牛云存储，localStorage 仅存元数据和短文本。

### Q3: 部署后页面空白？

**原因**：可能缺少环境变量。

**解决**：检查 Vercel Dashboard 中 `MIMO_API_KEY` 等变量是否已配置。

## 6. CI/CD

GitHub Actions CI 已在 `.github/workflows/ci.yml` 中配置：
- 代码推送自动触发 lint + typecheck + test
- 通过后可手动部署到 Vercel
