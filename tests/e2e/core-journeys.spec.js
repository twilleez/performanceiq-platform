import { test, expect } from '@playwright/test';

async function waitForApp(page) {
  await page.waitForSelector('#piq-root');
  await page.waitForTimeout(1400);
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

test('public signup is readable and keyboard accessible', async ({ page }) => {
  await page.goto('/#/signup');
  await waitForApp(page);

  await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
  await expect(page.getByLabel('Full name')).toBeVisible();
  await expect(page.getByLabel('Email address')).toBeVisible();
  await expect(page.getByLabel('Create password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Athlete' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /Create Account/ })).toBeEnabled();
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
  await expect(logButton).toBeVisible();
  await logButton.click();
  await expect(logButton).toContainText('Logged');
  await expect(page.locator('#workout-logged')).toBeVisible();

  await clickSidebar(page, 'Progress');
  await expect(page.locator('#piq-main')).not.toBeEmpty();
});

test('sign out returns a demo user to the public welcome surface', async ({ page }) => {
  await openDemo(page, 'player');
  await page.getByRole('button', { name: 'Sign Out' }).click();
  await expect(page.locator('#piq-app')).not.toHaveClass(/mounted/);
  await expect(page.locator('#piq-splash')).not.toHaveClass(/hidden/);
});

test('phone-width signup controls remain visibly rendered', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), 'mobile-only visual contract');

  await page.goto('/#/signup');
  await waitForApp(page);

  const card = page.locator('.auth-card');
  await expect(card).toBeVisible();
  await expect(page.getByLabel('Full name')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Athlete' })).toBeVisible();

  const input = page.getByLabel('Email address');
  const styles = await input.evaluate(el => {
    const s = getComputedStyle(el);
    return {
      color: s.color,
      backgroundColor: s.backgroundColor,
      opacity: s.opacity,
      visibility: s.visibility,
      display: s.display,
    };
  });
  expect(styles.opacity).toBe('1');
  expect(styles.visibility).toBe('visible');
  expect(styles.display).not.toBe('none');
  expect(styles.color).not.toBe(styles.backgroundColor);
});
