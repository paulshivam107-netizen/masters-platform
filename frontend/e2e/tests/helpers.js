function isLikelyPlaceholder(value) {
  if (!value) return true;
  const normalized = String(value).trim().toLowerCase();
  const knownPlaceholders = new Set([
    '...',
    'real_user_email',
    'real_user_password',
    'real_admin_email',
    'real_admin_password',
    'your_test_user_email',
    'your_test_user_password',
    'your_test_admin_email',
    'your_test_admin_password',
    'your-email@example.com',
    'your-password'
  ]);
  if (knownPlaceholders.has(normalized)) return true;
  return normalized.includes('example.com') || normalized.includes('your_') || normalized.includes('real_');
}

async function ensureAuthenticated(page, email, password) {
  await page.goto('/auth?mode=login&next=%2Fapp', { waitUntil: 'domcontentloaded', timeout: 12000 });

  const emailInput = page.getByTestId('auth-login-email');
  if (await emailInput.isVisible({ timeout: 1500 }).catch(() => false)) {
    await emailInput.fill(email);
    await page.getByTestId('auth-login-password').fill(password);
    await page.getByTestId('auth-login-submit').click({ timeout: 8000 });
  }

  // The authenticated shell can vary slightly by viewport and UI iteration.
  // Use broad but stable selectors and wait explicitly for one to appear.
  const workspaceSelectors = [
    '[data-testid="sidebar-nav"]',
    '[data-testid="header-create-button"]',
    '[data-testid="profile-menu-trigger"]',
    '.workspace-top-controls',
    '.nav-sidebar',
    'h1:has-text("Build your next chapter")'
  ];

  let workspaceVisible = false;
  for (const selector of workspaceSelectors) {
    const matched = await page
      .waitForSelector(selector, { state: 'visible', timeout: 2500 })
      .then(() => true)
      .catch(() => false);
    if (matched) {
      workspaceVisible = true;
      break;
    }
  }

  if (!workspaceVisible) {
    const authErrorText = await page
      .locator('.error-message, [data-testid="auth-login-error"]')
      .first()
      .textContent()
      .catch(() => '');
    const hasLoginForm = await page
      .getByTestId('auth-login-email')
      .isVisible({ timeout: 500 })
      .catch(() => false);

    if (hasLoginForm) {
      throw new Error(
        `Authentication did not reach workspace. ${
          authErrorText ? `Login error: ${authErrorText.trim()}` : 'Check E2E_EMAIL / E2E_PASSWORD values.'
        }`
      );
    }

    throw new Error(`Authentication failed: workspace shell not visible after login. URL=${page.url()}`);
  }
}

async function withAcceptedDialog(page, action) {
  let handled = false;
  const onDialog = async (dialog) => {
    handled = true;
    await dialog.accept();
  };

  // Accept immediately when the dialog opens so click actions do not deadlock.
  page.once('dialog', onDialog);
  try {
    await action();
    if (!handled) {
      await page.waitForTimeout(50);
    }
  } finally {
    page.off('dialog', onDialog);
  }
}

module.exports = {
  isLikelyPlaceholder,
  ensureAuthenticated,
  withAcceptedDialog
};
