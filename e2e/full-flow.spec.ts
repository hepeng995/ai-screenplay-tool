/**
 * E2E 测试：完整转换流程
 * PR-15: 从首页 → 上传 → 章节切分 → AI 转换 → 编辑器
 *
 * 使用 page.route() mock /api/convert，不依赖真实 AI 服务。
 * Mock YAML 符合 src/schema/script.schema.ts 定义，避免编辑器加载失败。
 */
import { test, expect } from '@playwright/test';

// Mock AI 转换返回的 YAML（符合 ScriptSchema 结构）
const MOCK_YAML = `script:
  title: 测试剧本
  source: 测试小说
  adapted_at: "2026-01-01"
metadata:
  genre: 都市
  characters:
    - 小明
    - 小红
  summary: 测试用剧本摘要
acts:
  - act_number: 1
    title: 第一幕
    scenes:
      - scene_number: 1
        time: 日
        location: 房间内
        characters_present:
          - 小明
          - 小红
        dialogues:
          - character: 小明
            type: 对白
            content: 好的
          - character: 小红
            type: 对白
            content: 你好
`;

// 测试用小说文本（≥3 章，满足章节切分要求）
const NOVEL_CONTENT = `第一章 开始

小明走进了房间，打开了灯。

第二章 发展

小红正在窗边看书，听到声音抬起头来。

第三章 结局

两人相视而笑，窗外的夕阳映照着他们的脸庞。`;

test.describe('完整转换流程', () => {
  // 每个测试前清理 localStorage，避免残留数据影响
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
  });

  test('从首页到编辑器的完整流程', async ({ page }) => {
    // 1. Mock /api/convert 接口（响应格式与 src/app/api/convert/route.ts 一致）
    let convertCallCount = 0;
    let requestBody: string | undefined;
    await page.route('**/api/convert', async (route) => {
      convertCallCount++;
      requestBody = route.request().postData() ?? undefined;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, yaml: MOCK_YAML }),
      });
    });

    // 2. 访问首页，验证标题
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('AI');

    // 3. 点击「开始创作」跳转到 /convert
    await page.click('a[href="/convert"]');
    await page.waitForURL('**/convert');

    // 4. 上传 .txt 文件（通过隐藏的 input[type="file"]）
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-novel.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(NOVEL_CONTENT, 'utf-8'),
    });

    // 5. 验证文件信息出现（FileUploader 渲染 data-testid="file-info"）
    await expect(page.locator('[data-testid="file-info"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="file-name"]')).toContainText('test-novel.txt');

    // 6. 点击「下一步：章节切分」跳转到 /convert?fileId=xxx
    await page.click('[data-testid="next-btn"]');
    await page.waitForURL('**/convert?fileId=*');

    // 7. 等待章节切分预览出现（每章有 data-testid="chapter-N"）
    await expect(page.locator('[data-testid="chapter-1"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="chapter-2"]')).toBeVisible();
    await expect(page.locator('[data-testid="chapter-3"]')).toBeVisible();

    // 8. 点击「开始 AI 转换」按钮
    const convertButton = page.getByRole('button', { name: /开始 AI 转换/ });
    await expect(convertButton).toBeVisible({ timeout: 3000 });
    await convertButton.click();

    // 9. 等待跳转到编辑器（/editor?id=xxx）
    await page.waitForURL('**/editor?id=*', { timeout: 30000 });

    // 10. 验证编辑器页面加载（具体断言：编辑器 textarea 可见且有内容）
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="yaml-editor"]')).toBeVisible({ timeout: 5000 });
    const textarea = page.locator('[data-testid="yaml-editor"]');
    await expect(textarea).not.toHaveValue('', { timeout: 3000 });

    // 11. 验证 mock /api/convert 被精确调用 3 次（NOVEL_CONTENT 有 3 章）
    expect(convertCallCount).toBe(3);

    // 12. 验证请求体包含 chapterText 字段（POST /api/convert 的 payload）
    expect(requestBody).toBeDefined();
    expect(requestBody!).toContain('chapterText');
  });
});
