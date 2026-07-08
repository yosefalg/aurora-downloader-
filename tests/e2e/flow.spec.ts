import { test, expect } from '@playwright/test';

test('full download flow', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page).toHaveTitle(/Aurora/);

  const input = page.locator('input[placeholder="Paste link here..."]');
  await input.fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

  const button = page.locator('button:has-text("Download")');
  await button.click();

  await expect(page.locator('text=Analyzing...')).toBeVisible();
});
