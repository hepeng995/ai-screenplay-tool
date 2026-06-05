/**
 * 七牛云客户端下载工具
 * T3.2: 从七牛云下载已上传的文件
 */

interface DownloadResult {
  success: boolean;
  content?: string;
  error?: string;
}

/**
 * 从七牛云下载文件内容
 *
 * @param key 文件在七牛云 Bucket 中的 key
 * @returns 文件文本内容
 */
export async function downloadFromQiniu(key: string): Promise<DownloadResult> {
  try {
    // 1. 获取签名下载 URL
    const tokenResponse = await fetch(`/api/download-url?key=${encodeURIComponent(key)}`);
    const tokenData = await tokenResponse.json();

    if (!tokenData.success) {
      throw new Error(tokenData.error ?? '获取下载 URL 失败');
    }

    // 2. 下载文件内容
    const fileResponse = await fetch(tokenData.url);

    if (!fileResponse.ok) {
      throw new Error(`下载失败 (HTTP ${fileResponse.status})`);
    }

    const content = await fileResponse.text();

    return {
      success: true,
      content,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : '下载失败';
    return { success: false, error: message };
  }
}
