import { test, expect } from '@playwright/test';

test('solo Workout Builder renders one navigation shell and visible program content', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop builder visual contract');
  await page.goto('/#/demo/solo');
  await expect(page.locator('#piq-loader')).toHaveClass(/hidden/, { timeout: 8000 });
  await expect(page.locator('#piq-app')).toHaveClass(/mounted/);

  const builderLink = page.locator('.sidebar-link').filter({ hasText: 'Builder' }).first();
  await expect(builderLink).toBeVisible();
  await builderLink.click();

  await expect(page.getByRole('heading', { name: /Workout Builder/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Top Programs' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Workout Builder' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Exercise Library' })).toBeVisible();

  // The authenticated shell owns the only visible navigation rail.
  await expect(page.locator('#piq-main .view-with-sidebar > .sidebar')).toBeHidden();

  const tabs = await page.locator('#piq-main .tab-btn').first().evaluate(el => ({
    color: getComputedStyle(el).color,
    bg: getComputedStyle(el).backgroundColor,
  }));
  expect(tabs.color).not.toBe('rgb(0, 0, 0)');

  // Top Programs should render real cards, not an empty navy page.
  await expect(page.locator('#piq-main .piq-prog-card').first()).toBeVisible();
  await expect(page.locator('#piq-main .piq-load-btn').first()).toBeVisible();

  await page.getByRole('button', { name: 'Workout Builder' }).click();
  await expect(page.getByText('Workout details')).toBeVisible();
  await expect(page.getByLabel('Workout name')).toBeVisible();
  await expect(page.getByLabel('Session type')).toBeVisible();
  await expect(page.getByRole('button', { name: /Browse library/i })).toBeVisible();
});
