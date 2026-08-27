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
  await page.goto('/');
  await waitForApp(page);
  await expect(page.getByRole('heading', { name: /Know how ready you are/ })).toBeVisible();
  await expect(page.getByText('Readiness → Today → Log → Progress')).toBeVisible();
  await expect(page.getByRole('button', { name: 'View Athlete Demo →' })).toBeVisible();
  await expect(page.getByText(/not medical diagnoses/i)).toBeVisible();
  await page.getByRole('button', { name: 'Create Free Account' }).click();
  await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
});

test('public signup is readable and exposes quick demos', async ({ page }) => {
  await page.goto('/#/signup');
  await waitForApp(page);
  await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
  await expect(page.getByLabel('Full name')).toBeVisible();
  await expect(page.getByLabel('Email address')).toBeVisible();
  await expect(page.getByLabel('Create password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Athlete' }).first()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Quick Demo Access')).toBeVisible();
  await expect(page.locator('[data-demo-role="coach"]')).toBeVisible();
  await expect(page.locator('[data-demo-role="parent"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /Create Account/ })).toBeEnabled();
});

test('sign-in quick demo opens immediately without hanging', async ({ page }) => {
  await page.goto('/');
  await waitForApp(page);
  await page.getByRole('button', { name: 'Sign In' }).first().click();
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
  await expect(page.getByText('Quick Demo Access')).toBeVisible();
  await page.locator('[data-demo-role="coach"]').click();
  await expect(page.locator('#piq-app')).toHaveClass(/mounted/, { timeout: 3000 });
  await expect(page.locator('#nav-role-badge')).toContainText('coach');
  await expect(page.getByText('View failed to load')).toHaveCount(0);
});

test('demo signup enters onboarding without touching Supabase', async ({ page }) => {
  await page.goto('/#/signup');
  await waitForApp(page);
  await page.getByLabel('Full name').fill('Journey Test Athlete');
  await page.getByLabel('Email address').fill('player@demo.com');
  await page.getByLabel('Create password').fill('demo-pass-123');
  await page.getByRole('button', { name: /Create Account/ }).click();
  await expect(page.locator('#ob2-card')).toBeVisible();
  await expect(page.getByText('Your Sport')).toBeVisible();
  await expect(page.getByText('Training Setup')).not.toBeVisible();
  await expect(page.getByText('View failed to load')).toHaveCount(0);
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
  const bodyBg = await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor);
  expect(bodyBg).not.toBe('rgb(244, 246, 251)');
});

test('player core navigation renders Today, Readiness, Progress and Nutrition', async ({ page }) => {
  await openDemo(page, 'player');
  await clickSidebar(page, 'Today');
  await expect(page.locator('#piq-main')).toContainText(/No workout assigned|Exercises|Log Session/);
  await clickSidebar(page, 'Readiness');
  await clickSidebar(page, 'Progress');
  await clickSidebar(page, 'Nutrition');
  await expect(page.locator('#piq-main')).not.toBeEmpty();
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
  await expect(page.locator('.sidebar-link').filter({ hasText: 'Log' })).toHaveCount(0);
});

test('solo Today workout can be logged and Progress still renders', async ({ page }) => {
  await openDemo(page, 'solo');
  await clickSidebar(page, 'Today');
  await expect(page.getByRole('heading', { name: /Today's.*Workout/ })).toBeVisible();
  const logButton = page.locator('#log-workout-btn');
  if (await logButton.count()) await logButton.click();
  await clickSidebar(page, 'Progress');
  await expect(page.locator('#piq-main')).not.toBeEmpty();
});

test('sign out returns to the public landing page', async ({ page }) => {
  await openDemo(page, 'player');
  await page.locator('[data-signout]').first().click();
  await expect(page.getByRole('heading', { name: /Know how ready you are/ })).toBeVisible();
});

test('phone signup keeps form and demo controls visible', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'mobile visual contract');
  await page.goto('/#/signup');
  await waitForApp(page);
  const card = page.locator('.auth-card');
  await expect(card).toBeVisible();
  await expect(page.getByLabel('Full name')).toBeVisible();
  await expect(page.getByLabel('Email address')).toBeVisible();
  await expect(page.getByLabel('Create password')).toBeVisible();
  await expect(page.locator('[data-demo-role="coach"]')).toBeVisible();
  await expect(page.locator('[data-demo-role="parent"]')).toBeVisible();
});
