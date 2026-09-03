import { test, expect } from '@playwright/test';

test('solo Workout Builder renders one navigation shell and usable builder content', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop builder visual contract');
  await page.goto('/#/demo/solo');
  await expect(page.locator('#piq-loader')).toHaveClass(/hidden/, { timeout: 8000 });
  await expect(page.locator('#piq-app')).toHaveClass(/mounted/);

  const builderLink = page.locator('.sidebar-link').filter({ hasText: 'Builder' }).first();
  await expect(builderLink).toBeVisible();
  await builderLink.click();

  await expect(page.getByRole('heading', { name: /Workout Builder/i })).toBeVisible();
  await expect(page.locator('#tab-programs')).toBeVisible();
  await expect(page.locator('#tab-build')).toBeVisible();
  await expect(page.locator('#tab-library')).toBeVisible();
  await expect(page.locator('#piq-main .view-with-sidebar > .sidebar')).toBeHidden();

  // The route may remember the last selected tab. Explicitly open Top Programs
  // before asserting program-card visibility.
  await page.locator('#tab-programs').click();
  await expect(page.locator('#view-programs')).toBeVisible();
  await expect(page.locator('#piq-main .piq-prog-card').first()).toBeVisible();
  await expect(page.locator('#piq-main .piq-load-btn').first()).toBeVisible();

  await page.locator('#tab-build').click();
  await expect(page.getByText('Workout details')).toBeVisible();
  await expect(page.locator('#b-title')).toBeVisible();
  await expect(page.locator('#b-day-type')).toBeVisible();
  await expect(page.getByRole('button', { name: /Browse library/i })).toBeVisible();
});
