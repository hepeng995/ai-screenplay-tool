/** @type {import('next').NextConfig} */
const nextConfig = {
  // 移除 X-Powered-By 响应头（减少技术栈暴露）
  poweredByHeader: false,
  // 启用 React 严格模式（开发时额外检查不安全生命周期）
  reactStrictMode: true,
  // 全局安全响应头
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
