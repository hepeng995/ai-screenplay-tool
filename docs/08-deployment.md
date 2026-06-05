# 部署指南

> 本文档将包含完整的部署流程说明。

## 部署平台

- **前端 + API**：Vercel Hobby（零成本）
- **存储**：七牛云免费额度
- **域名**：Vercel 自动分配 + 自定义域名

## 环境变量

在 Vercel Dashboard 中配置以下环境变量：

| 变量名 | 说明 |
|--------|------|
| `MIMO_API_KEY` | mimo AI 接口密钥 |
| `MIMO_API_URL` | mimo API 地址 |
| `QINIU_ACCESS_KEY` | 七牛云 AK |
| `QINIU_SECRET_KEY` | 七牛云 SK |
| `QINIU_BUCKET` | 存储空间名 |
| `QINIU_DOMAIN` | CDN 域名 |

> 📌 详细 CI/CD 配置将在 Wave 6 开发时补充
