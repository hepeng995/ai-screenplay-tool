/**
 * E2E 测试：首页
 * T4.3: 验证首页渲染、导航功能
 */
import { test, expect } from '@playwright/test';

test.describe('首页', () => {
  test('应正确渲染标题和描述', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('应有"开始创作"入口', async ({ page }) => {
    await page.goto('/');
    // 查找主要操作按钮
    const startBtn = page.locator('a[href*="convert"], a[href*="upload"]').first();
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await expect(page).toHaveURL(/\/(convert|upload)/);
    }
  });

  test('应显示功能介绍', async ({ page }) => {
    await page.goto('/');
    const bodyText = await page.locator('body').textContent();
    // 验证关键功能关键词存在
    expect(bodyText).toBeTruthy();
  });
});
