const { test, expect } = require('@playwright/test');
const { ensureAuthenticated, withAcceptedDialog, isLikelyPlaceholder } = require('./helpers');

const E2E_EMAIL = process.env.E2E_EMAIL;
const E2E_PASSWORD = process.env.E2E_PASSWORD;
const hasUserCreds =
  !!E2E_EMAIL &&
  !!E2E_PASSWORD &&
  !isLikelyPlaceholder(E2E_EMAIL) &&
  !isLikelyPlaceholder(E2E_PASSWORD);

test.describe('Core flows (authenticated)', () => {
  test.skip(
    !hasUserCreds,
    'Set E2E_EMAIL and E2E_PASSWORD with real account values (placeholders are skipped).'
  );

  test('can create an application from tracker', async ({ page }) => {
    await ensureAuthenticated(page, E2E_EMAIL, E2E_PASSWORD);

    const uniqueSuffix = Date.now();
    const schoolName = `Pilot E2E School ${uniqueSuffix}`;

    await page.getByTestId('nav-item-tracker').click();
    await expect(page.getByTestId('tracker-heading')).toBeVisible();
    await page.getByTestId('tracker-add-application').click();
    await expect(page.getByTestId('tracker-form-card')).toBeVisible();

    await page.getByTestId('tracker-school-input').fill(schoolName);
    await page.getByTestId('tracker-deadline-input').fill('2027-01-15');
    await page.getByTestId('tracker-requirements-notes-input').fill('E2E tracker flow application');
    await page.getByTestId('tracker-save-application').click();

    await expect(page.getByTestId('tracker-application-card').filter({ hasText: schoolName })).toBeVisible();
  });

  test('can create essay, open versions, and delete essay', async ({ page }) => {
    await ensureAuthenticated(page, E2E_EMAIL, E2E_PASSWORD);

    const uniqueSuffix = Date.now();
    const schoolName = `Pilot Essay School ${uniqueSuffix}`;

    await page.getByTestId('nav-item-essays').click();
    await expect(page.getByTestId('essays-heading')).toBeVisible();
    await page.getByTestId('essays-create-button').click();

    await expect(page.getByTestId('compose-form')).toBeVisible();
    await page.getByTestId('compose-school-input').fill(schoolName);
    await page.getByTestId('compose-prompt-input').fill('Why this school now?');
    await page.getByTestId('compose-content-input').fill(
      'This is a valid E2E essay content block with enough detail to satisfy validation checks.'
    );

    await withAcceptedDialog(page, async () => {
      await page.getByTestId('compose-submit-button').click();
    });

    await expect(page.getByTestId('essays-heading')).toBeVisible();
    const createdEssayItem = page.getByTestId('essay-list-item').filter({ hasText: schoolName }).first();
    await expect(createdEssayItem).toBeVisible();
    await createdEssayItem.click();

    await expect(page.getByTestId('essay-detail-header')).toBeVisible();
    await page.getByTestId('essay-versions-toggle').click();
    await expect(page.getByTestId('essay-versions-panel')).toBeVisible();
    await page.getByTestId('essay-version-create-new').click();
    await expect(page.getByTestId('compose-form')).toBeVisible();
    await expect(page.getByTestId('compose-school-input')).toHaveValue(schoolName);
    await page.getByTestId('compose-cancel-button').click();

    await expect(page.getByTestId('compose-form')).toHaveCount(0);
    const homeDashboard = page.getByTestId('home-dashboard');
    const homeApplicationPanel = page.getByTestId('home-application-panel');
    const essayDetailHeader = page.getByTestId('essay-detail-header');
    const landedOnHomeOrDetail =
      (await homeDashboard.count()) > 0 ||
      (await homeApplicationPanel.count()) > 0 ||
      (await essayDetailHeader.count()) > 0;
    expect(landedOnHomeOrDetail).toBeTruthy();

    await page.getByTestId('nav-item-essays').click();
    await createdEssayItem.click();

    await withAcceptedDialog(page, async () => {
      await page.getByTestId('essay-delete-button').click();
    });

    await expect(page.getByTestId('essays-heading')).toBeVisible();
    await expect(page.getByTestId('essay-list-item').filter({ hasText: schoolName })).toHaveCount(0);
  });

  test('can save profile and submit pilot feedback', async ({ page }) => {
    await ensureAuthenticated(page, E2E_EMAIL, E2E_PASSWORD);

    const updatedName = `Pilot QA ${Date.now()}`;

    await page.getByTestId('profile-menu-trigger').click();
    await page.getByTestId('profile-menu-go-profile').click();
    await expect(page.getByTestId('profile-heading')).toBeVisible();
    await page.getByTestId('profile-name-input').fill(updatedName);
    await page.getByTestId('profile-save-button').click();
    await expect(page.getByTestId('profile-name-input')).toHaveValue(updatedName);

    await page.getByTestId('profile-menu-trigger').click();
    await page.getByTestId('profile-menu-go-settings').click();
    await expect(page.getByTestId('settings-heading')).toBeVisible();

    await page.getByTestId('settings-feedback-category').selectOption('bug');
    await page
      .getByTestId('settings-feedback-message')
      .fill(`E2E feedback validation message ${Date.now()} for pilot readiness checks.`);
    await page.getByTestId('settings-submit-feedback').click();
    await expect(page.getByText('Thanks. Feedback captured for pilot review.')).toBeVisible();
  });
});
