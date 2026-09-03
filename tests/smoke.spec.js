// SIIRAH website — smoke tests.
//
// These are intentionally shallow "does it still work" checks, not a full
// coverage suite: page loads, nav/anchors resolve, the language switch
// flips lang/dir, and the contact form actually validates + submits
// through js/script.js's own SIIRAHForms-based handler for #inquiryForm
// (see TOOLING.md — js/forms.js was a dead, superseded file and has
// been removed; it never drove this form).
const { test, expect } = require('@playwright/test');

test.describe('homepage', () => {
  test('loads with Arabic/RTL by default and the right title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/سيرة/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('key sections exist and nav links resolve to them', async ({ page }) => {
    await page.goto('/');
    for (const id of ['about', 'services', 'work', 'clients', 'contact']) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
  });
});

test.describe('language switch', () => {
  test('switching to EN flips lang/dir and updates visible text', async ({ page }) => {
    await page.goto('/');
    await page.locator('.lang-switch-desktop .lang-switch-btn[data-lang="en"]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page).toHaveTitle(/SIIRAH/);
  });
});

test.describe('contact form (#inquiryForm)', () => {
  test('shows field-level errors on empty submit instead of reloading the page', async ({ page }) => {
    await page.goto('/');
    await page.locator('#contact').scrollIntoViewIfNeeded();

    await page.locator('#inqSubmitBtn').click();

    // If js/script.js's submit handler isn't wired up, the native form
    // would just navigate (GET to the current URL) instead of showing
    // these JS-driven errors.
    await expect(page.locator('#inqFirstName-error')).not.toBeEmpty();
    await expect(page.locator('#inqEmail-error')).not.toBeEmpty();
    await expect(page).toHaveURL(/\/$|index\.html$/);
  });

  test('submits successfully when the Apps Script endpoint returns success', async ({ page }) => {
    await page.route('https://script.google.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success' }),
      });
    });

    await page.goto('/');
    await page.locator('#contact').scrollIntoViewIfNeeded();

    await page.locator('#inqFirstName').fill('محمد');
    await page.locator('#inqLastName').fill('الحسين');
    await page.locator('#inqEmail').fill('test@example.com');
    await page.locator('#inqPhone').fill('0541234567');
    await page.locator('#inqMessage').fill('Test inquiry from Playwright smoke test.');

    await page.locator('#inqSubmitBtn').click();

    await expect(page.locator('#projectSuccess')).toBeVisible({ timeout: 10000 });
  });
});
