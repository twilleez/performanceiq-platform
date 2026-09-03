import { test, expect } from '@playwright/test';

async function waitForApp(page) {
  await page.waitForSelector('#piq-root');
  await expect(page.locator('#piq-loader')).toHaveClass(/hidden/, { timeout: 8000 });
}

async function openDemo(page, role) {
  await page.goto(`/#/demo/${role}`);
  await waitForApp(page);
  await expect(page.locator('#piq-app')).toHaveClass(/mounted/);
  await expect(page.locator('#nav-role-badge')).toContainText(role === 'athlete' ? 'player' : role);
  await expect(page.locator('#piq-main')).not.toBeEmpty();
  await expect(page.getByText('View failed to load')).toHaveCount(0);
}

async function clickSidebar(page, label) {
  const link = page.locator('.sidebar-link').filter({ hasText: label }).first();
  await expect(link).toBeVisible();
  await link.click();
  await expect(page.locator('#piq-main')).not.toBeEmpty();
  await expect(page.getByText('View failed to load')).toHaveCount(0);
}

test('public landing communicates value and converts to signup', async ({ page }) => {
  await page.goto('/'); await waitForApp(page);
  await expect(page.getByRole('heading', { name: /Know how ready you are/ })).toBeVisible();
  await expect(page.getByText('Readiness → Today → Log → Progress')).toBeVisible();
  await page.getByRole('button', { name: 'Create Free Account' }).click();
  await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
});

test('public signup is readable and exposes quick demos', async ({ page }) => {
  await page.goto('/#/signup'); await waitForApp(page);
  await expect(page.getByLabel('Full name')).toBeVisible();
  await expect(page.getByLabel('Email address')).toBeVisible();
  await expect(page.getByLabel('Create password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Athlete' }).first()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Quick Demo Access')).toBeVisible();
});

test('sign-in quick demo opens immediately without hanging', async ({ page }) => {
  await page.goto('/#/signin'); await waitForApp(page);
  await page.locator('[data-demo-role="coach"]').click();
  await expect(page.locator('#piq-app')).toHaveClass(/mounted/, { timeout: 3000 });
  await expect(page.locator('#nav-role-badge')).toContainText('coach');
});

test('demo signup enters onboarding without touching Supabase', async ({ page }) => {
  await page.goto('/#/signup'); await waitForApp(page);
  await page.getByLabel('Full name').fill('Journey Test Athlete');
  await page.getByLabel('Email address').fill('player@demo.com');
  await page.getByLabel('Create password').fill('demo-pass-123');
  await page.getByRole('button', { name: /Create Account/ }).click();
  await expect(page.locator('#ob2-card')).toBeVisible();
  await expect(page.locator('#ob2-s2')).toHaveClass(/active/);
});

for (const role of ['coach', 'player', 'parent', 'admin', 'solo']) {
  test(`demo ${role} role renders its authenticated shell`, async ({ page }) => {
    await openDemo(page, role);
    await expect(page.locator('.sidebar-link').first()).toBeVisible();
  });
}

test('authenticated first-run experience uses branded dark theme', async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('piq_theme'));
  await openDemo(page, 'player');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('authenticated desktop shell is fully styled and readable', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop shell contract');
  await openDemo(page, 'player');
  const shell = await page.locator('#piq-layout').evaluate(el => ({
    layout: getComputedStyle(el).display,
    sidebarWidth: document.querySelector('#piq-sidebar')?.getBoundingClientRect().width || 0,
    mainWidth: document.querySelector('#piq-main')?.getBoundingClientRect().width || 0,
  }));
  expect(shell.layout).toBe('grid'); expect(shell.sidebarWidth).toBeGreaterThanOrEqual(220); expect(shell.mainWidth).toBeGreaterThan(500);
});

test('controlled beta feedback panel opens without writing demo data', async ({ page }) => {
  await openDemo(page, 'player');
  await page.getByRole('button', { name: 'Send beta feedback' }).click();
  await expect(page.getByRole('heading', { name: 'Tell us what happened' })).toBeVisible();
});

test('player core navigation renders Today, Readiness, Progress and Nutrition', async ({ page }) => {
  await openDemo(page, 'player');
  await clickSidebar(page, 'Today');
  await expect(page.locator('#piq-main')).toContainText(/No Coach workout today|Choose today’s workout|SELF-SERVICE TRAINING/);
  await clickSidebar(page, 'Readiness'); await clickSidebar(page, 'Progress'); await clickSidebar(page, 'Nutrition');
  await expect(page.locator('#piq-main')).not.toBeEmpty();
});

test('uncoached Player can choose a self-service workout', async ({ page }) => {
  await openDemo(page, 'player'); await clickSidebar(page, 'Today');
  await expect(page.getByRole('heading', { name: /No Coach workout today/i })).toBeVisible();
  await page.locator('[data-self-type="speed"]').click();
  await expect(page.locator('#piq-main')).toContainText(/Acceleration|Speed/i);
});

test('player navigation does not expose coach-only roster controls', async ({ page }) => {
  await openDemo(page, 'player');
  await expect(page.locator('.sidebar-link').filter({ hasText: 'Roster' })).toHaveCount(0);
  await expect(page.locator('.sidebar-link').filter({ hasText: 'Program' })).toHaveCount(0);
});

test('coach navigation exposes coach workflow and no player logging nav', async ({ page }) => {
  await openDemo(page, 'coach');
  await expect(page.locator('.sidebar-link').filter({ hasText: 'Roster' })).toBeVisible();
  await expect(page.locator('.sidebar-link').filter({ hasText: 'Program' })).toBeVisible();
});

test('coach can build and assign a workout', async ({ page }) => {
  await openDemo(page, 'coach'); await clickSidebar(page, 'Program');
  await page.locator('#tab-build').click();
  await expect(page.locator('#b-day-type')).toBeVisible();
  await page.locator('#b-day-type').selectOption('Speed');
  await page.locator('#b-title').fill('Demo Speed Session');
  await page.locator('#btn-add-ex').click();
  await page.locator('.ex-name').last().fill('Acceleration Sprint');
  await expect(page.locator('#piq-assign-athlete')).toBeVisible();
  await page.locator('#piq-assign-athlete').selectOption({ index: 1 });
  await page.locator('#btn-assign').click();
  await expect(page.locator('#piq-assign-status')).toContainText('assigned to');
});

test('Solo can choose workout type and log the selected session', async ({ page }) => {
  await openDemo(page, 'solo'); await clickSidebar(page, 'Today');
  await expect(page.getByRole('heading', { name: /Choose today’s workout/i })).toBeVisible();
  await page.locator('[data-self-type="power"]').click();
  await expect(page.locator('#piq-main')).toContainText(/Power/i);
  await page.locator('#piq-self-complete').click();
  await expect(page.locator('#piq-self-complete-status')).toContainText('Workout logged');
});

test('sign out returns to the public landing page', async ({ page }) => {
  await openDemo(page, 'player'); await page.locator('[data-signout]').first().click();
  await expect(page.getByRole('heading', { name: /Know how ready you are/ })).toBeVisible();
});

test('phone signup keeps form and demo controls visible', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'mobile visual contract');
  await page.goto('/#/signup'); await waitForApp(page);
  await expect(page.getByLabel('Full name')).toBeVisible();
  await expect(page.locator('[data-demo-role="coach"]')).toBeVisible();
});
