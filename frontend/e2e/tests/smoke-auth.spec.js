const { test, expect } = require('@playwright/test');

test.describe('Auth smoke', () => {
  test('loads login and can switch to signup and back', async ({ page }) => {
    await page.goto('/auth?mode=login&next=%2Fapp');

    await expect(page.getByTestId('auth-login-heading')).toBeVisible();
    await page.getByTestId('auth-go-signup').click();
    await expect(page.getByTestId('auth-signup-heading')).toBeVisible();

    await page.getByTestId('auth-go-login').click();
    await expect(page.getByTestId('auth-login-heading')).toBeVisible();
  });

  test('theme toggle is interactive on auth shell', async ({ page }) => {
    await page.goto('/auth?mode=login&next=%2Fapp');

    const toggle = page.getByTestId('auth-theme-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(toggle).toBeVisible();
  });
});
