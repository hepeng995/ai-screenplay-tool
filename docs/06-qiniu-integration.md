# 七牛云集成文档

> 本文档将包含七牛云存储集成的详细说明。

## 集成范围

- 文件上传：直传七牛云对象存储
- 文件下载：通过七牛云 CDN 加速
- 鉴权方式：服务端生成上传 Token

## 配置

环境变量需设置：

```env
QINIU_ACCESS_KEY=your_access_key
QINIU_SECRET_KEY=your_secret_key
QINIU_BUCKET=your_bucket_name
QINIU_DOMAIN=your_cdn_domain
```

> 📌 详细集成步骤将在 Wave 3 开发时补充
