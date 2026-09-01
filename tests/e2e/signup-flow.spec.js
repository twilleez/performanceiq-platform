import { test, expect } from '@playwright/test';

async function waitForApp(page) {
  await page.waitForSelector('#piq-root');
  await expect(page.locator('#piq-loader')).toHaveClass(/hidden/, { timeout: 8000 });
}

test('Create Account blocks invalid input and keeps controls usable', async ({ page }) => {
  await page.goto('/#/signup');
  await waitForApp(page);

  const submit = page.getByRole('button', { name: /Create Account/ });
  await submit.click();
  await expect(page.locator('#su-message')).toBeVisible();
  await expect(page.locator('#su-message')).toContainText(/name|valid email/i);

  await page.getByLabel('Full name').fill('New User Test');
  await page.getByLabel('Email address').fill('not-an-email');
  await page.getByLabel('Create password').fill('short');
  await submit.click();
  await expect(page.locator('#su-message')).toContainText(/valid email|at least 8/i);
  await expect(submit).toBeEnabled();
});

test('new account preserves selected role and stays in onboarding after reload', async ({ page }) => {
  await page.goto('/#/signup');
  await waitForApp(page);

  await page.getByRole('button', { name: 'Coach' }).first().click();
  await expect(page.getByRole('button', { name: 'Coach' }).first()).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Full name').fill('Journey Test Coach');
  await page.getByLabel('Email address').fill('player@demo.com');
  await page.getByLabel('Create password').fill('demo-pass-123');
  await page.getByRole('button', { name: /Create Account/ }).click();

  await expect(page.locator('#ob2-card')).toBeVisible();
  await expect(page.getByText('Your Sport')).toBeVisible();

  // A refresh must not bypass onboarding for a newly created account.
  await page.reload();
  await waitForApp(page);
  await expect(page.locator('#ob2-card')).toBeVisible();
  await expect(page.getByText('Your Sport')).toBeVisible();
  await expect(page.locator('#nav-role-badge')).toHaveCount(1);
});

test('signup supports Athlete, Coach, Parent and Solo but never public Admin', async ({ page }) => {
  await page.goto('/#/signup');
  await waitForApp(page);
  for (const role of ['Athlete', 'Coach', 'Parent', 'Solo']) {
    await expect(page.getByRole('button', { name: role }).first()).toBeVisible();
  }
  await expect(page.getByRole('button', { name: 'Admin' })).toHaveCount(0);
});
