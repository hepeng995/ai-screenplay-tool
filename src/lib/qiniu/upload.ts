/**
 * 七牛云客户端直传工具
 * T3.1: 客户端直接上传到七牛云（不经过服务端转发）
 */

interface UploadResult {
  success: boolean;
  key?: string;
  hash?: string;
  error?: string;
}

interface UploadOptions {
  /** 上传进度回调 (0-100) */
  onProgress?: (percent: number) => void;
}

/**
 * 从服务端获取上传 Token
 */
async function getUploadToken(key?: string): Promise<{
  token: string;
  uploadUrl: string;
}> {
  const params = key ? `?key=${encodeURIComponent(key)}` : '';
  const response = await fetch(`/api/upload-token${params}`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error ?? '获取上传 Token 失败');
  }

  return {
    token: data.token,
    uploadUrl: data.uploadUrl,
  };
}

/**
 * 上传文件到七牛云
 *
 * @param file 文件内容（字符串或 Blob）
 * @param fileName 文件名（作为七牛云 key）
 * @param options 上传选项（进度回调等）
 * @returns 上传结果，包含 key 和 hash
 */
export async function uploadToQiniu(
  file: string | Blob,
  fileName: string,
  options?: UploadOptions,
): Promise<UploadResult> {
  try {
    // 1. 获取上传 Token
    const { token, uploadUrl } = await getUploadToken(fileName);

    // 2. 构建 FormData
    const formData = new FormData();
    formData.append('key', fileName);
    formData.append('token', token);
    const blob = typeof file === 'string' ? new Blob([file], { type: 'text/yaml' }) : file;
    formData.append('file', blob);

    // 3. 使用 XMLHttpRequest 上传（支持进度回调）
    return await new Promise<UploadResult>((resolve) => {
      const xhr = new XMLHttpRequest();

      // 上传进度
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && options?.onProgress) {
          const percent = Math.round((e.loaded / e.total) * 100);
          options.onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({
              success: true,
              key: response.key ?? fileName,
              hash: response.hash,
            });
          } catch {
            resolve({
              success: true,
              key: fileName,
            });
          }
        } else {
          resolve({
            success: false,
            error: `上传失败 (HTTP ${xhr.status})`,
          });
        }
      };

      xhr.onerror = () => {
        resolve({
          success: false,
          error: '网络错误，上传失败',
        });
      };

      xhr.open('POST', uploadUrl);
      xhr.send(formData);
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '上传失败';
    return { success: false, error: message };
  }
}
