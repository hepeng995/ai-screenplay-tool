/**
 * 七牛云 Upload Token 生成（Edge Runtime 兼容）
 * T3.1: 服务端生成上传凭证，SK 不暴露到客户端
 *
 * 使用 Web Crypto API 实现 HMAC-SHA1，无需 qiniu SDK
 */

/** 上传策略 */
interface PutPolicy {
  /** 资源空间名（Bucket） */
  scope: string;
  /** 过期时间戳（秒） */
  deadline: number;
  /** 返回体格式（可选） */
  returnUrl?: string;
  /** 文件 MIME 限制（可选） */
  mimeLimit?: string;
  /** 文件大小限制（字节，可选） */
  fsizeLimit?: number;
}

/**
 * URL-safe Base64 编码（七牛云规范）
 * 将 + 替换为 -，/ 替换为 _，保留 = 填充
 *
 * NOTE: 七牛云要求保留 base64 填充字符 "="
 */
function urlSafeBase64Encode(data: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let result = '';
  let i = 0;

  while (i < data.length) {
    const byte1 = data[i++];
    const byte2 = i < data.length ? data[i++] : -1;
    const byte3 = i < data.length ? data[i++] : -1;

    result += chars[byte1 >> 2];
    result += chars[((byte1 & 0x03) << 4) | (byte2 >= 0 ? (byte2 >> 4) : 0)];

    if (byte2 >= 0) {
      result += chars[((byte2 & 0x0f) << 2) | (byte3 >= 0 ? (byte3 >> 6) : 0)];
    }
    if (byte3 >= 0) {
      result += chars[byte3 & 0x3f];
    }
  }

  // 添加 base64 标准填充
  const padding = data.length % 3;
  if (padding === 1) {
    result += '==';
  } else if (padding === 2) {
    result += '=';
  }

  return result;
}

/**
 * 使用 Web Crypto API 计算 HMAC-SHA1 签名
 */
async function hmacSha1(key: string, message: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();

  // 导入密钥
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );

  // 计算签名
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));

  return new Uint8Array(signature);
}

/**
 * 生成七牛云上传凭证
 *
 * @param key 文件名（可选，如不指定则允许客户端自定义）
 * @param expiresInSeconds 有效期（秒），默认 3600（1 小时）
 * @returns uploadToken 字符串
 */
export async function generateUploadToken(
  key?: string,
  expiresInSeconds: number = 3600,
): Promise<{ token: string; expiresAt: number }> {
  const accessKey = process.env.QINIU_ACCESS_KEY;
  const secretKey = process.env.QINIU_SECRET_KEY;
  const bucket = process.env.QINIU_BUCKET;

  if (!accessKey || !secretKey || !bucket) {
    throw new Error('七牛云环境变量未配置：请设置 QINIU_ACCESS_KEY, QINIU_SECRET_KEY, QINIU_BUCKET');
  }

  // 构建上传策略
  const deadline = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const scope = key ? `${bucket}:${key}` : bucket;

  const putPolicy: PutPolicy = {
    scope,
    deadline,
    fsizeLimit: 10 * 1024 * 1024, // 10MB
  };

  // 编码 putPolicy → URL-safe Base64（保留 = 填充）
  const encodedPolicy = urlSafeBase64Encode(
    new TextEncoder().encode(JSON.stringify(putPolicy)),
  );

  // 计算 HMAC-SHA1 签名
  const sign = await hmacSha1(secretKey, encodedPolicy);
  const encodedSign = urlSafeBase64Encode(sign);

  // 拼接 Token: AccessKey:EncodedSign:EncodedPolicy
  const token = `${accessKey}:${encodedSign}:${encodedPolicy}`;

  return {
    token,
    expiresAt: deadline,
  };
}

/**
 * 生成七牛云私有空间下载签名 URL
 *
 * @param key 文件在 Bucket 中的 key
 * @param expiresInSeconds 有效期（秒），默认 3600
 * @returns 签名后的下载 URL
 */
export async function generateDownloadUrl(
  key: string,
  expiresInSeconds: number = 3600,
): Promise<string> {
  const accessKey = process.env.QINIU_ACCESS_KEY;
  const secretKey = process.env.QINIU_SECRET_KEY;
  const domain = process.env.QINIU_DOMAIN;

  if (!accessKey || !secretKey || !domain) {
    throw new Error('七牛云环境变量未配置：请设置 QINIU_ACCESS_KEY, QINIU_SECRET_KEY, QINIU_DOMAIN');
  }

  // 基础 URL（使用 HTTPS 确保传输安全）
  const baseUrl = `https://${domain}/${encodeURIComponent(key)}`;

  // 添加过期时间戳
  const deadline = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const urlToSign = `${baseUrl}?e=${deadline}`;

  // 计算 HMAC-SHA1 签名
  const sign = await hmacSha1(secretKey, urlToSign);
  const encodedSign = urlSafeBase64Encode(sign);

  // 返回签名后的 URL
  return `${urlToSign}&token=${accessKey}:${encodedSign}`;
}
