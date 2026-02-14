const { test, expect } = require('@playwright/test');
const { ensureAuthenticated, isLikelyPlaceholder } = require('./helpers');

const E2E_EMAIL = process.env.E2E_EMAIL;
const E2E_PASSWORD = process.env.E2E_PASSWORD;
const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

const hasUserCreds =
  !!E2E_EMAIL &&
  !!E2E_PASSWORD &&
  !isLikelyPlaceholder(E2E_EMAIL) &&
  !isLikelyPlaceholder(E2E_PASSWORD);

const hasAdminCreds =
  !!E2E_ADMIN_EMAIL &&
  !!E2E_ADMIN_PASSWORD &&
  !isLikelyPlaceholder(E2E_ADMIN_EMAIL) &&
  !isLikelyPlaceholder(E2E_ADMIN_PASSWORD);

test.describe('App smoke (authenticated)', () => {
  test.skip(
    !hasUserCreds,
    'Set E2E_EMAIL and E2E_PASSWORD with real account values (placeholders are skipped).'
  );

  test('login and open create menu options', async ({ page }) => {
    await ensureAuthenticated(page, E2E_EMAIL, E2E_PASSWORD);

    await expect(page.getByTestId('header-create-button')).toBeVisible();
    await page.getByTestId('header-create-button').click();
    await expect(page.getByTestId('create-essay-option')).toBeVisible();
    await expect(page.getByTestId('create-application-option')).toBeVisible();
  });

  test('can navigate to essays from sidebar', async ({ page }) => {
    await ensureAuthenticated(page, E2E_EMAIL, E2E_PASSWORD);

    const essaysNav = page.getByTestId('nav-item-essays');
    await expect(essaysNav).toBeVisible();
    await essaysNav.click();

    await expect(page.getByRole('heading', { name: /essay library/i })).toBeVisible();
  });

  test('can open settings from profile menu', async ({ page }) => {
    await ensureAuthenticated(page, E2E_EMAIL, E2E_PASSWORD);

    await page.getByTestId('profile-menu-trigger').click();
    await page.getByTestId('profile-menu-go-settings').click();

    await expect(page.getByTestId('settings-heading')).toBeVisible();
    await expect(page.getByText('Dark mode')).toBeVisible();
    await expect(page.getByTestId('settings-dark-mode-toggle')).toHaveCount(1);
    await expect(page.getByTestId('settings-submit-feedback')).toBeVisible();
  });

  test('can open profile from profile menu', async ({ page }) => {
    await ensureAuthenticated(page, E2E_EMAIL, E2E_PASSWORD);

    await page.getByTestId('profile-menu-trigger').click();
    await page.getByTestId('profile-menu-go-profile').click();

    await expect(page.getByTestId('profile-heading')).toBeVisible();
    await expect(page.getByTestId('profile-save-button')).toBeVisible();
  });
});

test.describe('Admin smoke (optional)', () => {
  test.skip(
    !hasAdminCreds,
    'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD with real admin account values.'
  );

  test('admin can open pilot admin panel and refresh', async ({ page }) => {
    await ensureAuthenticated(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);

    const adminNav = page.getByTestId('nav-item-admin');
    await expect(adminNav).toBeVisible();
    await adminNav.click();

    await expect(page.getByTestId('admin-heading')).toBeVisible();
    await expect(page.getByTestId('admin-refresh-button')).toBeVisible();
    await page.getByTestId('admin-refresh-button').click();
  });
});
