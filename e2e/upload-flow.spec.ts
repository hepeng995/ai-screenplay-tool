/**
 * E2E 测试：上传 + 章节切分流程
 * T4.3: 验证文件上传页面功能
 */
import { test, expect } from '@playwright/test';

test.describe('上传流程', () => {
  test('上传页面应正确渲染', async ({ page }) => {
    await page.goto('/convert');
    // 验证拖拽区域存在
    const uploadZone = page.locator('[data-testid="upload-zone"], input[type="file"]').first();
    await expect(uploadZone).toBeVisible();
  });

  test('应拒绝非 txt/md 文件', async ({ page }) => {
    await page.goto('/convert');
    const fileInput = page.locator('input[type="file"]');
    // 上传 .csv 文件
    const fakeFile = {
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('a,b,c\n1,2,3'),
    };
    await fileInput.setInputFiles(fakeFile);
    // 应出现错误提示
    await expect(page.locator('[data-testid="error-message"], .text-red-600')).toBeVisible({ timeout: 3000 });
  });

  test('应接受 .txt 文件', async ({ page }) => {
    await page.goto('/convert');
    const fileInput = page.locator('input[type="file"]');

    const novelContent = `第一章 开始

小明走进了房间，打开了灯。

第二章 发展

小红正在窗边看书，听到声音抬起头来。

第三章 结局

两人相视而笑，窗外的夕阳映照着他们的脸庞。`;

    const file = {
      name: 'test-novel.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(novelContent, 'utf-8'),
    };
    await fileInput.setInputFiles(file);

    // 应显示文件信息
    await expect(page.locator('[data-testid="file-info"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="file-name"]')).toContainText('test-novel.txt');
  });
});
