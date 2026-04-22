import { test, expect } from '@playwright/test';

test.describe('Login-siden', () => {
  test('viser tittel og innloggingsknapp', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Familieportalen' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Logg inn med Google/i })).toBeVisible();
    await expect(page.getByText('Logg inn for å komme i gang')).toBeVisible();
  });

  test('knappen er klikkbar og ikke deaktivert ved oppstart', async ({ page }) => {
    await page.goto('/login');

    const loginButton = page.getByRole('button', { name: /Logg inn med Google/i });
    await expect(loginButton).toBeEnabled();
  });
});

test.describe('Autentisering og routing', () => {
  test('besøk på rot-URL omdirigerer til /login for uinnlogget bruker', async ({ page }) => {
    await page.goto('/');

    // Auth-guard sjekker innlogging og omdirigerer til /login
    await expect(page).toHaveURL(/.*\/login/, { timeout: 10_000 });
  });

  test('beskyttet rute /innstillinger omdirigerer til /login', async ({ page }) => {
    await page.goto('/innstillinger');

    await expect(page).toHaveURL(/.*\/login/, { timeout: 10_000 });
  });

  test('beskyttet rute /skole omdirigerer til /login', async ({ page }) => {
    await page.goto('/skole');

    await expect(page).toHaveURL(/.*\/login/, { timeout: 10_000 });
  });
});
